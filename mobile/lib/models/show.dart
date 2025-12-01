/// Show model - matches the RPC response from get_shows_by_org
/// 
/// This maps Supabase JSON data to Dart objects, matching the web client structure
class Show {
  final String id;
  final String title;
  final DateTime date;
  final String? venueId;
  final String orgId;
  
  // Joined venue data from RPC
  final String? venueName;
  final String? venueCity;
  final String? venueCountry;
  final String? venueAddress;
  final int? venueCapacity;
  
  // Additional fields
  final String? setTime;
  final String? doorsAt;
  final String? notes;
  final String? status;
  
  final DateTime? createdAt;

  Show({
    required this.id,
    required this.title,
    required this.date,
    this.venueId,
    required this.orgId,
    this.venueName,
    this.venueCity,
    this.venueCountry,
    this.venueAddress,
    this.venueCapacity,
    this.setTime,
    this.doorsAt,
    this.notes,
    this.status,
    this.createdAt,
  });

  /// Create Show from get_shows_by_org RPC response
  /// The RPC returns flattened venue data (venue_name, venue_city, etc.)
  factory Show.fromJson(Map<String, dynamic> json) {
    return Show(
      id: json['id'] as String,
      title: json['title'] as String? ?? 'Untitled Show',
      date: DateTime.parse(json['date'] as String),
      venueId: json['venue_id'] as String?,
      orgId: json['org_id'] as String,
      // RPC returns flat venue fields
      venueName: json['venue_name'] as String?,
      venueCity: json['venue_city'] as String?,
      venueCountry: json['venue_country'] as String?,
      venueAddress: json['venue_address'] as String?,
      venueCapacity: json['venue_capacity'] as int?,
      setTime: json['set_time'] as String?,
      doorsAt: json['doors_at'] as String?,
      notes: json['notes'] as String?,
      status: json['status'] as String?,
      createdAt: json['created_at'] != null 
          ? DateTime.parse(json['created_at'] as String)
          : null,
    );
  }

  /// Convert Show to JSON (for creating/updating)
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'date': date.toIso8601String().split('T')[0],
      'venue_id': venueId,
      'org_id': orgId,
    };
  }

  /// Format date for display (matches Next.js format: "Sat, Oct 15")
  String get formattedDate {
    const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return '${weekdays[date.weekday - 1]}, ${months[date.month - 1]} ${date.day}';
  }

  /// Get month and year for grouping (matches Next.js: "October 2025")
  String get monthYear {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
    return '${months[date.month - 1]} ${date.year}';
  }
}
