import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/show.dart';

/// Supabase Service - Direct database access (NO REST API needed!)
/// 
/// This service demonstrates how Flutter connects DIRECTLY to Supabase,
/// just like your Next.js web app does. Same database, same queries!
class SupabaseService {
  // Get Supabase client instance (initialized in main.dart)
  final _supabase = Supabase.instance.client;

  /// Auto-login as test user
  /// This matches your seed data: testacc@gmail.com / testacc
  Future<void> signInAsTestUser() async {
    try {
      // Check if already signed in
      if (_supabase.auth.currentUser != null) {
        print('✅ Already signed in as: ${_supabase.auth.currentUser!.email}');
        return;
      }

      print('🔐 Signing in as test user...');
      final response = await _supabase.auth.signInWithPassword(
        email: 'testacc@gmail.com',
        password: 'testacc',
      );

      if (response.user != null) {
        print('✅ Signed in as: ${response.user!.email}');
      }
    } catch (e) {
      print('❌ Error signing in: $e');
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
      // This is the EXACT same query your Next.js app makes!
      // Matches: getShowsByOrg() in lib/actions/shows.ts
      final response = await _supabase
          .from('shows')
          .select('*, venue:venues(name, city)') // Join with venue table (singular!)
          .order('date', ascending: true); // Ascending to show upcoming first
      
      // Convert JSON to Show objects
      final shows = (response as List)
          .map((json) => Show.fromJson(json as Map<String, dynamic>))
          .toList();
      
      print('✅ Fetched ${shows.length} shows from Supabase');
      return shows;
    } catch (e) {
      print('❌ Error fetching shows: $e');
      rethrow;
    }
  }

  /// Fetch shows by organization
  /// 
  /// Demonstrates how to filter by org_id (your typical use case)
  Future<List<Show>> getShowsByOrg(String orgId) async {
    try {
      final response = await _supabase
          .from('shows')
          .select('*, venues(name)')
          .eq('org_id', orgId) // Filter by organization
          .order('date', ascending: false);
      
      final shows = (response as List)
          .map((json) => Show.fromJson(json as Map<String, dynamic>))
          .toList();
      
      print('✅ Fetched ${shows.length} shows for org $orgId');
      return shows;
    } catch (e) {
      print('❌ Error fetching shows for org: $e');
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
