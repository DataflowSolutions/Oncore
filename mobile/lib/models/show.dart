/// Show model - matches your Supabase 'shows' table
/// 
/// This demonstrates how to map Supabase JSON data to Dart objects
class Show {
  final String id;
  final String title;
  final DateTime date;
  final String? venueId;
  final String orgId;
  
  // Joined venue data
  final String? venueName;
  final String? venueCity;
  
  final DateTime createdAt;

  Show({
    required this.id,
    required this.title,
    required this.date,
    this.venueId,
    required this.orgId,
    this.venueName,
    this.venueCity,
    required this.createdAt,
  });

  /// Create Show from Supabase JSON response
  factory Show.fromJson(Map<String, dynamic> json) {
    return Show(
      id: json['id'] as String,
      title: json['title'] as String? ?? 'Untitled Show',
      date: DateTime.parse(json['date'] as String),
      venueId: json['venue_id'] as String?,
      orgId: json['org_id'] as String,
      // Handle joined venue data
      venueName: json['venue'] != null 
          ? (json['venue'] as Map<String, dynamic>)['name'] as String?
          : null,
      venueCity: json['venue'] != null 
          ? (json['venue'] as Map<String, dynamic>)['city'] as String?
          : null,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  /// Convert Show to JSON (for creating/updating)
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'date': date.toIso8601String(),
      'venue_id': venueId,
      'org_id': orgId,
      'created_at': createdAt.toIso8601String(),
    };
  }

  /// Format date for display (matches Next.js format: "Oct 15")
  String get formattedDate {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return '${months[date.month - 1]} ${date.day}';
  }

  /// Get month and year for grouping (matches Next.js: "October 2025")
  String get monthYear {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
    return '${months[date.month - 1]} ${date.year}';
  }
}
