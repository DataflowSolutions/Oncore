import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/show.dart';

/// Supabase Service - Direct database access (NO REST API needed!)
/// 
/// This service demonstrates how Flutter connects DIRECTLY to Supabase,
/// just like your Next.js web app does. Same database, same queries!
class SupabaseService {
  // Get Supabase client instance (initialized in main.dart)
  final _supabase = Supabase.instance.client;
  
  // Public accessor for debugging
  get supabaseClient => _supabase;

  /// Auto-login as test user
  /// This matches your seed data: testacc@gmail.com / testacc
  Future<void> signInAsTestUser() async {
    print('═══════════════════════════════════════');
    print('[DEBUG] signInAsTestUser() called');
    print('═══════════════════════════════════════');
    
    try {
      print('[DEBUG] Checking if already signed in...');
      print('[DEBUG] Current user: ${_supabase.auth.currentUser?.email}');
      print('[DEBUG] Current session: ${_supabase.auth.currentSession}');
      
      // Check if already signed in
      if (_supabase.auth.currentUser != null) {
        print('✅ Already signed in as: ${_supabase.auth.currentUser!.email}');
        print('[DEBUG] User ID: ${_supabase.auth.currentUser!.id}');
        print('[DEBUG] Auth session exists: ${_supabase.auth.currentSession != null}');
        return;
      }

      print('🔐 Not signed in yet. Attempting sign-in...');
      print('[DEBUG] Email: testacc@gmail.com');
      print('[DEBUG] Password: ••••••••');
      
      final response = await _supabase.auth.signInWithPassword(
        email: 'testacc@gmail.com',
        password: 'testacc',
      );

      print('[DEBUG] Sign-in response received');
      print('[DEBUG] Response user: ${response.user}');
      print('[DEBUG] Response session: ${response.session}');

      if (response.user != null) {
        print('═══════════════════════════════════════');
        print('✅ Successfully signed in as: ${response.user!.email}');
        print('[DEBUG] User ID: ${response.user!.id}');
        print('[DEBUG] User metadata: ${response.user!.userMetadata}');
        print('[DEBUG] Session token exists: ${response.session != null}');
        print('[DEBUG] Session access token length: ${response.session?.accessToken.length ?? 0}');
        print('═══════════════════════════════════════');
      } else {
        print('═══════════════════════════════════════');
        print('⚠️ Sign-in returned null user');
        print('[DEBUG] Response session: ${response.session}');
        print('═══════════════════════════════════════');
        throw Exception('Sign-in failed: No user returned');
      }
    } on AuthException catch (e) {
      print('═══════════════════════════════════════');
      print('❌ AuthException during sign-in: ${e.message}');
      print('[ERROR] Error code: ${e.statusCode}');
      print('[ERROR] Error details: ${e.details}');
      print('[ERROR] Error toString(): ${e.toString()}');
      print('═══════════════════════════════════════');
      rethrow;
    } catch (e, stackTrace) {
      print('═══════════════════════════════════════');
      print('❌ Error signing in: $e');
      print('[ERROR] Stack trace: $stackTrace');
      print('[ERROR] Exception type: ${e.runtimeType}');
      print('[ERROR] Exception toString(): ${e.toString()}');
      print('═══════════════════════════════════════');
      rethrow;
    }
  }

  /// Fetch shows for a specific user
  /// 
  /// This query runs DIRECTLY against your Supabase database.
  /// RLS policies automatically filter results based on the authenticated user.
  /// 
  /// Example: Same query as your web app's lib/actions/shows.ts!
  Future<List<Show>> getShows({String? orgId}) async {
    try {
      print('[DEBUG] getShows() called with orgId: $orgId');
      print('[DEBUG] Current user: ${_supabase.auth.currentUser?.email}');
      print('[DEBUG] Current user ID: ${_supabase.auth.currentUser?.id}');
      
      // This is the EXACT same query your Next.js app makes!
      // Matches: getShowsByOrg() in lib/actions/shows.ts
      print('[DEBUG] Building Supabase query: from(shows).select(*, venue:venues(name, city))');
      final response = await _supabase
          .from('shows')
          .select('*, venue:venues(name, city)') // Join with venue table (singular!)
          .order('date', ascending: true); // Ascending to show upcoming first
      
      print('[DEBUG] Query response type: ${response.runtimeType}');
      print('[DEBUG] Query response raw data: $response');
      
      // Convert JSON to Show objects
      if (response == null) {
        print('⚠️ Query returned null response');
        return [];
      }

      if (response is! List) {
        print('❌ ERROR: Expected List but got ${response.runtimeType}');
        print('[DEBUG] Response content: $response');
        throw Exception('Invalid response type: expected List, got ${response.runtimeType}');
      }

      print('[DEBUG] Response is a List with ${(response as List).length} items');
      
      final shows = (response as List)
          .map((json) {
            try {
              print('[DEBUG] Converting JSON to Show: ${json.toString().substring(0, 100)}...');
              return Show.fromJson(json as Map<String, dynamic>);
            } catch (parseError, parseStackTrace) {
              print('❌ ERROR parsing show JSON: $parseError');
              print('[DEBUG] JSON data: $json');
              print('[ERROR] Parse stack trace: $parseStackTrace');
              rethrow;
            }
          })
          .toList();
      
      print('✅ Successfully fetched ${shows.length} shows from Supabase');
      print('[DEBUG] Show IDs: ${shows.map((s) => s.id).toList()}');
      print('[DEBUG] Show titles: ${shows.map((s) => s.title).toList()}');
      return shows;
    } catch (e, stackTrace) {
      print('❌ Error fetching shows: $e');
      print('[ERROR] Stack trace: $stackTrace');
      print('[ERROR] Exception type: ${e.runtimeType}');
      if (e is PostgrestException) {
        print('[ERROR] Postgrest error code: ${e.code}');
        print('[ERROR] Postgrest error details: ${e.details}');
        print('[ERROR] Postgrest error hint: ${e.hint}');
      }
      rethrow;
    }
  }

