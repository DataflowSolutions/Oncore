# Oncore - API Reference for Mobile Developers

This document provides a complete reference of all Supabase operations available for the Flutter mobile app. All operations work identically to the web app.

## Base Configuration

```dart
final supabase = Supabase.instance.client;
```

## Authentication

### Sign Up
```dart
final response = await supabase.auth.signUp(
  email: 'user@example.com',
  password: 'password123',
);
```

### Sign In
```dart
final response = await supabase.auth.signInWithPassword(
  email: 'user@example.com',
  password: 'password123',
);
```

### Sign Out
```dart
await supabase.auth.signOut();
```

### Get Current User
```dart
final user = supabase.auth.currentUser;
```

### Listen to Auth Changes
```dart
supabase.auth.onAuthStateChange.listen((data) {
  final session = data.session;
  final user = session?.user;
});
```

---

## Organizations

### Get User's Organizations
```dart
final orgs = await supabase
    .from('org_members')
    .select('role, organizations(*)')
    .eq('user_id', userId);
```

### Get Organization Details
```dart
final org = await supabase
    .from('organizations')
    .select('*, org_members(*, users(*))')
    .eq('id', orgId)
    .single();
```

### Create Organization
```dart
final org = await supabase
    .from('organizations')
    .insert({
      'name': 'My Band',
      'slug': 'my-band',
    })
    .select()
    .single();
```

### Update Organization
```dart
await supabase
    .from('organizations')
    .update({'name': 'New Name'})
    .eq('id', orgId);
```

---

## Shows

### Get Shows by Organization
```dart
final shows = await supabase
    .from('shows')
    .select('*, venues(*)')
    .eq('org_id', orgId)
    .order('date', ascending: false);
```

### Get Single Show
```dart
final show = await supabase
    .from('shows')
    .select('*, venues(*), advancing_sessions(*)')
    .eq('id', showId)
    .single();
```

### Create Show
```dart
final show = await supabase
    .from('shows')
    .insert({
      'title': 'Show Title',
      'date': '2025-06-15',
      'venue_id': venueId,
      'org_id': orgId,
    })
    .select()
    .single();
```

### Update Show
```dart
await supabase
    .from('shows')
    .update({'title': 'New Title'})
    .eq('id', showId);
```

### Delete Show
```dart
await supabase.from('shows').delete().eq('id', showId);
```

### Get Upcoming Shows
```dart
final shows = await supabase
    .from('shows')
    .select('*, venues(*)')
    .eq('org_id', orgId)
    .gte('date', DateTime.now().toIso8601String().split('T')[0])
    .order('date', ascending: true)
    .limit(10);
```

---

## Advancing Sessions

### Create Session (RPC)
```dart
final session = await supabase.rpc('create_advancing_session', params: {
  'p_show_id': showId,
  'p_org_id': orgId,
});
```

### Get Session Details
```dart
final session = await supabase
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
```

### Verify Access Code
```dart
final session = await supabase.rpc('verify_access_code', params: {
  'p_access_code': accessCode.toUpperCase(),
});
```

### Submit Hospitality
```dart
final result = await supabase.rpc('submit_hospitality', params: {
  'p_session_id': sessionId,
  'p_guest_count': 15,
  'p_catering': {
    'meals': ['Vegetarian', 'Vegan'],
    'allergies': ['Nuts', 'Gluten'],
  },
  'p_notes': 'Special requests here',
});
```

### Update Technical Requirements
```dart
await supabase
    .from('technical')
    .update({
      'stage_details': 'Stage 20x30ft',
      'sound_details': 'PA system required',
    })
    .eq('session_id', sessionId);
```

### Update Production Details
```dart
await supabase
    .from('production')
    .update({
      'crew_count': 5,
      'load_in_time': '14:00',
    })
    .eq('session_id', sessionId);
```

### Update Session Status
```dart
await supabase
    .from('advancing_sessions')
    .update({'status': 'shared'})
    .eq('id', sessionId);
```

---

## Venues

### Search Venues
```dart
final venues = await supabase
    .from('venues')
    .select('*')
    .ilike('name', '%$searchTerm%')
    .limit(20);
```

### Get Venue Details
```dart
final venue = await supabase
    .from('venues')
    .select('*')
    .eq('id', venueId)
    .single();
```

---

## Real-time Subscriptions

### Subscribe to Advancing Session Changes
```dart
final channel = supabase.channel('session:$sessionId');

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
      callback: (payload) {
        print('Hospitality updated: ${payload.newRecord}');
      },
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
      callback: (payload) {
        print('Technical updated: ${payload.newRecord}');
      },
    )
    .subscribe();

// Unsubscribe when done
await channel.unsubscribe();
```

