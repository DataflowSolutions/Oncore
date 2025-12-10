import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../theme/app_theme.dart';
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
  final String searchQuery;
  final String? memberTypeFilter;

  const NetworkContent({
    super.key,
    required this.orgId,
    required this.orgName,
    this.activeTab = NetworkTab.team,
    this.onTabChanged,
    this.searchQuery = '',
    this.memberTypeFilter,
  });

  @override
  ConsumerState<NetworkContent> createState() => _NetworkContentState();
}

class _NetworkContentState extends ConsumerState<NetworkContent> {
  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Title
        _buildTitle(),
        const SizedBox(height: 12),
        // Content
        Expanded(
          child: _buildContent(),
        ),
      ],
    );
  }

  Widget _buildTitle() {
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;
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
            color: AppTheme.getForegroundColor(brightness),
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
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;

    return teamAsync.when(
      loading: () => Center(
        child: CupertinoActivityIndicator(color: AppTheme.getForegroundColor(brightness)),
      ),
      error: (error, stack) => Center(
        child: Text('Error: $error', style: TextStyle(color: AppTheme.getMutedForegroundColor(brightness))),
      ),
      data: (members) {
        var filtered = members;
        
        // Apply member type filter first
        if (widget.memberTypeFilter != null) {
          filtered = filtered.where((m) => m.memberType?.toLowerCase() == widget.memberTypeFilter).toList();
        }
        
        // Then apply search query
        if (widget.searchQuery.isNotEmpty) {
          final query = widget.searchQuery.toLowerCase();
          filtered = filtered.where((m) =>
              m.name.toLowerCase().contains(query) ||
              (m.phone?.toLowerCase().contains(query) ?? false) ||
              (m.email?.toLowerCase().contains(query) ?? false) ||
              (m.memberType?.toLowerCase().contains(query) ?? false)
            ).toList();
        }

        if (filtered.isEmpty) {
          return Center(
            child: Text(
              widget.searchQuery.isEmpty && widget.memberTypeFilter == null ? 'No team members' : 'No results match your search',
              style: TextStyle(color: AppTheme.getMutedForegroundColor(brightness)),
            ),
          );
        }
        return ListView.builder(
          padding: const EdgeInsets.only(left: 16, right: 16, bottom: 75),
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
              icon: CupertinoIcons.person,
            ),
            if (member.memberType != null)
              DetailItem(
                label: 'Member Type',
                value: member.memberType,
                icon: CupertinoIcons.person_badge_plus,
              ),
            if (member.phone != null)
              DetailItem(
                label: 'Phone',
                value: member.phone,
                icon: CupertinoIcons.phone,
                type: DetailItemType.phone,
              ),
            if (member.email != null)
              DetailItem(
                label: 'Email',
                value: member.email,
                icon: CupertinoIcons.mail,
                type: DetailItemType.email,
              ),
            DetailItem(
              label: 'Status',
              value: member.isActive ? 'Active (has account)' : 'Pending',
              icon: CupertinoIcons.info,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTeamCard(TeamMember member) {
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;
    
    return GestureDetector(
      onTap: () => _openTeamMemberDetail(member),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: AppTheme.getCardColor(brightness),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.getCardBorderColor(brightness)),
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
                      color: AppTheme.getForegroundColor(brightness),
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 3),
                  if (member.phone != null)
                    Text(
                      member.phone!,
                      style: TextStyle(color: AppTheme.getMutedForegroundColor(brightness), fontSize: 13),
                    )
                  else if (member.email != null)
                    Text(
                      member.email!,
                      style: TextStyle(color: AppTheme.getMutedForegroundColor(brightness), fontSize: 13),
                    ),
                ],
              ),
            ),
            // Right side: Member type badge only
            if (member.memberType != null)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color: AppTheme.getForegroundColor(brightness),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  member.memberType!,
                  style: TextStyle(
                    color: AppTheme.getBackgroundColor(brightness),
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
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;

    return promotersAsync.when(
      loading: () => Center(
        child: CupertinoActivityIndicator(color: AppTheme.getForegroundColor(brightness)),
      ),
      error: (error, stack) => Center(
        child: Text('Error: $error', style: TextStyle(color: AppTheme.getMutedForegroundColor(brightness))),
      ),
      data: (promoters) {
        var filtered = promoters;
        
        // Apply search query
        if (widget.searchQuery.isNotEmpty) {
          final query = widget.searchQuery.toLowerCase();
          filtered = filtered.where((p) =>
              p.name.toLowerCase().contains(query) ||
              (p.company?.toLowerCase().contains(query) ?? false) ||
              (p.email?.toLowerCase().contains(query) ?? false) ||
              p.location.toLowerCase().contains(query) ||
              p.venueNames.any((v) => v.toLowerCase().contains(query))
            ).toList();
        }
        
        if (filtered.isEmpty) {
          return Center(
            child: Text(
              widget.searchQuery.isEmpty ? 'No promoters' : 'No results match your search',
              style: TextStyle(color: AppTheme.getMutedForegroundColor(brightness)),
            ),
          );
        }
        return ListView.builder(
          padding: const EdgeInsets.only(left: 16, right: 16, bottom: 75),
          itemCount: filtered.length,
          itemBuilder: (context, index) => _buildPromoterCard(filtered[index]),
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
              icon: CupertinoIcons.person,
            ),
            if (promoter.company != null)
              DetailItem(
                label: 'Company',
                value: promoter.company,
                icon: CupertinoIcons.building_2_fill,
              ),
            if (promoter.location.isNotEmpty)
              DetailItem(
                label: 'Location',
                value: promoter.location,
                icon: CupertinoIcons.location,
              ),
            if (promoter.phone != null)
              DetailItem(
                label: 'Phone',
                value: promoter.phone,
                icon: CupertinoIcons.phone,
                type: DetailItemType.phone,
              ),
            if (promoter.email != null)
              DetailItem(
                label: 'Email',
                value: promoter.email,
                icon: CupertinoIcons.mail,
                type: DetailItemType.email,
              ),
            if (promoter.venueNames.isNotEmpty)
              DetailItem(
                label: 'Venues',
                value: promoter.venueNames.join(', '),
                icon: CupertinoIcons.placemark,
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildPromoterCard(Promoter promoter) {
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;
    
    return GestureDetector(
      onTap: () => _openPromoterDetail(promoter),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: AppTheme.getCardColor(brightness),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.getCardBorderColor(brightness)),
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
                      color: AppTheme.getForegroundColor(brightness),
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    promoter.company ?? promoter.location,
                    style: TextStyle(color: AppTheme.getMutedForegroundColor(brightness), fontSize: 13),
                  ),
                ],
              ),
            ),
            // Right side: Location
            if (promoter.location.isNotEmpty && promoter.company != null)
              Text(
                promoter.location,
                style: TextStyle(color: AppTheme.getMutedForegroundColor(brightness), fontSize: 13),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildVenuesList() {
    final venuesAsync = ref.watch(venuesProvider(widget.orgId));
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;

    return venuesAsync.when(
      loading: () => Center(
        child: CupertinoActivityIndicator(color: AppTheme.getForegroundColor(brightness)),
      ),
      error: (error, stack) => Center(
        child: Text('Error: $error', style: TextStyle(color: AppTheme.getMutedForegroundColor(brightness))),
      ),
      data: (venues) {
        var filtered = venues;
        
        // Apply search query
        if (widget.searchQuery.isNotEmpty) {
          final query = widget.searchQuery.toLowerCase();
          filtered = filtered.where((v) =>
              v.name.toLowerCase().contains(query) ||
              v.location.toLowerCase().contains(query) ||
              (v.address?.toLowerCase().contains(query) ?? false) ||
              v.promoterNames.any((p) => p.toLowerCase().contains(query))
            ).toList();
        }
        
        if (filtered.isEmpty) {
          return Center(
            child: Text(
              widget.searchQuery.isEmpty ? 'No venues' : 'No results match your search',
              style: TextStyle(color: AppTheme.getMutedForegroundColor(brightness)),
            ),
          );
        }
        return ListView.builder(
          padding: const EdgeInsets.only(left: 16, right: 16, bottom: 75),
          itemCount: filtered.length,
          itemBuilder: (context, index) => _buildVenueCard(filtered[index]),
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
              icon: CupertinoIcons.placemark,
            ),
            if (venue.location.isNotEmpty)
              DetailItem(
                label: 'Location',
                value: venue.location,
                icon: CupertinoIcons.location,
              ),
            if (venue.address != null)
              DetailItem(
                label: 'Address',
                value: venue.address,
                icon: CupertinoIcons.house,
              ),
            if (venue.capacity != null)
              DetailItem(
                label: 'Capacity',
                value: '${venue.capacity}',
                icon: CupertinoIcons.person_3,
              ),
            if (venue.phone != null)
              DetailItem(
                label: 'Phone',
                value: venue.phone,
                icon: CupertinoIcons.phone,
                type: DetailItemType.phone,
              ),
            if (venue.email != null)
              DetailItem(
                label: 'Email',
                value: venue.email,
                icon: CupertinoIcons.mail,
                type: DetailItemType.email,
              ),
            if (venue.promoterNames.isNotEmpty)
              DetailItem(
                label: 'Promoters',
                value: venue.promoterNames.join(', '),
                icon: CupertinoIcons.person,
              ),
            if (venue.showCount > 0)
              DetailItem(
                label: 'Shows',
                value: '${venue.showCount} shows',
                icon: CupertinoIcons.calendar,
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildVenueCard(Venue venue) {
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;

    return GestureDetector(
      onTap: () => _openVenueDetail(venue),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: AppTheme.getCardColor(brightness),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.getCardBorderColor(brightness)),
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
                      color: AppTheme.getForegroundColor(brightness),
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  if (venue.location.isNotEmpty) ...[
                    const SizedBox(height: 3),
                    Text(
                      venue.location,
                      style: TextStyle(color: AppTheme.getMutedForegroundColor(brightness), fontSize: 13),
                    ),
                  ],
                ],
              ),
            ),
            // Right side: Show count if available
            if (venue.showCount > 0)
              Text(
                '${venue.showCount} shows',
                style: TextStyle(color: AppTheme.getMutedForegroundColor(brightness), fontSize: 13),
              ),
          ],
        ),
      ),
    );
  }

  void _showRemoveDialog(String name) {
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;
    
    showCupertinoDialog(
      context: context,
      builder: (context) => CupertinoAlertDialog(
        title: Text('Remove', style: TextStyle(color: AppTheme.getForegroundColor(brightness))),
        content: Text(
          'Are you sure you want to remove $name?',
          style: TextStyle(color: AppTheme.getMutedForegroundColor(brightness)),
        ),
        actions: [
          CupertinoButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cancel', style: TextStyle(color: AppTheme.getMutedForegroundColor(brightness))),
          ),
          CupertinoButton(
            onPressed: () {
              Navigator.pop(context);
              // TODO: Implement remove functionality
            },
            child: Text('Remove', style: TextStyle(color: AppTheme.getDestructiveColor(brightness))),
          ),
        ],
      ),
    );
  }
}
