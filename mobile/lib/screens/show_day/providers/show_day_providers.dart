import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../providers/auth_provider.dart';
import '../../../models/show.dart';
import '../../../models/show_day.dart';

/// Provider for fetching show details
final showDetailProvider = FutureProvider.family<Show?, String>((ref, showId) async {
  print('═══════════════════════════════════════');
  print('[DEBUG] showDetailProvider called with showId: $showId');
  print('═══════════════════════════════════════');
  
  try {
    print('[DEBUG] Getting supabase client...');
    final supabase = ref.watch(supabaseClientProvider);
    print('[DEBUG] Supabase client obtained: $supabase');
    
    print('[DEBUG] Using RPC: get_show_by_id($showId)');
    
    // Call RPC function to bypass RLS issues
    final response = await supabase.rpc('get_show_by_id', params: {'p_show_id': showId});
    
    print('[DEBUG] RPC response received');
    print('[DEBUG] Response type: ${response.runtimeType}');
    print('[DEBUG] Response: $response');
    
    if (response == null) {
      print('⚠️ RPC returned null');
      return null;
    }
    
    final showData = response as Map<String, dynamic>;
    print('[DEBUG] Show data keys: ${showData.keys.toList()}');
    print('[DEBUG] Show ID: ${showData['id']}');
    print('[DEBUG] Show title: ${showData['title']}');
    print('[DEBUG] Show date: ${showData['date']}');
    print('[DEBUG] Venue ID: ${showData['venue_id']}');
    
    // If there's a venue_id, fetch venue data separately
    String? venueName;
    String? venueCity;
    String? venueCountry;
    String? venueAddress;
    int? venueCapacity;
    
    if (showData['venue_id'] != null) {
      print('[DEBUG] Fetching venue data for venue_id: ${showData['venue_id']}');
      try {
        // Try RPC first to bypass RLS
        final venueResponse = await supabase.rpc('get_venue_details', params: {'p_venue_id': showData['venue_id'] as String});
        
        print('[DEBUG] Venue RPC response type: ${venueResponse.runtimeType}');
        print('[DEBUG] Venue RPC response: $venueResponse');
        
        if (venueResponse != null && venueResponse is Map<String, dynamic>) {
          // The RPC might return {venue: {...}, shows: [...]} or just the venue object
          final venueData = (venueResponse['venue'] ?? venueResponse) as Map<String, dynamic>?;
          if (venueData != null) {
            venueName = venueData['name'] as String?;
            venueCity = venueData['city'] as String?;
            venueCountry = venueData['country'] as String?;
            venueAddress = venueData['address'] as String?;
            venueCapacity = venueData['capacity'] as int?;
            print('[DEBUG] Venue data from RPC: $venueName, $venueCity');
          }
        }
      } catch (venueError) {
        print('⚠️ Could not fetch venue data: $venueError');
        print('[DEBUG] Continuing without venue data');
      }
    }
    
    final show = Show(
      id: showData['id'] as String,
      title: showData['title'] as String? ?? 'Untitled Show',
      date: DateTime.parse(showData['date'] as String),
      venueId: showData['venue_id'] as String?,
      orgId: showData['org_id'] as String,
      venueName: venueName,
      venueCity: venueCity,
      venueCountry: venueCountry,
      venueAddress: venueAddress,
      venueCapacity: venueCapacity,
      setTime: showData['set_time'] as String?,
      doorsAt: showData['doors_at'] as String?,
      notes: showData['notes'] as String?,
      status: showData['status'] as String?,
      createdAt: showData['created_at'] != null
          ? DateTime.parse(showData['created_at'] as String)
          : null,
    );
    
    print('═══════════════════════════════════════');
    print('✅ Show detail loaded: ${show.title}');
    print('═══════════════════════════════════════');
    return show;
  } on Exception catch (e, stackTrace) {
    print('═══════════════════════════════════════');
    print('❌ EXCEPTION in showDetailProvider: $e');
    print('[ERROR] Exception type: ${e.runtimeType}');
    print('[ERROR] Stack trace: $stackTrace');
    print('═══════════════════════════════════════');
    rethrow;
  } catch (e, stackTrace) {
    print('═══════════════════════════════════════');
    print('❌ UNEXPECTED ERROR in showDetailProvider: $e');
    print('[ERROR] Exception type: ${e.runtimeType}');
    print('[ERROR] Stack trace: $stackTrace');
    print('═══════════════════════════════════════');
    rethrow;
  }
});

