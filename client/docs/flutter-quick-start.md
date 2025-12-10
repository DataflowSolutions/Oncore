# Flutter Mobile App - Quick Start Guide

## Prerequisites

1. Install Flutter SDK: https://flutter.dev/docs/get-started/install
2. Install Dart SDK (comes with Flutter)
3. Set up Android Studio or Xcode for mobile development

## Project Setup

### 1. Create Flutter Project

```bash
flutter create oncore_mobile
cd oncore_mobile
```

### 2. Add Dependencies

Edit `pubspec.yaml`:

```yaml
dependencies:
  flutter:
    sdk: flutter
  supabase_flutter: ^2.0.0
  http: ^1.1.0
  shared_preferences: ^2.2.0
  provider: ^6.1.0
  intl: ^0.18.0
  go_router: ^12.0.0
```

### 3. Initialize Supabase

Edit `lib/main.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Supabase.initialize(
    url: 'https://tabcxfaqqkfbchbxgogl.supabase.co',
    anonKey: 'YOUR_ANON_KEY_HERE', // Get from Supabase Dashboard
  );

  runApp(const OncoreApp());
}

final supabase = Supabase.instance.client;

class OncoreApp extends StatelessWidget {
  const OncoreApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Oncore',
      theme: ThemeData(
        primarySwatch: Colors.black,
        useMaterial3: true,
      ),
      home: const SplashPage(),
    );
  }
}
```

## Core Services (Mirror Web App)

### Authentication Service

```dart
// lib/services/auth_service.dart
import 'package:supabase_flutter/supabase_flutter.dart';

class AuthService {
  final _supabase = Supabase.instance.client;

  Future<AuthResponse> signUp(String email, String password) async {
    return await _supabase.auth.signUp(
      email: email,
      password: password,
    );
  }

  Future<AuthResponse> signIn(String email, String password) async {
    return await _supabase.auth.signInWithPassword(
      email: email,
      password: password,
    );
  }

  Future<void> signOut() async {
    await _supabase.auth.signOut();
  }

  User? get currentUser => _supabase.auth.currentUser;

  Stream<AuthState> get authStateChanges => _supabase.auth.onAuthStateChange;
}
```

### Show Service (Same queries as web)

```dart
// lib/services/show_service.dart
import 'package:supabase_flutter/supabase_flutter.dart';

class ShowService {
  final _supabase = Supabase.instance.client;

  Future<List<Map<String, dynamic>>> getShowsByOrg(String orgId) async {
    final response = await _supabase
        .from('shows')
        .select('*, venues(*)')
        .eq('org_id', orgId)
        .order('date', ascending: false);

    return List<Map<String, dynamic>>.from(response);
  }

  Future<Map<String, dynamic>> createShow(Map<String, dynamic> show) async {
    final response = await _supabase
        .from('shows')
        .insert(show)
        .select()
        .single();

    return response;
  }

  Future<Map<String, dynamic>> updateShow(
    String showId,
    Map<String, dynamic> updates,
  ) async {
    final response = await _supabase
        .from('shows')
        .update(updates)
        .eq('id', showId)
        .select()
        .single();

    return response;
  }

  Future<void> deleteShow(String showId) async {
    await _supabase.from('shows').delete().eq('id', showId);
  }
}
```

### Advancing Service (Same RPC calls as web)

```dart
// lib/services/advancing_service.dart
import 'package:supabase_flutter/supabase_flutter.dart';

class AdvancingService {
  final _supabase = Supabase.instance.client;

  // Create session using RPC function (same as web)
  Future<Map<String, dynamic>> createSession(
    String showId,
    String orgId,
  ) async {
    final response = await _supabase.rpc('create_advancing_session', params: {
      'p_show_id': showId,
      'p_org_id': orgId,
    });

    return response;
  }

  // Verify access code (for venue access)
  Future<Map<String, dynamic>> verifyAccessCode(String accessCode) async {
    final response = await _supabase.rpc('verify_access_code', params: {
      'p_access_code': accessCode.toUpperCase(),
    });

    return response;
  }

  // Submit hospitality
  Future<Map<String, dynamic>> submitHospitality({
    required String sessionId,
    required int guestCount,
    required Map<String, dynamic> catering,
    String? notes,
  }) async {
    final response = await _supabase.rpc('submit_hospitality', params: {
      'p_session_id': sessionId,
      'p_guest_count': guestCount,
      'p_catering': catering,
      'p_notes': notes,
    });

    return response;
  }

  // Get session with all details
  Future<Map<String, dynamic>> getSession(String sessionId) async {
    final response = await _supabase
        .from('advancing_sessions')
        .select('''
          *,
          shows (
            id,
            title,
            date,
            venues (*)
          ),
          hospitality (*),
          technical (*),
          production (*)
        ''')
        .eq('id', sessionId)
        .single();

    return response;
  }

  // Real-time subscription
  RealtimeChannel subscribeToSession(
    String sessionId,
    void Function(Map<String, dynamic>) callback,
  ) {
    final channel = _supabase.channel('session:$sessionId');

    channel
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'hospitality',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'session_id',
            value: sessionId,
          ),
          callback: (payload) => callback(payload.newRecord),
        )
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'technical',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'session_id',
            value: sessionId,
          ),
          callback: (payload) => callback(payload.newRecord),
        )
        .subscribe();

    return channel;
  }
}
```