  /// Fetch shows by organization
  /// 
  /// Demonstrates how to filter by org_id (your typical use case)
  Future<List<Show>> getShowsByOrg(String orgId) async {
    try {
      print('[DEBUG] getShowsByOrg() called with orgId: $orgId');
      print('[DEBUG] Current user: ${_supabase.auth.currentUser?.email}');
      print('[DEBUG] Building query: from(shows).select(*, venues(name)).eq(org_id, $orgId)');
      
      final response = await _supabase
          .from('shows')
          .select('*, venues(name)')
          .eq('org_id', orgId) // Filter by organization
          .order('date', ascending: false);
      
      print('[DEBUG] Query response type: ${response.runtimeType}');
      print('[DEBUG] Raw response: $response');

      if (response == null) {
        print('⚠️ Query returned null response');
        return [];
      }

      if (response is! List) {
        print('❌ ERROR: Expected List but got ${response.runtimeType}');
        throw Exception('Invalid response type: expected List, got ${response.runtimeType}');
      }

      print('[DEBUG] Response is a List with ${(response as List).length} items');
      
      final shows = (response as List)
          .map((json) {
            try {
              print('[DEBUG] Converting org show JSON: ${json.toString().substring(0, 100)}...');
              return Show.fromJson(json as Map<String, dynamic>);
            } catch (parseError, parseStackTrace) {
              print('❌ ERROR parsing org show JSON: $parseError');
              print('[DEBUG] JSON data: $json');
              print('[ERROR] Parse stack trace: $parseStackTrace');
              rethrow;
            }
          })
          .toList();
      
      print('✅ Fetched ${shows.length} shows for org $orgId');
      return shows;
    } catch (e, stackTrace) {
      print('❌ Error fetching shows for org: $e');
      print('[ERROR] Stack trace: $stackTrace');
      print('[ERROR] Exception type: ${e.runtimeType}');
      if (e is PostgrestException) {
        print('[ERROR] Postgrest error code: ${e.code}');
        print('[ERROR] Postgrest error details: ${e.details}');
        print('[ERROR] Postgrest error hint: ${e.hint}');
      }
      rethrow;
    }
  }

  /// Create a new show
  /// 
  /// Demonstrates INSERT operation (protected by RLS policies)
  Future<Show> createShow({
    required String name,
    required String orgId,
    DateTime? date,
    String? venueId,
  }) async {
    try {
      final response = await _supabase
          .from('shows')
          .insert({
            'name': name,
            'org_id': orgId,
            'date': date?.toIso8601String(),
            'venue_id': venueId,
          })
          .select('*, venues(name)')
          .single();
      
      final show = Show.fromJson(response);
      print('✅ Created show: ${show.title}');
      return show;
    } catch (e) {
      print('❌ Error creating show: $e');
      rethrow;
    }
  }

  /// Call an RPC function
  /// 
  /// Example: Call your create_advancing_session function
  /// This works EXACTLY the same as in your Next.js app!
  Future<Map<String, dynamic>> callRpcFunction(
    String functionName,
    Map<String, dynamic> params,
  ) async {
    try {
      final response = await _supabase.rpc(functionName, params: params);
      print('✅ Called RPC function: $functionName');
      return response as Map<String, dynamic>;
    } catch (e) {
      print('❌ Error calling RPC function $functionName: $e');
      rethrow;
    }
  }

  /// Example: Subscribe to real-time changes
  /// 
  /// This demonstrates Supabase real-time subscriptions
  /// (same as your web app's useEffect subscriptions)
  Stream<List<Show>> watchShows({String? orgId}) {
    final query = _supabase
        .from('shows')
        .stream(primaryKey: ['id'])
        .order('date', ascending: false);

    return query.map((data) {
      return data
          .map((json) => Show.fromJson(json))
          .toList();
    });
  }

  /// Check authentication status
  User? get currentUser => _supabase.auth.currentUser;

  /// Sign in (for future use)
  Future<AuthResponse> signIn(String email, String password) async {
    return await _supabase.auth.signInWithPassword(
      email: email,
      password: password,
    );
  }

  /// Sign out
  Future<void> signOut() async {
    await _supabase.auth.signOut();
  }
}
