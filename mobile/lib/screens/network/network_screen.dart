import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../theme/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../components/components.dart';
import '../show_day/widgets/detail_screen.dart';
import 'edit_person_screen.dart';
import 'edit_promoter_screen.dart';
import 'edit_venue_screen.dart';

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
  final String? notes;
  final bool isVirtual;

  TeamMember({
    required this.id,
    required this.name,
    this.phone,
    this.email,
    this.memberType,
    this.userId,
    this.notes,
    this.isVirtual = false,
  });

  factory TeamMember.fromJson(Map<String, dynamic> json) {
    return TeamMember(
      id: json['id'] as String,
      name: json['name'] as String? ?? 'Unknown',
      phone: json['phone'] as String?,
      email: json['email'] as String?,
      memberType: json['member_type'] as String?,
      userId: json['user_id'] as String?,
      notes: json['notes'] as String?,
    );
  }

  bool get isActive => userId != null;

  bool get isOwner => (memberType ?? '').toLowerCase() == 'owner';
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
  final String? notes;
  final List<String> venueNames;

  Promoter({
    required this.id,
    required this.name,
    this.phone,
    this.email,
    this.company,
    this.city,
    this.country,
    this.notes,
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
      notes: json['notes'] as String?,
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
  final String? notes;
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
    this.notes,
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
      notes: json['notes'] as String?,
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
  final currentUser = ref.watch(currentUserProvider);
  
  final response = await supabase.rpc('get_org_people', params: {'p_org_id': orgId});
  final List<dynamic> data = response as List<dynamic>;
  final members = data
      .map((json) => TeamMember.fromJson(json as Map<String, dynamic>))
      .toList();

  // Ensure the signed-in user (typically the org owner) shows up in the list.
  if (currentUser != null) {
    final alreadyIncluded = members.any((m) => m.userId == currentUser.id);
    if (!alreadyIncluded) {
      final fullName = currentUser.userMetadata?['full_name'] as String?;
      final displayName = (fullName != null && fullName.trim().isNotEmpty)
          ? fullName.trim()
          : (currentUser.email ?? 'You');

      return [
        TeamMember(
          id: currentUser.id,
          name: displayName,
          email: currentUser.email,
          memberType: 'Owner',
          userId: currentUser.id,
          isVirtual: true,
        ),
        ...members,
      ];
    }
  }

  return members;
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
        builder: (context) => _TeamMemberDetailScreen(
          member: member,
          orgId: widget.orgId,
          onDeleted: () {
            ref.invalidate(teamMembersProvider(widget.orgId));
          },
        ),
      ),
    );
  }

  Widget _buildTeamCard(TeamMember member) {
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;
    final currentUserId = ref.watch(currentUserProvider)?.id;
    final isSelf = currentUserId != null && member.userId == currentUserId;
    final showOwnerLabel = member.isOwner || (member.isVirtual && isSelf);
    
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
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (showOwnerLabel)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppTheme.getForegroundColor(brightness),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      'Owner',
                      style: TextStyle(
                        color: AppTheme.getBackgroundColor(brightness),
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                if (showOwnerLabel && member.memberType != null && member.memberType!.toLowerCase() != 'owner')
                  const SizedBox(width: 8),
                if (member.memberType != null && member.memberType!.toLowerCase() != 'owner')
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
        builder: (context) => _PromoterDetailScreen(
          promoter: promoter,
          orgId: widget.orgId,
          onDeleted: () {
            ref.invalidate(promotersProvider(widget.orgId));
          },
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
        builder: (context) => _VenueDetailScreen(
          venue: venue,
          orgId: widget.orgId,
          onDeleted: () {
            ref.invalidate(venuesProvider(widget.orgId));
          },
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

/// Detail screen for a team member with delete functionality
class _TeamMemberDetailScreen extends ConsumerStatefulWidget {
  final TeamMember member;
  final String orgId;
  final VoidCallback? onDeleted;

  const _TeamMemberDetailScreen({
    required this.member,
    required this.orgId,
    this.onDeleted,
  });

  @override
  ConsumerState<_TeamMemberDetailScreen> createState() => _TeamMemberDetailScreenState();
}

class _TeamMemberDetailScreenState extends ConsumerState<_TeamMemberDetailScreen> {
  bool _isDeleting = false;

  void _openEditScreen() {
    Navigator.of(context).push(
      SwipeablePageRoute(
        builder: (context) => EditPersonScreen(
          orgId: widget.orgId,
          member: widget.member,
        ),
      ),
    ).then((_) {
      // Refresh the team members list when returning from edit
      ref.invalidate(teamMembersProvider(widget.orgId));
    });
  }

  Future<void> _deleteMember() async {
    // Show confirmation dialog
    final confirmed = await showCupertinoDialog<bool>(
      context: context,
      builder: (context) => CupertinoAlertDialog(
        title: const Text('Remove Team Member'),
        content: Text('Are you sure you want to remove ${widget.member.name} from your organization?'),
        actions: [
          CupertinoButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          CupertinoButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text(
              'Remove',
              style: TextStyle(color: CupertinoColors.destructiveRed),
            ),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() => _isDeleting = true);

    try {
      final supabase = ref.read(supabaseClientProvider);

      // Use RPC function to delete the person
      await supabase.rpc('app_delete_person', params: {
        'p_person_id': widget.member.id,
      });

      if (mounted) {
        widget.onDeleted?.call();
        Navigator.of(context).pop();
        AppToast.success(context, '${widget.member.name} removed successfully');
      }
    } catch (e) {
      if (mounted) {
        AppToast.error(context, 'Failed to remove team member: $e');
      }
    } finally {
      if (mounted) {
        setState(() => _isDeleting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;
    final isOwner = widget.member.isOwner;
    final canRemove = !isOwner && !widget.member.isVirtual;

    return Stack(
      children: [
        DetailScreen(
          title: widget.member.name,
          items: [
            DetailItem(
              label: 'Name',
              value: widget.member.name,
              icon: CupertinoIcons.person,
            ),
            if (widget.member.memberType != null)
              DetailItem(
                label: 'Member Type',
                value: widget.member.memberType,
                icon: CupertinoIcons.person_badge_plus,
              ),
            if (widget.member.phone != null)
              DetailItem(
                label: 'Phone',
                value: widget.member.phone,
                icon: CupertinoIcons.phone,
                type: DetailItemType.phone,
              ),
            if (widget.member.email != null)
              DetailItem(
                label: 'Email',
                value: widget.member.email,
                icon: CupertinoIcons.mail,
                type: DetailItemType.email,
              ),
            DetailItem(
              label: 'Status',
              value: widget.member.isActive ? 'Active (has account)' : 'Pending',
              icon: CupertinoIcons.info,
            ),
          ],
          trailing: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Edit button
              GestureDetector(
                onTap: _openEditScreen,
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                  decoration: BoxDecoration(
                    color: AppTheme.getForegroundColor(brightness),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Center(
                    child: Text(
                      'Edit',
                      style: TextStyle(
                        color: AppTheme.getBackgroundColor(brightness),
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              ),
              if (canRemove) ...[
                const SizedBox(height: 12),
                // Delete button
                GestureDetector(
                  onTap: _isDeleting ? null : _deleteMember,
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                    decoration: BoxDecoration(
                      color: AppTheme.getDestructiveColor(brightness),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Center(
                      child: _isDeleting
                          ? const CupertinoActivityIndicator(color: CupertinoColors.white)
                          : const Text(
                              'Remove from Organization',
                              style: TextStyle(
                                color: CupertinoColors.white,
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
        if (_isDeleting)
          Container(
            color: AppTheme.getBackgroundColor(brightness).withValues(alpha: 0.5),
            child: Center(
              child: CupertinoActivityIndicator(color: AppTheme.getForegroundColor(brightness)),
            ),
          ),
      ],
    );
  }
}

/// Detail screen for a promoter with delete functionality
class _PromoterDetailScreen extends ConsumerStatefulWidget {
  final Promoter promoter;
  final String orgId;
  final VoidCallback? onDeleted;

  const _PromoterDetailScreen({
    required this.promoter,
    required this.orgId,
    this.onDeleted,
  });

  @override
  ConsumerState<_PromoterDetailScreen> createState() => _PromoterDetailScreenState();
}

class _PromoterDetailScreenState extends ConsumerState<_PromoterDetailScreen> {
  bool _isDeleting = false;

  void _openEditScreen() {
    Navigator.of(context).push(
      SwipeablePageRoute(
        builder: (context) => EditPromoterScreen(
          orgId: widget.orgId,
          promoter: widget.promoter,
        ),
      ),
    ).then((_) {
      // Refresh the promoters list when returning from edit
      ref.invalidate(promotersProvider(widget.orgId));
    });
  }

  Future<void> _deletePromoter() async {
    // Show confirmation dialog
    final confirmed = await showCupertinoDialog<bool>(
      context: context,
      builder: (context) => CupertinoAlertDialog(
        title: const Text('Remove Promoter'),
        content: Text('Are you sure you want to remove ${widget.promoter.name} from your organization?'),
        actions: [
          CupertinoButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          CupertinoButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text(
              'Remove',
              style: TextStyle(color: CupertinoColors.destructiveRed),
            ),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() => _isDeleting = true);

    try {
      final supabase = ref.read(supabaseClientProvider);

      // Use RPC function to delete the promoter
      final result = await supabase.rpc('app_delete_promoter', params: {
        'p_promoter_id': widget.promoter.id,
      });

      // Check if the result indicates an error (e.g., has shows)
      if (result is Map && result['success'] == false) {
        if (mounted) {
          AppToast.error(context, result['error'] ?? 'Failed to remove promoter');
        }
        return;
      }

      if (mounted) {
        widget.onDeleted?.call();
        Navigator.of(context).pop();
        AppToast.success(context, '${widget.promoter.name} removed successfully');
      }
    } catch (e) {
      if (mounted) {
        AppToast.error(context, 'Failed to remove promoter: $e');
      }
    } finally {
      if (mounted) {
        setState(() => _isDeleting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;

    return Stack(
      children: [
        DetailScreen(
          title: widget.promoter.name,
          items: [
            DetailItem(
              label: 'Name',
              value: widget.promoter.name,
              icon: CupertinoIcons.person,
            ),
            if (widget.promoter.company != null)
              DetailItem(
                label: 'Company',
                value: widget.promoter.company,
                icon: CupertinoIcons.building_2_fill,
              ),
            if (widget.promoter.location.isNotEmpty)
              DetailItem(
                label: 'Location',
                value: widget.promoter.location,
                icon: CupertinoIcons.location,
              ),
            if (widget.promoter.phone != null)
              DetailItem(
                label: 'Phone',
                value: widget.promoter.phone,
                icon: CupertinoIcons.phone,
                type: DetailItemType.phone,
              ),
            if (widget.promoter.email != null)
              DetailItem(
                label: 'Email',
                value: widget.promoter.email,
                icon: CupertinoIcons.mail,
                type: DetailItemType.email,
              ),
            if (widget.promoter.venueNames.isNotEmpty)
              DetailItem(
                label: 'Venues',
                value: widget.promoter.venueNames.join(', '),
                icon: CupertinoIcons.placemark,
              ),
          ],
          trailing: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Edit button
              GestureDetector(
                onTap: _openEditScreen,
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                  decoration: BoxDecoration(
                    color: AppTheme.getForegroundColor(brightness),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Center(
                    child: Text(
                      'Edit',
                      style: TextStyle(
                        color: AppTheme.getBackgroundColor(brightness),
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              // Delete button
              GestureDetector(
                onTap: _isDeleting ? null : _deletePromoter,
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                  decoration: BoxDecoration(
                    color: AppTheme.getDestructiveColor(brightness),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Center(
                    child: _isDeleting
                        ? const CupertinoActivityIndicator(color: CupertinoColors.white)
                        : const Text(
                            'Remove from Organization',
                            style: TextStyle(
                              color: CupertinoColors.white,
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                  ),
                ),
              ),
            ],
          ),
        ),
        if (_isDeleting)
          Container(
            color: AppTheme.getBackgroundColor(brightness).withValues(alpha: 0.5),
            child: Center(
              child: CupertinoActivityIndicator(color: AppTheme.getForegroundColor(brightness)),
            ),
          ),
      ],
    );
  }
}

/// Detail screen for a venue with delete functionality
class _VenueDetailScreen extends ConsumerStatefulWidget {
  final Venue venue;
  final String orgId;
  final VoidCallback? onDeleted;

  const _VenueDetailScreen({
    required this.venue,
    required this.orgId,
    this.onDeleted,
  });

  @override
  ConsumerState<_VenueDetailScreen> createState() => _VenueDetailScreenState();
}

class _VenueDetailScreenState extends ConsumerState<_VenueDetailScreen> {
  bool _isDeleting = false;

  void _openEditScreen() {
    Navigator.of(context).push(
      SwipeablePageRoute(
        builder: (context) => EditVenueScreen(
          orgId: widget.orgId,
          venue: widget.venue,
        ),
      ),
    ).then((_) {
      // Refresh the venues list when returning from edit
      ref.invalidate(venuesProvider(widget.orgId));
    });
  }

  Future<void> _deleteVenue() async {
    // Show confirmation dialog
    final confirmed = await showCupertinoDialog<bool>(
      context: context,
      builder: (context) => CupertinoAlertDialog(
        title: const Text('Remove Venue'),
        content: Text('Are you sure you want to remove ${widget.venue.name} from your organization?'),
        actions: [
          CupertinoButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          CupertinoButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text(
              'Remove',
              style: TextStyle(color: CupertinoColors.destructiveRed),
            ),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() => _isDeleting = true);

    try {
      final supabase = ref.read(supabaseClientProvider);

      // Use RPC function to delete the venue
      final result = await supabase.rpc('delete_venue', params: {
        'p_venue_id': widget.venue.id,
      });

      // Check if the result indicates an error (e.g., has shows)
      if (result is Map && result['success'] == false) {
        if (mounted) {
          AppToast.error(context, result['error'] ?? 'Failed to remove venue');
        }
        return;
      }

      if (mounted) {
        widget.onDeleted?.call();
        Navigator.of(context).pop();
        AppToast.success(context, '${widget.venue.name} removed successfully');
      }
    } catch (e) {
      if (mounted) {
        AppToast.error(context, 'Failed to remove venue: $e');
      }
    } finally {
      if (mounted) {
        setState(() => _isDeleting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;

    return Stack(
      children: [
        DetailScreen(
          title: widget.venue.name,
          items: [
            DetailItem(
              label: 'Name',
              value: widget.venue.name,
              icon: CupertinoIcons.placemark,
            ),
            if (widget.venue.location.isNotEmpty)
              DetailItem(
                label: 'Location',
                value: widget.venue.location,
                icon: CupertinoIcons.location,
              ),
            if (widget.venue.address != null)
              DetailItem(
                label: 'Address',
                value: widget.venue.address,
                icon: CupertinoIcons.house,
              ),
            if (widget.venue.capacity != null)
              DetailItem(
                label: 'Capacity',
                value: '${widget.venue.capacity}',
                icon: CupertinoIcons.person_3,
              ),
            if (widget.venue.phone != null)
              DetailItem(
                label: 'Phone',
                value: widget.venue.phone,
                icon: CupertinoIcons.phone,
                type: DetailItemType.phone,
              ),
            if (widget.venue.email != null)
              DetailItem(
                label: 'Email',
                value: widget.venue.email,
                icon: CupertinoIcons.mail,
                type: DetailItemType.email,
              ),
            if (widget.venue.promoterNames.isNotEmpty)
              DetailItem(
                label: 'Promoters',
                value: widget.venue.promoterNames.join(', '),
                icon: CupertinoIcons.person,
              ),
            if (widget.venue.showCount > 0)
              DetailItem(
                label: 'Shows',
                value: '${widget.venue.showCount} shows',
                icon: CupertinoIcons.calendar,
              ),
          ],
          trailing: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Edit button
              GestureDetector(
                onTap: _openEditScreen,
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                  decoration: BoxDecoration(
                    color: AppTheme.getForegroundColor(brightness),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Center(
                    child: Text(
                      'Edit',
                      style: TextStyle(
                        color: AppTheme.getBackgroundColor(brightness),
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              // Delete button
              GestureDetector(
                onTap: _isDeleting ? null : _deleteVenue,
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                  decoration: BoxDecoration(
                    color: AppTheme.getDestructiveColor(brightness),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Center(
                    child: _isDeleting
                        ? const CupertinoActivityIndicator(color: CupertinoColors.white)
                        : const Text(
                            'Remove from Organization',
                            style: TextStyle(
                              color: CupertinoColors.white,
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                  ),
                ),
              ),
            ],
          ),
        ),
        if (_isDeleting)
          Container(
            color: AppTheme.getBackgroundColor(brightness).withValues(alpha: 0.5),
            child: Center(
              child: CupertinoActivityIndicator(color: AppTheme.getForegroundColor(brightness)),
            ),
          ),
      ],
    );
  }
}
