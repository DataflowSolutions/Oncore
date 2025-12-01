import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/auth_provider.dart';

/// Network tab types
enum NetworkTab { team, promoters, venues }

/// Team member model
class TeamMember {
  final String id;
  final String name;
  final String? phone;
  final String? email;
  final String? memberType;
  final String? userId;

  TeamMember({
    required this.id,
    required this.name,
    this.phone,
    this.email,
    this.memberType,
    this.userId,
  });

  factory TeamMember.fromJson(Map<String, dynamic> json) {
    return TeamMember(
      id: json['id'] as String,
      name: json['name'] as String? ?? 'Unknown',
      phone: json['phone'] as String?,
      email: json['email'] as String?,
      memberType: json['member_type'] as String?,
      userId: json['user_id'] as String?,
    );
  }

  bool get isActive => userId != null;
}

/// Promoter model
class Promoter {
  final String id;
  final String name;
  final String? phone;
  final String? email;
  final String? company;
  final String? city;
  final String? country;
  final List<String> venueNames;

  Promoter({
    required this.id,
    required this.name,
    this.phone,
    this.email,
    this.company,
    this.city,
    this.country,
    this.venueNames = const [],
  });

  factory Promoter.fromJson(Map<String, dynamic> json) {
    // Parse venues from the joined data
    final venuesData = json['venues'] as List<dynamic>? ?? [];
    final venueNames = venuesData
        .map((v) => (v as Map<String, dynamic>)['name'] as String?)
        .where((n) => n != null)
        .cast<String>()
        .toList();

    return Promoter(
      id: json['id'] as String,
      name: json['name'] as String? ?? 'Unknown',
      phone: json['phone'] as String?,
      email: json['email'] as String?,
      company: json['company'] as String?,
      city: json['city'] as String?,
      country: json['country'] as String?,
      venueNames: venueNames,
    );
  }

  String get location {
    if (city != null && country != null) return '$city, $country';
    return city ?? country ?? '';
  }
}

/// Venue model
class Venue {
  final String id;
  final String name;
  final String? city;
  final String? country;
  final String? address;
  final String? phone;
  final String? email;
  final int? capacity;
  final int showCount;
  final List<String> promoterNames;

  Venue({
    required this.id,
    required this.name,
    this.city,
    this.country,
    this.address,
    this.phone,
    this.email,
    this.capacity,
    this.showCount = 0,
    this.promoterNames = const [],
  });

  factory Venue.fromJson(Map<String, dynamic> json) {
    // Parse promoters from the joined data
    final promotersData = json['promoters'] as List<dynamic>? ?? [];
    final promoterNames = promotersData
        .map((p) => (p as Map<String, dynamic>)['name'] as String?)
        .where((n) => n != null)
        .cast<String>()
        .toList();
    
    // Get phone and email from first promoter if available
    String? phone;
    String? email;
    if (promotersData.isNotEmpty) {
      final firstPromoter = promotersData.first as Map<String, dynamic>;
      phone = firstPromoter['phone'] as String?;
      email = firstPromoter['email'] as String?;
    }

    return Venue(
      id: json['id'] as String,
      name: json['name'] as String? ?? 'Unknown',
      city: json['city'] as String?,
      country: json['country'] as String?,
      address: json['address'] as String?,
      phone: phone,
      email: email,
      capacity: json['capacity'] as int?,
      showCount: json['show_count'] as int? ?? 0,
      promoterNames: promoterNames,
    );
  }

  String get location {
    if (city != null && country != null) return '$city, $country';
    return city ?? country ?? '';
  }
}

/// Provider for fetching team members
final teamMembersProvider = FutureProvider.family<List<TeamMember>, String>((ref, orgId) async {
  final supabase = ref.watch(supabaseClientProvider);
  
  final response = await supabase.rpc('get_org_people', params: {'p_org_id': orgId});
  final List<dynamic> data = response as List<dynamic>;
  return data.map((json) => TeamMember.fromJson(json as Map<String, dynamic>)).toList();
});

/// Provider for fetching promoters
final promotersProvider = FutureProvider.family<List<Promoter>, String>((ref, orgId) async {
  final supabase = ref.watch(supabaseClientProvider);
  
  final response = await supabase.rpc('get_org_promoters', params: {'p_org_id': orgId});
  final List<dynamic> data = response as List<dynamic>;
  return data.map((json) => Promoter.fromJson(json as Map<String, dynamic>)).toList();
});