/// Provider for fetching assigned people for a show
final showAssignmentsProvider = FutureProvider.family<List<AssignedPerson>, String>((ref, showId) async {
  print('═══════════════════════════════════════');
  print('[DEBUG] showAssignmentsProvider called with showId: $showId');
  print('═══════════════════════════════════════');
  
  try {
    print('[DEBUG] Getting supabase client...');
    final supabase = ref.watch(supabaseClientProvider);
    
    print('[DEBUG] Using RPC: get_show_team($showId)');
    
    // Use RPC to bypass RLS issues
    final response = await supabase.rpc('get_show_team', params: {'p_show_id': showId});
    
    print('[DEBUG] RPC response received');
    print('[DEBUG] Response type: ${response.runtimeType}');
    print('[DEBUG] Response is list: ${response is List}');
    
    if (response == null) {
      print('⚠️ RPC returned null, returning empty list');
      return [];
    }

    final List<dynamic> data = response as List<dynamic>;
    print('[DEBUG] Assignment count: ${data.length}');
    
    final assignments = data.map((json) {
      print('[DEBUG] Processing assignment JSON');
      final j = json as Map<String, dynamic>;
      print('[DEBUG] Assignment keys: ${j.keys.toList()}');
      print('[DEBUG] Assignment data: ${j.toString()}');
      
      // The RPC returns flattened person data: id, name, email, phone, member_type, duty
      // Extract the person_id from the first level
      final personId = j['id'] as String?;
      final name = j['name'] as String?;
      final memberType = j['member_type'] as String?;
      final duty = j['duty'] as String?;
      
      print('[DEBUG] Parsed: personId=$personId, name=$name, duty=$duty');
      
      return AssignedPerson(
        personId: personId ?? '',  // Provide fallback for null
        name: name ?? 'Unknown',
        memberType: memberType,
        duty: duty,
      );
    }).toList();
    
    print('═══════════════════════════════════════');
    print('✅ Show assignments loaded: ${assignments.length} assignments');
    print('═══════════════════════════════════════');
    return assignments;
  } on TypeError catch (e, stackTrace) {
    print('═══════════════════════════════════════');
    print('❌ TYPE ERROR in showAssignmentsProvider: $e');
    print('[ERROR] This likely means the RPC returned unexpected data structure');
    print('[ERROR] Stack trace: $stackTrace');
    print('═══════════════════════════════════════');
    return [];  // Return empty list instead of crashing
  } on Exception catch (e, stackTrace) {
    print('═══════════════════════════════════════');
    print('❌ EXCEPTION in showAssignmentsProvider: $e');
    print('[ERROR] Exception type: ${e.runtimeType}');
    print('[ERROR] Stack trace: $stackTrace');
    print('═══════════════════════════════════════');
    return [];
  } catch (e, stackTrace) {
    print('═══════════════════════════════════════');
    print('❌ UNEXPECTED ERROR in showAssignmentsProvider: $e');
    print('[ERROR] Exception type: ${e.runtimeType}');
    print('[ERROR] Stack trace: $stackTrace');
    print('═══════════════════════════════════════');
    return [];
  }
});

