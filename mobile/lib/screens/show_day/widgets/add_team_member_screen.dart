import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../components/components.dart';
import '../../../models/show_day.dart';
import '../../../providers/auth_provider.dart';
import '../../../theme/app_theme.dart';

/// Person from the people table (for selection)
class PersonOption {
  final String id;
  final String name;
  final String? email;
  final String? phone;
  final String? memberType;
  final String? roleTitle;

  PersonOption({
    required this.id,
    required this.name,
    this.email,
    this.phone,
    this.memberType,
    this.roleTitle,
  });

  factory PersonOption.fromJson(Map<String, dynamic> json) {
    return PersonOption(
      id: json['id'] as String,
      name: json['name'] as String? ?? 'Unknown',
      email: json['email'] as String?,
      phone: json['phone'] as String?,
      memberType: json['member_type'] as String?,
      roleTitle: json['role_title'] as String?,
    );
  }
}

/// Layer 3: Add team member screen - select from all people in org
class AddTeamMemberScreen extends ConsumerStatefulWidget {
  final String showId;
  final String orgId;
  final List<AssignedPerson> existingAssignments;
  final VoidCallback? onMemberAdded;

  const AddTeamMemberScreen({
    super.key,
    required this.showId,
    required this.orgId,
    required this.existingAssignments,
    this.onMemberAdded,
  });

  @override
  ConsumerState<AddTeamMemberScreen> createState() => _AddTeamMemberScreenState();
}