## Call Edge Functions from Flutter

```dart
// lib/services/edge_functions_service.dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';

class EdgeFunctionsService {
  final _supabase = Supabase.instance.client;
  final _baseUrl = 'https://tabcxfaqqkfbchbxgogl.supabase.co/functions/v1';

  Future<void> sendEmail({
    required String to,
    required String subject,
    required String type,
    required Map<String, dynamic> data,
  }) async {
    final token = _supabase.auth.currentSession?.accessToken;

    final response = await http.post(
      Uri.parse('$_baseUrl/send-email'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'to': to,
        'subject': subject,
        'type': type,
        'data': data,
      }),
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to send email: ${response.body}');
    }
  }

  Future<String> generateAdvancingPDF(String sessionId) async {
    final token = _supabase.auth.currentSession?.accessToken;

    final response = await http.post(
      Uri.parse('$_baseUrl/generate-advancing-pdf'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({'sessionId': sessionId}),
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to generate PDF: ${response.body}');
    }

    return response.body;
  }
}
```

## Example: Login Screen

```dart
// lib/screens/login_screen.dart
import 'package:flutter/material.dart';
import '../services/auth_service.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _authService = AuthService();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;

  Future<void> _signIn() async {
    setState(() => _isLoading = true);

    try {
      await _authService.signIn(
        _emailController.text,
        _passwordController.text,
      );

      if (mounted) {
        Navigator.pushReplacementNamed(context, '/dashboard');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Login failed: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text(
              'Oncore',
              style: TextStyle(fontSize: 48, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 48),
            TextField(
              controller: _emailController,
              decoration: const InputDecoration(
                labelText: 'Email',
                border: OutlineInputBorder(),
              ),
              keyboardType: TextInputType.emailAddress,
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _passwordController,
              decoration: const InputDecoration(
                labelText: 'Password',
                border: OutlineInputBorder(),
              ),
              obscureText: true,
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isLoading ? null : _signIn,
                child: _isLoading
                    ? const CircularProgressIndicator()
                    : const Text('Sign In'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
```

## Key Differences from Web

### 1. No Server Actions

Flutter can't use Next.js Server Actions. Instead:

- Use Supabase client directly
- Call RPC functions
- Call Edge Functions via HTTP

### 2. State Management

Use Provider, Riverpod, or Bloc instead of React state:

```dart
// lib/providers/auth_provider.dart
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class AuthProvider extends ChangeNotifier {
  User? _user;
  User? get user => _user;

  AuthProvider() {
    _user = Supabase.instance.client.auth.currentUser;

    Supabase.instance.client.auth.onAuthStateChange.listen((data) {
      _user = data.session?.user;
      notifyListeners();
    });
  }

  bool get isAuthenticated => _user != null;
}
```

### 3. Navigation

Use go_router instead of Next.js routing:

```dart
final router = GoRouter(
  routes: [
    GoRoute(
      path: '/',
      builder: (context, state) => const SplashPage(),
    ),
    GoRoute(
      path: '/login',
      builder: (context, state) => const LoginScreen(),
    ),
    GoRoute(
      path: '/dashboard',
      builder: (context, state) => const DashboardScreen(),
    ),
  ],
);
```

## Testing

```dart
// test/services/show_service_test.dart
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('ShowService.getShowsByOrg returns shows', () async {
    final service = ShowService();
    final shows = await service.getShowsByOrg('org-id');
    expect(shows, isNotEmpty);
  });
}
```

## Building & Running

```bash
# Run on iOS simulator
flutter run -d ios

# Run on Android emulator
flutter run -d android

# Build for production
flutter build apk --release  # Android
flutter build ipa --release  # iOS
```

## Next Steps

1. Implement authentication flow
2. Build show list screen
3. Build advancing session viewer
4. Add real-time updates
5. Implement offline support
6. Add push notifications

## Important Notes

- **All Supabase queries work identically** to web
- **RPC functions are shared** between web and mobile
- **Edge Functions use same endpoints** for both platforms
- **RLS policies protect** both web and mobile automatically
- **Types must be maintained manually** (no auto-generation in Dart yet)

For more details, see `docs/hybrid-architecture.md`