/// Provider for fetching schedule items for a show
final showScheduleProvider = FutureProvider.family<List<ScheduleItem>, String>((ref, showId) async {
  print('═══════════════════════════════════════');
  print('[DEBUG] showScheduleProvider called with showId: $showId');
  print('═══════════════════════════════════════');
  
  try {
    print('[DEBUG] Getting supabase client...');
    final supabase = ref.watch(supabaseClientProvider);
    
    print('[DEBUG] Using RPC: get_schedule_items_for_show($showId)');
    
    final response = await supabase.rpc('get_schedule_items_for_show', params: {'p_show_id': showId});
    
    print('[DEBUG] RPC response received');
    print('[DEBUG] Response type: ${response.runtimeType}');
    print('[DEBUG] Response is list: ${response is List}');
    
    if (response == null) {
      print('⚠️ RPC returned null, returning empty list');
      return [];
    }
    
    final List<dynamic> data = response as List<dynamic>;
    print('[DEBUG] Schedule item count: ${data.length}');
    
    final items = data.map((json) {
      print('[DEBUG] Processing schedule item JSON');
      print('[DEBUG] Item data keys: ${(json as Map).keys.toList()}');
      return ScheduleItem.fromJson(json as Map<String, dynamic>);
    }).toList();
    
    print('═══════════════════════════════════════');
    print('✅ Schedule items loaded: ${items.length} items');
    print('═══════════════════════════════════════');
    return items;
  } on Exception catch (e, stackTrace) {
    print('═══════════════════════════════════════');
    print('❌ EXCEPTION in showScheduleProvider: $e');
    print('[ERROR] Exception type: ${e.runtimeType}');
    print('[ERROR] Stack trace: $stackTrace');
    print('═══════════════════════════════════════');
    rethrow;
  } catch (e, stackTrace) {
    print('═══════════════════════════════════════');
    print('❌ UNEXPECTED ERROR in showScheduleProvider: $e');
    print('[ERROR] Exception type: ${e.runtimeType}');
    print('[ERROR] Stack trace: $stackTrace');
    print('═══════════════════════════════════════');
    rethrow;
  }
});

/// Provider for fetching flights for a show
final showFlightsProvider = FutureProvider.family<List<FlightInfo>, String>((ref, showId) async {
  print('[DEBUG] showFlightsProvider called with showId: $showId');
  final supabase = ref.watch(supabaseClientProvider);
  
  // Use RPC if available, otherwise query directly
  try {
    print('[DEBUG] Attempting RPC: get_show_flights($showId)');
    final response = await supabase.rpc('get_show_flights', params: {'p_show_id': showId});
    print('[DEBUG] RPC successful, response: ${(response as List).length} items');
    final List<dynamic> data = response as List<dynamic>;
    return data.map((json) => FlightInfo.fromJson(json as Map<String, dynamic>)).toList();
  } catch (rpcError) {
    print('⚠️ RPC failed: $rpcError, attempting direct query');
    // Fallback to direct query
    final response = await supabase
        .from('advancing_flights')
        .select()
        .eq('show_id', showId)
        .order('depart_at', ascending: true);
    
    final List<dynamic> data = response as List<dynamic>;
    return data.map((json) => FlightInfo.fromJson(json as Map<String, dynamic>)).toList();
  }
});

/// Provider for fetching lodging for a show
final showLodgingProvider = FutureProvider.family<List<LodgingInfo>, String>((ref, showId) async {
  print('[DEBUG] showLodgingProvider called with showId: $showId');
  final supabase = ref.watch(supabaseClientProvider);
  
  try {
    print('[DEBUG] Attempting RPC: get_show_lodging($showId)');
    final response = await supabase.rpc('get_show_lodging', params: {
      'p_show_id': showId,
    });
    print('[DEBUG] RPC response type: ${response.runtimeType}');
    
    // Response should be a list
    late final List<dynamic> data;
    if (response is List<dynamic>) {
      data = response;
    } else if (response is Map<String, dynamic>) {
      // Single object response, wrap in list
      data = [response];
    } else {
      print('⚠️ Unexpected RPC response type: ${response.runtimeType}');
      data = [];
    }
    
    print('[DEBUG] RPC successful, response: ${data.length} items');
    return data.map((json) => LodgingInfo.fromJson(json as Map<String, dynamic>)).toList();
  } catch (rpcError) {
    print('⚠️ RPC failed: $rpcError, attempting direct query');
    try {
      final response = await supabase
          .from('advancing_lodging')
          .select()
          .eq('show_id', showId);
      
      final List<dynamic> data = response as List<dynamic>;
      print('[DEBUG] Lodging loaded via fallback: ${data.length} items');
      return data.map((json) => LodgingInfo.fromJson(json as Map<String, dynamic>)).toList();
    } catch (e) {
      print('⚠️ Error loading lodging fallback: $e');
      return [];
    }
  }
});

