import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/auth_provider.dart';
import '../screens/auth/login_screen.dart';
import '../screens/auth/signup_screen.dart';
import '../screens/home/home_screen.dart';
import '../screens/main/main_shell.dart';
import '../screens/calendar/calendar_screen.dart';

/// Notifier that triggers router refresh when auth state changes
class AuthChangeNotifier extends ChangeNotifier {
  AuthChangeNotifier(Ref ref) {
    ref.listen(authProvider, (_, __) {
      notifyListeners();
    });
  }
}

/// Provider for the auth change notifier
final authChangeNotifierProvider = Provider<AuthChangeNotifier>((ref) {
  return AuthChangeNotifier(ref);
});

/// App router configuration with authentication guards
/// Similar to Next.js middleware pattern for route protection
final appRouterProvider = Provider<GoRouter>((ref) {
  final authChangeNotifier = ref.watch(authChangeNotifierProvider);
  
  return GoRouter(
    initialLocation: '/',
    debugLogDiagnostics: true,
    refreshListenable: authChangeNotifier,
    
    // Redirect logic based on auth state
    redirect: (context, state) {
      // Read auth state directly in redirect
      final container = ProviderScope.containerOf(context);
      final authState = container.read(authProvider);
      
      final isAuthenticated = authState.isAuthenticated;
      final isLoading = authState.isLoading;
      final location = state.matchedLocation;
      final isAuthRoute = location == '/login' || location == '/signup';

      // Don't redirect while loading auth state
      if (isLoading) return null;

      // If not authenticated and not on auth route, redirect to login
      if (!isAuthenticated && !isAuthRoute) {
        return '/login';
      }

      // If authenticated and on auth route, redirect to home
      if (isAuthenticated && isAuthRoute) {
        return '/';
      }

      // No redirect needed
      return null;
    },
    
    routes: [
      // Home / Organizations page (protected)
      GoRoute(
        path: '/',
        name: 'home',
        builder: (context, state) => const HomeScreen(),
      ),
      
      // Main shell with swipeable Day/Shows/Network (protected)
      // Default to Shows tab (index 1)
      GoRoute(
        path: '/org/:orgId/shows',
        name: 'shows',
        builder: (context, state) {
          final orgId = state.pathParameters['orgId']!;
          final orgName = state.extra as String? ?? 'Organization';
          return MainShell(orgId: orgId, orgName: orgName, initialIndex: 1);
        },
      ),
      
      // Organization shows calendar (protected) - separate from swipe nav
      GoRoute(
        path: '/org/:orgId/calendar',
        name: 'calendar',
        builder: (context, state) {
          final orgId = state.pathParameters['orgId']!;
          final orgName = state.extra as String? ?? 'Organization';
          return CalendarScreen(orgId: orgId, orgName: orgName);
        },
      ),
      
      // Login page (public)
      GoRoute(
        path: '/login',
        name: 'login',
        builder: (context, state) => const LoginScreen(),
      ),
      
      // Signup page (public)
      GoRoute(
        path: '/signup',
        name: 'signup',
        builder: (context, state) => const SignupScreen(),
      ),
    ],
    
    // Error page
    errorBuilder: (context, state) => Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.error_outline,
              size: 64,
              color: Colors.red,
            ),
            const SizedBox(height: 16),
            Text(
              'Page not found',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            Text(
              state.matchedLocation,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Colors.grey,
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () => context.go('/'),
              child: const Text('Go Home'),
            ),
          ],
        ),
      ),
    ),
  );
});