---

## Edge Functions

### Send Email
```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

final token = supabase.auth.currentSession?.accessToken;

final response = await http.post(
  Uri.parse('https://tabcxfaqqkfbchbxgogl.supabase.co/functions/v1/send-email'),
  headers: {
    'Authorization': 'Bearer $token',
    'Content-Type': 'application/json',
  },
  body: jsonEncode({
    'to': 'venue@example.com',
    'subject': 'Advancing Session Shared',
    'type': 'advancing-shared',
    'data': {
      'showTitle': 'My Show',
      'showDate': '2025-06-15',
      'artistName': 'My Band',
      'accessLink': 'https://oncore.app/s/ABC123',
    },
  }),
);
```

### Generate PDF
```dart
final response = await http.post(
  Uri.parse('https://tabcxfaqqkfbchbxgogl.supabase.co/functions/v1/generate-advancing-pdf'),
  headers: {
    'Authorization': 'Bearer $token',
    'Content-Type': 'application/json',
  },
  body: jsonEncode({
    'sessionId': sessionId,
  }),
);

final htmlContent = response.body;
```

---

## Storage (File Uploads)

### Upload File
```dart
import 'dart:io';

final file = File('path/to/file.pdf');
final fileName = 'documents/${sessionId}/rider.pdf';

await supabase.storage
    .from('advancing-documents')
    .upload(fileName, file);
```

### Get Public URL
```dart
final url = supabase.storage
    .from('advancing-documents')
    .getPublicUrl(fileName);
```

### Download File
```dart
final data = await supabase.storage
    .from('advancing-documents')
    .download(fileName);
```

### Delete File
```dart
await supabase.storage
    .from('advancing-documents')
    .remove([fileName]);
```

---

## Error Handling

All Supabase operations can throw exceptions. Wrap in try-catch:

```dart
try {
  final shows = await supabase
      .from('shows')
      .select('*')
      .eq('org_id', orgId);
  
  return shows;
} on PostgrestException catch (e) {
  print('Database error: ${e.message}');
  rethrow;
} catch (e) {
  print('Unexpected error: $e');
  rethrow;
}
```

---

## Common Patterns

### Loading State
```dart
class ShowsPage extends StatefulWidget {
  @override
  State<ShowsPage> createState() => _ShowsPageState();
}

class _ShowsPageState extends State<ShowsPage> {
  List<Map<String, dynamic>> _shows = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadShows();
  }

  Future<void> _loadShows() async {
    setState(() => _isLoading = true);
    
    try {
      final shows = await supabase
          .from('shows')
          .select('*, venues(*)')
          .eq('org_id', widget.orgId);
      
      setState(() {
        _shows = shows;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }
    
    if (_error != null) {
      return Center(child: Text('Error: $_error'));
    }
    
    return ListView.builder(
      itemCount: _shows.length,
      itemBuilder: (context, index) {
        final show = _shows[index];
        return ListTile(
          title: Text(show['title']),
          subtitle: Text(show['date']),
        );
      },
    );
  }
}
```

### Optimistic Updates
```dart
Future<void> updateShowTitle(String showId, String newTitle) async {
  // Update UI immediately
  setState(() {
    final index = _shows.indexWhere((s) => s['id'] == showId);
    _shows[index]['title'] = newTitle;
  });

  try {
    // Update database
    await supabase
        .from('shows')
        .update({'title': newTitle})
        .eq('id', showId);
  } catch (e) {
    // Revert on error
    setState(() {
      final index = _shows.indexWhere((s) => s['id'] == showId);
      _shows[index]['title'] = oldTitle;
    });
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Failed to update: $e')),
    );
  }
}
```

---

## Type-Safe Models (Optional)

While not required, you can create Dart models for type safety:

```dart
class Show {
  final String id;
  final String title;
  final DateTime date;
  final String orgId;
  final Venue? venue;

  Show({
    required this.id,
    required this.title,
    required this.date,
    required this.orgId,
    this.venue,
  });

  factory Show.fromJson(Map<String, dynamic> json) {
    return Show(
      id: json['id'],
      title: json['title'],
      date: DateTime.parse(json['date']),
      orgId: json['org_id'],
      venue: json['venues'] != null ? Venue.fromJson(json['venues']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'date': date.toIso8601String().split('T')[0],
      'org_id': orgId,
    };
  }
}
```

Usage:
```dart
final response = await supabase.from('shows').select('*, venues(*)');
final shows = (response as List).map((json) => Show.fromJson(json)).toList();
```

---

For more details, see:
- `docs/hybrid-architecture.md` - Overall architecture
- `docs/flutter-quick-start.md` - Getting started guide
