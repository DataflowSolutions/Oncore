import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../components/components.dart';
import '../../../models/show_day.dart';
import '../../../providers/auth_provider.dart';

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

      // Fetch all people in the organization
      final response = await supabase
          .from('people')
          .select('id, name, email, phone, member_type, role_title')
          .eq('org_id', widget.orgId)
          .order('name', ascending: true);

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

      await supabase.from('show_assignments').insert({
        'org_id': widget.orgId,
        'show_id': widget.showId,
        'person_id': person.id,
      });

      if (mounted) {
        widget.onMemberAdded?.call();
      }
    } catch (e) {
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
    final colorScheme = Theme.of(context).colorScheme;

    return LayerScaffold(
      title: 'Add Team Member',
      body: Column(
        children: [
          // Search bar
          Padding(
            padding: const EdgeInsets.all(24),
            child: TextField(
              controller: _searchController,
              onChanged: _filterPeople,
              decoration: InputDecoration(
                hintText: 'Search people...',
                hintStyle: TextStyle(color: colorScheme.onSurfaceVariant),
                prefixIcon: Icon(Icons.search, color: colorScheme.onSurfaceVariant),
                filled: true,
                fillColor: colorScheme.surfaceContainerHighest,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              ),
              style: TextStyle(color: colorScheme.onSurface),
            ),
          ),
          // Loading or list
          Expanded(
            child: _isLoading
                ? Center(
                    child: CircularProgressIndicator(color: colorScheme.onSurface),
                  )
                : _filteredPeople.isEmpty
                    ? _buildEmptyState(colorScheme)
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
                              color: colorScheme.surface.withValues(alpha: 0.5),
                              child: Center(
                                child: CircularProgressIndicator(color: colorScheme.onSurface),
                              ),
                            ),
                        ],
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(ColorScheme colorScheme) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            _searchQuery.isNotEmpty ? Icons.search_off : Icons.people_outline,
            size: 64,
            color: colorScheme.onSurfaceVariant.withValues(alpha: 0.5),
          ),
          const SizedBox(height: 16),
          Text(
            _searchQuery.isNotEmpty ? 'No matching people' : 'No available people',
            style: TextStyle(
              color: colorScheme.onSurface,
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
              color: colorScheme.onSurfaceVariant,
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
    final colorScheme = Theme.of(context).colorScheme;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            // Avatar
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: colorScheme.primary.withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Text(
                  _getInitials(name),
                  style: TextStyle(
                    color: colorScheme.primary,
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
                      color: colorScheme.onSurface,
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  if (roleTitle != null || memberType != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      roleTitle ?? _formatMemberType(memberType!),
                      style: TextStyle(
                        color: colorScheme.onSurfaceVariant,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            // Add icon
            Icon(
              Icons.add_circle_outline,
              color: colorScheme.primary,
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
