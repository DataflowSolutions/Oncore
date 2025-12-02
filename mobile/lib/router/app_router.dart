import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/auth_provider.dart';
import '../screens/auth/login_screen.dart';
import '../screens/auth/signup_screen.dart';
import '../screens/home/home_screen.dart';
import '../screens/main/main_shell.dart';
import '../screens/settings/settings_screen.dart';

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
      
      // Main shell with Day, Shows (list/calendar toggle), and Network tabs (protected)
      // This is Layer 1 - has bottom navigation bar
      // All three tabs (Day, Shows, Network) are swipeable and at same level
      GoRoute(
        path: '/org/:orgId/shows',
        name: 'shows',
        builder: (context, state) {
          final orgId = state.pathParameters['orgId']!;
          final orgName = state.extra as String? ?? 'Organization';
          return MainShell(orgId: orgId, orgName: orgName, initialTabIndex: 1);
        },
      ),
      
      // Day view - Layer 1, same as Shows and Network
      // This route is used when navigating to a specific show's Day view
      GoRoute(
        path: '/org/:orgId/shows/:showId/day',
        name: 'show-day',
        builder: (context, state) {
          final orgId = state.pathParameters['orgId']!;
          final showId = state.pathParameters['showId']!;
          final orgName = state.extra as String? ?? 'Organization';
          return MainShell(
            orgId: orgId, 
            orgName: orgName, 
            initialTabIndex: 0,
            showId: showId,
          );
        },
      ),
      
      // Network page - Layer 1 (MainShell with Network tab)
      GoRoute(
        path: '/org/:orgId/network',
        name: 'network',
        builder: (context, state) {
          final orgId = state.pathParameters['orgId']!;
          final orgName = state.extra as String? ?? 'Organization';
          return MainShell(orgId: orgId, orgName: orgName, initialTabIndex: 2);
        },
      ),
      
      // Settings page (protected) - Layer 2
      // No bottom navigation bar - has back button to return to Layer 1
      // Uses CupertinoPage for iOS-style swipe-to-go-back
      GoRoute(
        path: '/org/:orgId/settings',
        name: 'settings',
        pageBuilder: (context, state) {
          final orgId = state.pathParameters['orgId']!;
          return CupertinoPage(
            child: SettingsScreen(orgId: orgId),
          );
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
    errorBuilder: (context, state) {
      final colorScheme = Theme.of(context).colorScheme;
      return Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.error_outline,
                size: 64,
                color: colorScheme.error,
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
                  color: colorScheme.onSurfaceVariant,
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
      );
    },
  );
});