/// Provider for fetching venues
final venuesProvider = FutureProvider.family<List<Venue>, String>((ref, orgId) async {
  final supabase = ref.watch(supabaseClientProvider);
  
  final response = await supabase.rpc('get_org_venues_with_counts', params: {'p_org_id': orgId});
  final List<dynamic> data = response as List<dynamic>;
  return data.map((json) => Venue.fromJson(json as Map<String, dynamic>)).toList();
});

/// Network content widget - just the content, no shell/nav
/// Used inside MainShell for swipe navigation
class NetworkContent extends ConsumerStatefulWidget {
  final String orgId;
  final String orgName;
  final NetworkTab activeTab;
  final ValueChanged<NetworkTab>? onTabChanged;

  const NetworkContent({
    super.key,
    required this.orgId,
    required this.orgName,
    this.activeTab = NetworkTab.team,
    this.onTabChanged,
  });

  @override
  ConsumerState<NetworkContent> createState() => _NetworkContentState();
}

class _NetworkContentState extends ConsumerState<NetworkContent> {
  // Colors matching web dark theme
  static const _foreground = Color(0xFFF0F0F0);
  static const _muted = Color(0xFFA3A3A3);
  static const _cardBg = Color(0xFF1A1A1A);
  static const _border = Color(0xFF262626);
  static const _destructive = Color(0xFFEF4444);

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Title
        _buildTitle(),
        const SizedBox(height: 16),
        // Content
        Expanded(
          child: _buildContent(),
        ),
      ],
    );
  }

  Widget _buildTitle() {
    String title;
    switch (widget.activeTab) {
      case NetworkTab.team:
        title = 'Team';
        break;
      case NetworkTab.promoters:
        title = 'Promoters';
        break;
      case NetworkTab.venues:
        title = 'Venues';
        break;
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Align(
        alignment: Alignment.centerLeft,
        child: Text(
          title,
          style: const TextStyle(
            color: _foreground,
            fontSize: 28,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }

  Widget _buildContent() {
    switch (widget.activeTab) {
      case NetworkTab.team:
        return _buildTeamList();
      case NetworkTab.promoters:
        return _buildPromotersList();
      case NetworkTab.venues:
        return _buildVenuesList();
    }
  }

  Widget _buildTeamList() {
    final teamAsync = ref.watch(teamMembersProvider(widget.orgId));

    return teamAsync.when(
      loading: () => const Center(
        child: CircularProgressIndicator(color: _foreground),
      ),
      error: (error, stack) => Center(
        child: Text('Error: $error', style: const TextStyle(color: _muted)),
      ),
      data: (members) {
        if (members.isEmpty) {
          return const Center(
            child: Text('No team members', style: TextStyle(color: _muted)),
          );
        }
        return ListView.builder(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          itemCount: members.length,
          itemBuilder: (context, index) => _buildTeamCard(members[index]),
        );
      },
    );
  }

  Widget _buildTeamCard(TeamMember member) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: _cardBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _border),
      ),
      child: Row(
        children: [
          // Left side: Name, phone, email
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  member.name,
                  style: const TextStyle(
                    color: _foreground,
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if (member.phone != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    member.phone!,
                    style: const TextStyle(color: _muted, fontSize: 14),
                  ),
                ],
                if (member.email != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    member.email!,
                    style: const TextStyle(color: _muted, fontSize: 14),
                  ),
                ],
              ],
            ),
          ),
          // Right side: Member type badge and Remove button
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (member.memberType != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                  decoration: BoxDecoration(
                    color: _foreground,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    member.memberType!,
                    style: const TextStyle(
                      color: Color(0xFF000000),
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              const SizedBox(height: 12),
              GestureDetector(
                onTap: () => _showRemoveDialog(member.name),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                  decoration: BoxDecoration(
                    color: _destructive,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: const Text(
                    'Remove',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPromotersList() {
    final promotersAsync = ref.watch(promotersProvider(widget.orgId));

    return promotersAsync.when(
      loading: () => const Center(
        child: CircularProgressIndicator(color: _foreground),
      ),
      error: (error, stack) => Center(
        child: Text('Error: $error', style: const TextStyle(color: _muted)),
      ),
      data: (promoters) {
        if (promoters.isEmpty) {
          return const Center(
            child: Text('No promoters', style: TextStyle(color: _muted)),
          );
        }
        return ListView.builder(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          itemCount: promoters.length,
          itemBuilder: (context, index) => _buildPromoterCard(promoters[index]),
        );
      },
    );
  }

  Widget _buildPromoterCard(Promoter promoter) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: _cardBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _border),
      ),
      child: Row(
        children: [
          // Left side: Name, phone, email
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  promoter.name,
                  style: const TextStyle(
                    color: _foreground,
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if (promoter.phone != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    promoter.phone!,
                    style: const TextStyle(color: _muted, fontSize: 14),
                  ),
                ],
                if (promoter.email != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    promoter.email!,
                    style: const TextStyle(color: _muted, fontSize: 14),
                  ),
                ],
              ],
            ),
          ),
          // Right side: Company/Location and Remove button
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (promoter.company != null)
                Text(
                  promoter.company!,
                  style: const TextStyle(
                    color: _muted,
                    fontSize: 14,
                  ),
                ),
              if (promoter.location.isNotEmpty) ...[  
                const SizedBox(height: 2),
                Text(
                  promoter.location,
                  style: const TextStyle(
                    color: _muted,
                    fontSize: 14,
                  ),
                ),
              ],
              const SizedBox(height: 12),
              GestureDetector(
                onTap: () => _showRemoveDialog(promoter.name),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                  decoration: BoxDecoration(
                    color: _destructive,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: const Text(
                    'Remove',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildVenuesList() {
    final venuesAsync = ref.watch(venuesProvider(widget.orgId));

    return venuesAsync.when(
      loading: () => const Center(
        child: CircularProgressIndicator(color: _foreground),
      ),
      error: (error, stack) => Center(
        child: Text('Error: $error', style: const TextStyle(color: _muted)),
      ),
      data: (venues) {
        if (venues.isEmpty) {
          return const Center(
            child: Text('No venues', style: TextStyle(color: _muted)),
          );
        }
        return ListView.builder(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          itemCount: venues.length,
          itemBuilder: (context, index) => _buildVenueCard(venues[index]),
        );
      },
    );
  }

  Widget _buildVenueCard(Venue venue) {
    final hasPromoters = venue.promoterNames.isNotEmpty;
    final promoterText = hasPromoters
        ? venue.promoterNames.length > 1
            ? '${venue.promoterNames.first} +${venue.promoterNames.length - 1} more'
            : venue.promoterNames.first
        : null;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: _cardBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _border),
      ),
      child: Row(
        children: [
          // Left side: Name, location, promoters
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  venue.name,
                  style: const TextStyle(
                    color: _foreground,
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if (venue.location.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    venue.location,
                    style: const TextStyle(color: _muted, fontSize: 14),
                  ),
                ],
                if (promoterText != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    promoterText,
                    style: const TextStyle(color: _muted, fontSize: 14),
                  ),
                ],
              ],
            ),
          ),
          // Right side: Contact info and Remove button
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (venue.phone != null)
                Text(
                  venue.phone!,
                  style: const TextStyle(
                    color: _muted,
                    fontSize: 14,
                  ),
                ),
              if (venue.email != null) ...[
                const SizedBox(height: 2),
                Text(
                  venue.email!,
                  style: const TextStyle(
                    color: _muted,
                    fontSize: 14,
                  ),
                ),
              ],
              const SizedBox(height: 12),
              GestureDetector(
                onTap: () => _showRemoveDialog(venue.name),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                  decoration: BoxDecoration(
                    color: _destructive,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: const Text(
                    'Remove',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _showRemoveDialog(String name) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: _cardBg,
        title: const Text('Remove', style: TextStyle(color: _foreground)),
        content: Text(
          'Are you sure you want to remove $name?',
          style: const TextStyle(color: _muted),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel', style: TextStyle(color: _muted)),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              // TODO: Implement remove functionality
            },
            child: const Text('Remove', style: TextStyle(color: _destructive)),
          ),
        ],
      ),
    );
  }
}
