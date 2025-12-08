import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/auth_provider.dart';
import '../../components/components.dart';
import '../show_day/widgets/detail_screen.dart';

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
  final _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Title
        _buildTitle(),
        const SizedBox(height: 12),
        // Search bar
        _buildSearchBar(),
        const SizedBox(height: 12),
        // Content
        Expanded(
          child: _buildContent(),
        ),
      ],
    );
  }

  Widget _buildSearchBar() {
    final colorScheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: TextField(
        controller: _searchController,
        style: TextStyle(color: colorScheme.onSurface, fontSize: 15),
        decoration: InputDecoration(
          hintText: 'Search...',
          hintStyle: TextStyle(color: colorScheme.onSurfaceVariant.withValues(alpha: 0.6)),
          prefixIcon: Icon(Icons.search, color: colorScheme.onSurfaceVariant, size: 20),
          filled: true,
          fillColor: colorScheme.surfaceContainerHigh,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide.none,
          ),
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        ),
        onChanged: (value) {
          setState(() {
            _searchQuery = value.toLowerCase();
          });
        },
      ),
    );
  }

  Widget _buildTitle() {
    final colorScheme = Theme.of(context).colorScheme;
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
          style: TextStyle(
            color: colorScheme.onSurface,
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
    final colorScheme = Theme.of(context).colorScheme;

    return teamAsync.when(
      loading: () => Center(
        child: CircularProgressIndicator(color: colorScheme.onSurface),
      ),
      error: (error, stack) => Center(
        child: Text('Error: $error', style: TextStyle(color: colorScheme.onSurfaceVariant)),
      ),
      data: (members) {
        // Filter by search query
        final filtered = _searchQuery.isEmpty
            ? members
            : members.where((m) =>
                m.name.toLowerCase().contains(_searchQuery) ||
                (m.phone?.toLowerCase().contains(_searchQuery) ?? false) ||
                (m.email?.toLowerCase().contains(_searchQuery) ?? false) ||
                (m.memberType?.toLowerCase().contains(_searchQuery) ?? false)
              ).toList();

        if (filtered.isEmpty) {
          return Center(
            child: Text(
              _searchQuery.isEmpty ? 'No team members' : 'No results match your search',
              style: TextStyle(color: colorScheme.onSurfaceVariant),
            ),
          );
        }
        return ListView.builder(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          itemCount: filtered.length,
          itemBuilder: (context, index) => _buildTeamCard(filtered[index]),
        );
      },
    );
  }

  void _openTeamMemberDetail(TeamMember member) {
    Navigator.of(context).push(
      SwipeablePageRoute(
        builder: (context) => DetailScreen(
          title: member.name,
          items: [
            DetailItem(
              label: 'Name',
              value: member.name,
              icon: Icons.person_outline,
            ),
            if (member.memberType != null)
              DetailItem(
                label: 'Member Type',
                value: member.memberType,
                icon: Icons.badge_outlined,
              ),
            if (member.phone != null)
              DetailItem(
                label: 'Phone',
                value: member.phone,
                icon: Icons.phone_outlined,
                type: DetailItemType.phone,
              ),
            if (member.email != null)
              DetailItem(
                label: 'Email',
                value: member.email,
                icon: Icons.email_outlined,
                type: DetailItemType.email,
              ),
            DetailItem(
              label: 'Status',
              value: member.isActive ? 'Active (has account)' : 'Pending',
              icon: Icons.info_outline,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTeamCard(TeamMember member) {
    final colorScheme = Theme.of(context).colorScheme;
    
    return GestureDetector(
      onTap: () => _openTeamMemberDetail(member),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: colorScheme.surfaceContainer,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: colorScheme.outline),
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
                    style: TextStyle(
                      color: colorScheme.onSurface,
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 3),
                  if (member.phone != null)
                    Text(
                      member.phone!,
                      style: TextStyle(color: colorScheme.onSurfaceVariant, fontSize: 13),
                    )
                  else if (member.email != null)
                    Text(
                      member.email!,
                      style: TextStyle(color: colorScheme.onSurfaceVariant, fontSize: 13),
                    ),
                ],
              ),
            ),
            // Right side: Member type badge only
            if (member.memberType != null)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color: colorScheme.onSurface,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  member.memberType!,
                  style: TextStyle(
                    color: colorScheme.surface,
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildPromotersList() {
    final promotersAsync = ref.watch(promotersProvider(widget.orgId));
    final colorScheme = Theme.of(context).colorScheme;

    return promotersAsync.when(
      loading: () => Center(
        child: CircularProgressIndicator(color: colorScheme.onSurface),
      ),
      error: (error, stack) => Center(
        child: Text('Error: $error', style: TextStyle(color: colorScheme.onSurfaceVariant)),
      ),
      data: (promoters) {
        if (promoters.isEmpty) {
          return Center(
            child: Text('No promoters', style: TextStyle(color: colorScheme.onSurfaceVariant)),
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

  void _openPromoterDetail(Promoter promoter) {
    Navigator.of(context).push(
      SwipeablePageRoute(
        builder: (context) => DetailScreen(
          title: promoter.name,
          items: [
            DetailItem(
              label: 'Name',
              value: promoter.name,
              icon: Icons.person_outline,
            ),
            if (promoter.company != null)
              DetailItem(
                label: 'Company',
                value: promoter.company,
                icon: Icons.business_outlined,
              ),
            if (promoter.location.isNotEmpty)
              DetailItem(
                label: 'Location',
                value: promoter.location,
                icon: Icons.location_on_outlined,
              ),
            if (promoter.phone != null)
              DetailItem(
                label: 'Phone',
                value: promoter.phone,
                icon: Icons.phone_outlined,
                type: DetailItemType.phone,
              ),
            if (promoter.email != null)
              DetailItem(
                label: 'Email',
                value: promoter.email,
                icon: Icons.email_outlined,
                type: DetailItemType.email,
              ),
            if (promoter.venueNames.isNotEmpty)
              DetailItem(
                label: 'Venues',
                value: promoter.venueNames.join(', '),
                icon: Icons.place_outlined,
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildPromoterCard(Promoter promoter) {
    final colorScheme = Theme.of(context).colorScheme;
    
    return GestureDetector(
      onTap: () => _openPromoterDetail(promoter),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: colorScheme.surfaceContainer,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: colorScheme.outline),
        ),
        child: Row(
          children: [
            // Left side: Name and contact
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    promoter.name,
                    style: TextStyle(
                      color: colorScheme.onSurface,
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    promoter.company ?? promoter.location,
                    style: TextStyle(color: colorScheme.onSurfaceVariant, fontSize: 13),
                  ),
                ],
              ),
            ),
            // Right side: Location
            if (promoter.location.isNotEmpty && promoter.company != null)
              Text(
                promoter.location,
                style: TextStyle(color: colorScheme.onSurfaceVariant, fontSize: 13),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildVenuesList() {
    final venuesAsync = ref.watch(venuesProvider(widget.orgId));
    final colorScheme = Theme.of(context).colorScheme;

    return venuesAsync.when(
      loading: () => Center(
        child: CircularProgressIndicator(color: colorScheme.onSurface),
      ),
      error: (error, stack) => Center(
        child: Text('Error: $error', style: TextStyle(color: colorScheme.onSurfaceVariant)),
      ),
      data: (venues) {
        if (venues.isEmpty) {
          return Center(
            child: Text('No venues', style: TextStyle(color: colorScheme.onSurfaceVariant)),
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

  void _openVenueDetail(Venue venue) {
    Navigator.of(context).push(
      SwipeablePageRoute(
        builder: (context) => DetailScreen(
          title: venue.name,
          items: [
            DetailItem(
              label: 'Name',
              value: venue.name,
              icon: Icons.place_outlined,
            ),
            if (venue.location.isNotEmpty)
              DetailItem(
                label: 'Location',
                value: venue.location,
                icon: Icons.location_on_outlined,
              ),
            if (venue.address != null)
              DetailItem(
                label: 'Address',
                value: venue.address,
                icon: Icons.home_outlined,
              ),
            if (venue.capacity != null)
              DetailItem(
                label: 'Capacity',
                value: '${venue.capacity}',
                icon: Icons.people_outline,
              ),
            if (venue.phone != null)
              DetailItem(
                label: 'Phone',
                value: venue.phone,
                icon: Icons.phone_outlined,
                type: DetailItemType.phone,
              ),
            if (venue.email != null)
              DetailItem(
                label: 'Email',
                value: venue.email,
                icon: Icons.email_outlined,
                type: DetailItemType.email,
              ),
            if (venue.promoterNames.isNotEmpty)
              DetailItem(
                label: 'Promoters',
                value: venue.promoterNames.join(', '),
                icon: Icons.person_outline,
              ),
            if (venue.showCount > 0)
              DetailItem(
                label: 'Shows',
                value: '${venue.showCount} shows',
                icon: Icons.event_outlined,
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildVenueCard(Venue venue) {
    final colorScheme = Theme.of(context).colorScheme;

    return GestureDetector(
      onTap: () => _openVenueDetail(venue),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: colorScheme.surfaceContainer,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: colorScheme.outline),
        ),
        child: Row(
          children: [
            // Left side: Name and location
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    venue.name,
                    style: TextStyle(
                      color: colorScheme.onSurface,
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  if (venue.location.isNotEmpty) ...[
                    const SizedBox(height: 3),
                    Text(
                      venue.location,
                      style: TextStyle(color: colorScheme.onSurfaceVariant, fontSize: 13),
                    ),
                  ],
                ],
              ),
            ),
            // Right side: Show count if available
            if (venue.showCount > 0)
              Text(
                '${venue.showCount} shows',
                style: TextStyle(color: colorScheme.onSurfaceVariant, fontSize: 13),
              ),
          ],
        ),
      ),
    );
  }

  void _showRemoveDialog(String name) {
    final colorScheme = Theme.of(context).colorScheme;
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: colorScheme.surfaceContainer,
        title: Text('Remove', style: TextStyle(color: colorScheme.onSurface)),
        content: Text(
          'Are you sure you want to remove $name?',
          style: TextStyle(color: colorScheme.onSurfaceVariant),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cancel', style: TextStyle(color: colorScheme.onSurfaceVariant)),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              // TODO: Implement remove functionality
            },
            child: Text('Remove', style: TextStyle(color: colorScheme.error)),
          ),
        ],
      ),
    );
  }
}