/// Provider for fetching catering for a show
final showCateringProvider = FutureProvider.family<List<CateringInfo>, String>((ref, showId) async {
  print('[DEBUG] showCateringProvider called with showId: $showId');
  final supabase = ref.watch(supabaseClientProvider);
  
  try {
    print('[DEBUG] Attempting RPC: get_show_catering($showId)');
    final response = await supabase.rpc('get_show_catering', params: {'p_show_id': showId});
    print('[DEBUG] RPC response type: ${response.runtimeType}');
    print('[DEBUG] RPC response: $response');
    
    // Response might be a single object or a list - handle both
    late final List<dynamic> data;
    if (response is List<dynamic>) {
      data = response;
    } else if (response is Map<String, dynamic>) {
      // Single object response, wrap in list
      data = [response];
    } else {
      print('⚠️ Unexpected RPC response type: ${response.runtimeType}');
      data = [];
    }
    
    print('[DEBUG] RPC successful, response: ${data.length} items');
    return data.map((json) => CateringInfo.fromJson(json as Map<String, dynamic>)).toList();
  } catch (rpcError) {
    print('⚠️ RPC failed: $rpcError, attempting direct query');
    try {
      final response = await supabase
          .from('advancing_catering')
          .select()
          .eq('show_id', showId)
          .order('service_at', ascending: true);
      
      final List<dynamic> data = response as List<dynamic>;
      print('[DEBUG] Catering loaded via fallback: ${data.length} items');
      return data.map((json) => CateringInfo.fromJson(json as Map<String, dynamic>)).toList();
    } catch (e) {
      print('⚠️ Error loading catering fallback: $e');
      return [];
    }
  }
});

/// Provider for fetching documents/files for a show
final showDocumentsProvider = FutureProvider.family<List<DocumentInfo>, String>((ref, showId) async {
  print('[DEBUG] showDocumentsProvider called with showId: $showId');
  final supabase = ref.watch(supabaseClientProvider);
  
  try {
    print('[DEBUG] Attempting RPC: get_show_files($showId)');
    final response = await supabase.rpc('get_show_files', params: {'p_show_id': showId});
    print('[DEBUG] RPC response type: ${response.runtimeType}');
    
    // Response should be a list
    late final List<dynamic> data;
    if (response is List<dynamic>) {
      data = response;
    } else {
      print('⚠️ Unexpected RPC response type: ${response.runtimeType}');
      data = [];
    }
    
    print('[DEBUG] RPC successful, response: ${data.length} items');
    return data.map((json) => DocumentInfo.fromJson(json as Map<String, dynamic>)).toList();
  } catch (rpcError) {
    print('⚠️ RPC failed: $rpcError, attempting direct query');
    try {
      final response = await supabase
          .from('files')
          .select()
          .eq('show_id', showId)
          .order('created_at', ascending: false);
      
      final List<dynamic> data = response as List<dynamic>;
      print('[DEBUG] Documents loaded via fallback: ${data.length} items');
      return data.map((json) => DocumentInfo.fromJson(json as Map<String, dynamic>)).toList();
    } catch (e) {
      print('⚠️ Error loading documents fallback: $e');
      return [];
    }
  }
});