class _AddTeamMemberScreenState extends ConsumerState<AddTeamMemberScreen> {
  List<PersonOption> _allPeople = [];
  List<PersonOption> _filteredPeople = [];
  bool _isLoading = true;
  bool _isAdding = false;
  String _searchQuery = '';
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadPeople();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadPeople() async {
    setState(() => _isLoading = true);

    try {
      final supabase = ref.read(supabaseClientProvider);

      // Use RPC function to bypass RLS
      final response = await supabase.rpc('get_org_people', params: {
        'p_org_id': widget.orgId,
      });

      final List<dynamic> data = response as List<dynamic>;
      final allPeople = data
          .map((json) => PersonOption.fromJson(json as Map<String, dynamic>))
          .toList();

      // Filter out already assigned people
      final existingIds = widget.existingAssignments.map((a) => a.personId).toSet();
      final availablePeople = allPeople
          .where((person) => !existingIds.contains(person.id))
          .toList();

      setState(() {
        _allPeople = availablePeople;
        _filteredPeople = availablePeople;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        AppToast.error(context, 'Failed to load people: $e');
      }
    }
  }

  void _filterPeople(String query) {
    setState(() {
      _searchQuery = query;
      if (query.isEmpty) {
        _filteredPeople = _allPeople;
      } else {
        final lowerQuery = query.toLowerCase();
        _filteredPeople = _allPeople.where((person) {
          return person.name.toLowerCase().contains(lowerQuery) ||
              (person.roleTitle?.toLowerCase().contains(lowerQuery) ?? false) ||
              (person.memberType?.toLowerCase().contains(lowerQuery) ?? false);
        }).toList();
      }
    });
  }

  Future<void> _addMember(PersonOption person) async {
    setState(() => _isAdding = true);

    try {
      final supabase = ref.read(supabaseClientProvider);

      // Use RPC function instead of direct insert
      await supabase.rpc('create_assignment', params: {
        'p_org_id': widget.orgId,
        'p_show_id': widget.showId,
        'p_person_id': person.id,
        'p_duty': null,
      });

      if (mounted) {
        widget.onMemberAdded?.call();
      }
    } catch (e) {
      print('═══════════════════════════════════════');
      print('❌ ERROR adding team member: $e');
      print('═══════════════════════════════════════');
      if (mounted) {
        AppToast.error(context, 'Failed to add team member: $e');
      }
    } finally {
      if (mounted) {
        setState(() => _isAdding = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;

    return LayerScaffold(
      title: 'Add Team Member',
      body: Column(
        children: [
          // Search bar
          Padding(
            padding: const EdgeInsets.all(24),
            child: CupertinoTextField(
              controller: _searchController,
              onChanged: _filterPeople,
              placeholder: 'Search people...',
              placeholderStyle: TextStyle(color: AppTheme.getMutedForegroundColor(brightness)),
              prefix: Padding(
                padding: const EdgeInsets.only(left: 12),
                child: Icon(CupertinoIcons.search, color: AppTheme.getMutedForegroundColor(brightness)),
              ),
              decoration: BoxDecoration(
                color: AppTheme.getCardColor(brightness),
                borderRadius: BorderRadius.circular(12),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              style: TextStyle(color: AppTheme.getForegroundColor(brightness)),
            ),
          ),
          // Loading or list
          Expanded(
            child: _isLoading
                ? Center(
                    child: CupertinoActivityIndicator(color: AppTheme.getForegroundColor(brightness)),
                  )
                : _filteredPeople.isEmpty
                    ? _buildEmptyState(brightness)
                    : Stack(
                        children: [
                          ListView.builder(
                            padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
                            itemCount: _filteredPeople.length,
                            itemBuilder: (context, index) {
                              final person = _filteredPeople[index];
                              return SelectablePersonCard(
                                name: person.name,
                                memberType: person.memberType,
                                roleTitle: person.roleTitle,
                                onTap: _isAdding ? null : () => _addMember(person),
                              );
                            },
                          ),
                          if (_isAdding)
                            Container(
                              color: AppTheme.getBackgroundColor(brightness).withValues(alpha: 0.5),
                              child: Center(
                                child: CupertinoActivityIndicator(color: AppTheme.getForegroundColor(brightness)),
                              ),
                            ),
                        ],
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(Brightness brightness) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            _searchQuery.isNotEmpty ? CupertinoIcons.search : CupertinoIcons.person_3,
            size: 64,
            color: AppTheme.getMutedForegroundColor(brightness).withValues(alpha: 0.5),
          ),
          const SizedBox(height: 16),
          Text(
            _searchQuery.isNotEmpty ? 'No matching people' : 'No available people',
            style: TextStyle(
              color: AppTheme.getForegroundColor(brightness),
              fontSize: 18,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            _searchQuery.isNotEmpty
                ? 'Try a different search term'
                : 'All people are already assigned',
            style: TextStyle(
              color: AppTheme.getMutedForegroundColor(brightness),
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }
}

/// Card for selecting a person to add
class SelectablePersonCard extends StatelessWidget {
  final String name;
  final String? memberType;
  final String? roleTitle;
  final VoidCallback? onTap;

  const SelectablePersonCard({
    super.key,
    required this.name,
    this.memberType,
    this.roleTitle,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.getCardColor(brightness),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            // Avatar
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: AppTheme.getPrimaryColor(brightness).withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Text(
                  _getInitials(name),
                  style: TextStyle(
                    color: AppTheme.getPrimaryColor(brightness),
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            // Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name,
                    style: TextStyle(
                      color: AppTheme.getForegroundColor(brightness),
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  if (roleTitle != null || memberType != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      roleTitle ?? _formatMemberType(memberType!),
                      style: TextStyle(
                        color: AppTheme.getMutedForegroundColor(brightness),
                        fontSize: 13,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            // Add icon
            Icon(
              CupertinoIcons.plus_circle,
              color: AppTheme.getPrimaryColor(brightness),
              size: 24,
            ),
          ],
        ),
      ),
    );
  }

  String _getInitials(String name) {
    final parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return '${parts.first[0]}${parts.last[0]}'.toUpperCase();
    }
    return name.isNotEmpty ? name[0].toUpperCase() : '?';
  }

  String _formatMemberType(String type) {
    return type
        .split('_')
        .map((word) => word.isNotEmpty ? '${word[0].toUpperCase()}${word.substring(1)}' : '')
        .join(' ');
  }
}
