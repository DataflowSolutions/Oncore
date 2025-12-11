import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Auth state that tracks the current user session
class AuthState {
  final User? user;
  final Session? session;
  final bool isLoading;
  final String? error;

  const AuthState({
    this.user,
    this.session,
    this.isLoading = false,
    this.error,
  });

  bool get isAuthenticated => user != null && session != null;

  AuthState copyWith({
    User? user,
    Session? session,
    bool? isLoading,
    String? error,
  }) {
    return AuthState(
      user: user ?? this.user,
      session: session ?? this.session,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

/// Auth notifier that handles authentication logic
class AuthNotifier extends StateNotifier<AuthState> {
  final SupabaseClient _supabase;

  AuthNotifier(this._supabase) : super(const AuthState(isLoading: true)) {
    _init();
  }

  void _init() {
    // Get current session
    final session = _supabase.auth.currentSession;
    final user = _supabase.auth.currentUser;
    
    state = AuthState(
      user: user,
      session: session,
      isLoading: false,
    );

    // Listen to auth state changes
    _supabase.auth.onAuthStateChange.listen((data) {
      state = AuthState(
        user: data.session?.user,
        session: data.session,
        isLoading: false,
      );
    });
  }

  /// Sign in with email and password
  Future<void> signIn({
    required String email,
    required String password,
  }) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final response = await _supabase.auth.signInWithPassword(
        email: email,
        password: password,
      );

      if (response.user != null) {
        state = AuthState(
          user: response.user,
          session: response.session,
          isLoading: false,
        );
      } else {
        state = state.copyWith(
          isLoading: false,
          error: 'Sign in failed. Please try again.',
        );
      }
    } on AuthException catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: _getFriendlyErrorMessage(e.message),
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'An unexpected error occurred. Please try again.',
      );
    }
  }

  /// Sign up with email and password
  Future<bool> signUp({
    required String email,
    required String password,
  }) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      print('[AUTH DEBUG] Attempting signup for: $email');
      print('[AUTH DEBUG] Supabase URL: ${_supabase.auth.currentSession}');
      
      final response = await _supabase.auth.signUp(
        email: email,
        password: password,
      );

      print('[AUTH DEBUG] Signup response - user: ${response.user?.id}, session: ${response.session?.accessToken != null}');
      
      state = state.copyWith(isLoading: false);

      // Return true if signup was successful
      // Note: User might need to confirm email depending on Supabase settings
      return response.user != null;
    } on AuthException catch (e) {
      print('[AUTH DEBUG] AuthException: ${e.message}, statusCode: ${e.statusCode}');
      state = state.copyWith(
        isLoading: false,
        error: _getFriendlySignUpError(e.message),
      );
      return false;
    } catch (e, stackTrace) {
      print('[AUTH DEBUG] Unexpected error: $e');
      print('[AUTH DEBUG] Stack trace: $stackTrace');
      state = state.copyWith(
        isLoading: false,
        error: 'An unexpected error occurred. Please try again.',
      );
      return false;
    }
  }

  /// Sign out the current user
  Future<void> signOut() async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      await _supabase.auth.signOut();
      state = const AuthState(isLoading: false);
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Failed to sign out. Please try again.',
      );
    }
  }

  /// Clear any error state
  void clearError() {
    state = state.copyWith(error: null);
  }

  /// Map Supabase errors to friendly messages (matches web client)
  String _getFriendlyErrorMessage(String error) {
    final errorLower = error.toLowerCase();

    // Rate limiting / lockout
    if (errorLower.contains('rate limit') ||
        errorLower.contains('too many') ||
        errorLower.contains('429') ||
        errorLower.contains('try again later') ||
        errorLower.contains('temporarily blocked')) {
      return 'Too many sign-in attempts. Please wait a few minutes before trying again.';
    }

    // Email not confirmed
    if (errorLower.contains('email not confirmed') ||
        errorLower.contains('confirm your email')) {
      return 'Please check your email and click the confirmation link before signing in.';
    }

    // Invalid credentials
    if (errorLower.contains('invalid login credentials') ||
        errorLower.contains('invalid credentials') ||
        errorLower.contains('email not found') ||
        errorLower.contains('invalid password')) {
      return 'The email or password you entered is incorrect. Please double-check and try again.';
    }

    // Generic invalid
    if (errorLower.contains('invalid') ||
        errorLower.contains('incorrect') ||
        errorLower.contains('wrong')) {
      return 'Something isn\'t right with your email or password. Please try again.';
    }

    // User not found
    if (errorLower.contains('user not found') ||
        errorLower.contains('not registered') ||
        errorLower.contains('no user')) {
      return 'No account found with this email. Would you like to sign up?';
    }

    // Account locked/suspended
    if (errorLower.contains('locked') ||
        errorLower.contains('disabled') ||
        errorLower.contains('suspended') ||
        errorLower.contains('banned')) {
      return 'Your account has been locked for security reasons. Please contact support.';
    }

    // Network/connection errors
    if (errorLower.contains('network') ||
        errorLower.contains('fetch') ||
        errorLower.contains('timeout') ||
        errorLower.contains('connection') ||
        errorLower.contains('offline')) {
      return 'Network error. Please check your internet connection and try again.';
    }

    // Server errors
    if (errorLower.contains('server error') ||
        errorLower.contains('500') ||
        errorLower.contains('502') ||
        errorLower.contains('503') ||
        errorLower.contains('internal error')) {
      return 'Our servers are experiencing issues. Please try again in a few moments.';
    }

    // Default fallback
    return 'Unable to sign in. Please check your email and password and try again.';
  }

  /// Map Supabase sign-up errors to friendly messages
  String _getFriendlySignUpError(String error) {
    final errorLower = error.toLowerCase();

    if (errorLower.contains('password') && errorLower.contains('short')) {
      return 'Password must be at least 6 characters long.';
    }

    if (errorLower.contains('already') || errorLower.contains('exists')) {
      return 'An account with this email already exists. Please sign in instead.';
    }

    if (errorLower.contains('rate limit') || errorLower.contains('too many')) {
      return 'Too many sign-up attempts. Please wait a few minutes before trying again.';
    }

    if (errorLower.contains('invalid email') ||
        errorLower.contains('email format')) {
      return 'Please enter a valid email address.';
    }

    return 'Unable to create account. Please try again.';
  }
}

/// Provider for the Supabase client
final supabaseClientProvider = Provider<SupabaseClient>((ref) {
  return Supabase.instance.client;
});

/// Provider for authentication state
final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final supabase = ref.watch(supabaseClientProvider);
  return AuthNotifier(supabase);
});

/// Convenience provider to check if user is authenticated
final isAuthenticatedProvider = Provider<bool>((ref) {
  return ref.watch(authProvider).isAuthenticated;
});

/// Convenience provider to get current user
final currentUserProvider = Provider<User?>((ref) {
  return ref.watch(authProvider).user;
});