/// Provider for fetching contacts for a show
final showContactsProvider = FutureProvider.family<List<ContactInfo>, String>((ref, showId) async {
  print('[DEBUG] showContactsProvider called with showId: $showId');
  final supabase = ref.watch(supabaseClientProvider);
  
  try {
    print('[DEBUG] Attempting RPC: get_show_contacts($showId)');
    final response = await supabase.rpc('get_show_contacts', params: {'p_show_id': showId});
    print('[DEBUG] RPC successful, response: ${(response as List).length} items');
    final List<dynamic> data = response as List<dynamic>;
    return data.map((json) => ContactInfo.fromJson(json as Map<String, dynamic>)).toList();
  } catch (rpcError) {
    print('⚠️ RPC failed: $rpcError, attempting direct query');
    // Fallback to direct query
    try {
      final response = await supabase
          .from('show_contacts')
          .select()
          .eq('show_id', showId);
      
      final List<dynamic> data = response as List<dynamic>;
      print('[DEBUG] Contacts loaded via fallback: ${data.length} items');
      return data.map((json) => ContactInfo.fromJson(json as Map<String, dynamic>)).toList();
    } catch (e) {
      print('⚠️ Error loading contacts: $e');
      return [];
    }
  }
});

/// Provider for fetching guestlist for a show
final showGuestlistProvider = FutureProvider.family<List<GuestInfo>, String>((ref, showId) async {
  print('[DEBUG] showGuestlistProvider called with showId: $showId');
  final supabase = ref.watch(supabaseClientProvider);
  
  try {
    print('[DEBUG] Attempting RPC: get_show_guestlist($showId)');
    final response = await supabase.rpc('get_show_guestlist', params: {'p_show_id': showId});
    print('[DEBUG] RPC response type: ${response.runtimeType}');
    
    // Response should be a list
    late final List<dynamic> data;
    if (response is List<dynamic>) {
      data = response;
    } else {
      print('⚠️ Unexpected RPC response type: ${response.runtimeType}');
      data = [];
    }
    
    print('[DEBUG] RPC successful, response: ${data.length} items');
    return data.map((json) => GuestInfo.fromJson(json as Map<String, dynamic>)).toList();
  } catch (rpcError) {
    print('⚠️ RPC failed: $rpcError, attempting direct query');
    try {
      final response = await supabase
          .from('show_guestlist')
          .select()
          .eq('show_id', showId)
          .order('name', ascending: true);
      
      final List<dynamic> data = response as List<dynamic>;
      print('[DEBUG] Guestlist loaded via fallback: ${data.length} items');
      return data.map((json) => GuestInfo.fromJson(json as Map<String, dynamic>)).toList();
    } catch (e) {
      print('⚠️ Error loading guestlist fallback: $e');
      return [];
    }
  }
});

/// Provider for fetching notes for a show
final showNotesProvider = FutureProvider.family<String?, String>((ref, showId) async {
  print('[DEBUG] showNotesProvider called with showId: $showId');
  final supabase = ref.watch(supabaseClientProvider);
  
  try {
    print('[DEBUG] Attempting RPC: get_show_notes($showId)');
    final response = await supabase.rpc('get_show_notes', params: {'p_show_id': showId});
    print('[DEBUG] RPC response type: ${response.runtimeType}');
    
    // Response should be a list of notes
    if (response is List<dynamic> && response.isNotEmpty) {
      // Find the 'general' scope note
      for (var note in response) {
        if (note is Map<String, dynamic> && note['scope'] == 'general') {
          final body = note['body'] as String?;
          print('[DEBUG] Notes loaded: ${body != null ? 'has content' : 'empty'}');
          return body;
        }
      }
    }
    
    print('[DEBUG] No general notes found');
    return null;
  } catch (rpcError) {
    print('⚠️ RPC failed: $rpcError, attempting direct query');
    try {
      final response = await supabase
          .from('advancing_notes')
          .select('body')
          .eq('show_id', showId)
          .eq('scope', 'general')
          .maybeSingle();
      
      if (response == null) {
        print('[DEBUG] No notes found via fallback');
        return null;
      }
      
      final notes = response['body'] as String?;
      print('[DEBUG] Notes loaded via fallback: ${notes != null ? 'has content' : 'empty'}');
      return notes;
    } catch (e) {
      print('⚠️ Error loading notes fallback: $e');
      return null;
    }
  }
});
