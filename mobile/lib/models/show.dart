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
  
  // Fee fields
  final double? fee;
  final String? feeCurrency;
  final int? feePaidPercent;
  
  final DateTime? createdAt;
  
  // Artist names from show_assignments (set after fetching)
  final List<String> artistNames;

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
    this.fee,
    this.feeCurrency,
    this.feePaidPercent,
    this.createdAt,
    this.artistNames = const [],
  });

  /// Create Show from get_shows_by_org RPC response
  /// The RPC returns flattened venue data (venue_name, venue_city, etc.)
  factory Show.fromJson(Map<String, dynamic> json) {
    try {
      print('[DEBUG] Show.fromJson() parsing started');
      print('[DEBUG] JSON keys: ${json.keys.toList()}');
      
      // Parse core show fields
      final id = json['id'] as String?;
      print('[DEBUG] Parsing id: $id');
      if (id == null) throw Exception('Missing required field: id');

      final title = json['title'] as String? ?? 'Untitled Show';
      print('[DEBUG] Parsing title: $title');

      final dateStr = json['date'] as String?;
      print('[DEBUG] Parsing date string: $dateStr');
      if (dateStr == null) throw Exception('Missing required field: date');
      
      DateTime date;
      try {
        date = DateTime.parse(dateStr);
        print('[DEBUG] Parsed date: $date');
      } catch (e) {
        print('❌ ERROR parsing date: $e');
        print('[DEBUG] Date string was: $dateStr');
        rethrow;
      }

      final venueId = json['venue_id'] as String?;
      print('[DEBUG] Parsing venue_id: $venueId');

      final orgId = json['org_id'] as String?;
      print('[DEBUG] Parsing org_id: $orgId');
      if (orgId == null) throw Exception('Missing required field: org_id');

      // Venue fields (may be null)
      final venueName = json['venue_name'] as String?;
      final venueCity = json['venue_city'] as String?;
      final venueCountry = json['venue_country'] as String?;
      final venueAddress = json['venue_address'] as String?;
      final venueCapacity = json['venue_capacity'] as int?;
      
      print('[DEBUG] Venue info - Name: $venueName, City: $venueCity, Country: $venueCountry');

      final setTime = json['set_time'] as String?;
      final doorsAt = json['doors_at'] as String?;
      final notes = json['notes'] as String?;
      final status = json['status'] as String?;
      
      print('[DEBUG] Show metadata - SetTime: $setTime, DoorsAt: $doorsAt, Status: $status');

      final createdAtStr = json['created_at'] as String?;
      DateTime? createdAt;
      if (createdAtStr != null) {
        try {
          createdAt = DateTime.parse(createdAtStr);
          print('[DEBUG] Parsed createdAt: $createdAt');
        } catch (e) {
          print('⚠️ Warning: Could not parse createdAt: $e');
        }
      }

      // Parse fee fields
      final feeRaw = json['fee'];
      double? fee;
      if (feeRaw != null) {
        fee = (feeRaw is num) ? feeRaw.toDouble() : double.tryParse(feeRaw.toString());
      }
      final feeCurrency = json['fee_currency'] as String?;
      final feePaidPercent = json['fee_paid_percent'] as int?;

      print('✅ Successfully parsed Show: id=$id, title=$title, date=$date');
      return Show(
        id: id,
        title: title,
        date: date,
        venueId: venueId,
        orgId: orgId,
        // RPC returns flat venue fields
        venueName: venueName,
        venueCity: venueCity,
        venueCountry: venueCountry,
        venueAddress: venueAddress,
        venueCapacity: venueCapacity,
        setTime: setTime,
        doorsAt: doorsAt,
        notes: notes,
        status: status,
        fee: fee,
        feeCurrency: feeCurrency,
        feePaidPercent: feePaidPercent,
        createdAt: createdAt,
      );
    } catch (e, stackTrace) {
      print('❌ ERROR in Show.fromJson: $e');
      print('[ERROR] Stack trace: $stackTrace');
      print('[ERROR] Exception type: ${e.runtimeType}');
      print('[DEBUG] Full JSON data: $json');
      rethrow;
    }
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
  
  /// Get formatted artist names for display
  String get artistNamesDisplay {
    if (artistNames.isEmpty) return 'No Artist';
    return artistNames.join(', ');
  }
  
  /// Create a copy with updated artist names
  Show copyWith({
    List<String>? artistNames,
    double? fee,
    String? feeCurrency,
    int? feePaidPercent,
  }) {
    return Show(
      id: id,
      title: title,
      date: date,
      venueId: venueId,
      orgId: orgId,
      venueName: venueName,
      venueCity: venueCity,
      venueCountry: venueCountry,
      venueAddress: venueAddress,
      venueCapacity: venueCapacity,
      setTime: setTime,
      doorsAt: doorsAt,
      notes: notes,
      status: status,
      fee: fee ?? this.fee,
      feeCurrency: feeCurrency ?? this.feeCurrency,
      feePaidPercent: feePaidPercent ?? this.feePaidPercent,
      createdAt: createdAt,
      artistNames: artistNames ?? this.artistNames,
    );
  }
  
  /// Format fee for display
  String get formattedFee {
    if (fee == null) return '';
    final currency = feeCurrency ?? 'USD';
    final symbol = _getCurrencySymbol(currency);
    return '$symbol${fee!.toStringAsFixed(0)}';
  }
  
  /// Get currency symbol
  static String _getCurrencySymbol(String currency) {
    switch (currency.toUpperCase()) {
      case 'USD': return '\$';
      case 'EUR': return '€';
      case 'GBP': return '£';
      case 'SEK': return 'kr';
      case 'NOK': return 'kr';
      case 'DKK': return 'kr';
      default: return '\$';
    }
  }
  
  /// Get fee paid display
  String get feePaidDisplay {
    if (feePaidPercent == null || feePaidPercent == 0) return 'Not paid';
    if (feePaidPercent == 100) return 'Paid in full';
    return '$feePaidPercent% paid';
  }
}
