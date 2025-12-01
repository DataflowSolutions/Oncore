import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../providers/auth_provider.dart';
import '../../../models/show.dart';
import '../../../models/show_day.dart';

/// Provider for fetching show details
final showDetailProvider = FutureProvider.family<Show?, String>((ref, showId) async {
  final supabase = ref.watch(supabaseClientProvider);
  
  final response = await supabase
      .from('shows')
      .select('''
        id,
        title,
        date,
        venue_id,
        org_id,
        set_time,
        doors_at,
        notes,
        status,
        created_at,
        venues (
          id,
          name,
          city,
          country,
          address,
          capacity
        )
      ''')
      .eq('id', showId)
      .single();
  
  final venue = response['venues'] as Map<String, dynamic>?;
  
  return Show(
    id: response['id'] as String,
    title: response['title'] as String? ?? 'Untitled Show',
    date: DateTime.parse(response['date'] as String),
    venueId: response['venue_id'] as String?,
    orgId: response['org_id'] as String,
    venueName: venue?['name'] as String?,
    venueCity: venue?['city'] as String?,
    venueCountry: venue?['country'] as String?,
    venueAddress: venue?['address'] as String?,
    venueCapacity: venue?['capacity'] as int?,
    setTime: response['set_time'] as String?,
    doorsAt: response['doors_at'] as String?,
    notes: response['notes'] as String?,
    status: response['status'] as String?,
    createdAt: response['created_at'] != null
        ? DateTime.parse(response['created_at'] as String)
        : null,
  );
});

/// Provider for fetching assigned people for a show
final showAssignmentsProvider = FutureProvider.family<List<AssignedPerson>, String>((ref, showId) async {
  final supabase = ref.watch(supabaseClientProvider);
  
  final response = await supabase
      .from('show_assignments')
      .select('''
        person_id,
        duty,
        people (
          id,
          name,
          member_type
        )
      ''')
      .eq('show_id', showId);
  
  final List<dynamic> data = response as List<dynamic>;
  return data.map((json) {
    final j = json as Map<String, dynamic>;
    final person = j['people'] as Map<String, dynamic>?;
    return AssignedPerson(
      personId: j['person_id'] as String,
      name: person?['name'] as String? ?? 'Unknown',
      memberType: person?['member_type'] as String?,
      duty: j['duty'] as String?,
    );
  }).toList();
});

/// Provider for fetching schedule items for a show
final showScheduleProvider = FutureProvider.family<List<ScheduleItem>, String>((ref, showId) async {
  final supabase = ref.watch(supabaseClientProvider);
  
  final response = await supabase
      .from('schedule_items')
      .select()
      .eq('show_id', showId)
      .order('starts_at', ascending: true);
  
  final List<dynamic> data = response as List<dynamic>;
  return data.map((json) => ScheduleItem.fromJson(json as Map<String, dynamic>)).toList();
});

/// Provider for fetching flights for a show
final showFlightsProvider = FutureProvider.family<List<FlightInfo>, String>((ref, showId) async {
  final supabase = ref.watch(supabaseClientProvider);
  
  // Use RPC if available, otherwise query directly
  try {
    final response = await supabase.rpc('get_show_flights', params: {'p_show_id': showId});
    final List<dynamic> data = response as List<dynamic>;
    return data.map((json) => FlightInfo.fromJson(json as Map<String, dynamic>)).toList();
  } catch (e) {
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
  final supabase = ref.watch(supabaseClientProvider);
  
  try {
    final response = await supabase.rpc('get_lodging_by_show_person', params: {
      'p_show_id': showId,
    });
    final List<dynamic> data = response as List<dynamic>;
    return data.map((json) => LodgingInfo.fromJson(json as Map<String, dynamic>)).toList();
  } catch (e) {
    // Fallback to direct query
    final response = await supabase
        .from('advancing_lodging')
        .select()
        .eq('show_id', showId);
    
    final List<dynamic> data = response as List<dynamic>;
    return data.map((json) => LodgingInfo.fromJson(json as Map<String, dynamic>)).toList();
  }
});

/// Provider for fetching catering for a show
final showCateringProvider = FutureProvider.family<List<CateringInfo>, String>((ref, showId) async {
  final supabase = ref.watch(supabaseClientProvider);
  
  final response = await supabase
      .from('advancing_catering')
      .select()
      .eq('show_id', showId)
      .order('service_at', ascending: true);
  
  final List<dynamic> data = response as List<dynamic>;
  return data.map((json) => CateringInfo.fromJson(json as Map<String, dynamic>)).toList();
});

/// Provider for fetching documents for a show
final showDocumentsProvider = FutureProvider.family<List<DocumentInfo>, String>((ref, showId) async {
  final supabase = ref.watch(supabaseClientProvider);
  
  final response = await supabase
      .from('advancing_documents')
      .select()
      .eq('show_id', showId)
      .order('created_at', ascending: false);
  
  final List<dynamic> data = response as List<dynamic>;
  return data.map((json) => DocumentInfo.fromJson(json as Map<String, dynamic>)).toList();
});

/// Provider for fetching contacts for a show
final showContactsProvider = FutureProvider.family<List<ContactInfo>, String>((ref, showId) async {
  final supabase = ref.watch(supabaseClientProvider);
  
  try {
    final response = await supabase.rpc('get_show_contacts', params: {'p_show_id': showId});
    final List<dynamic> data = response as List<dynamic>;
    return data.map((json) => ContactInfo.fromJson(json as Map<String, dynamic>)).toList();
  } catch (e) {
    // Fallback to direct query
    final response = await supabase
        .from('show_contacts')
        .select()
        .eq('show_id', showId);
    
    final List<dynamic> data = response as List<dynamic>;
    return data.map((json) => ContactInfo.fromJson(json as Map<String, dynamic>)).toList();
  }
});
