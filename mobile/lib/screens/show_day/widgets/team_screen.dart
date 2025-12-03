import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../components/components.dart';
import '../../../models/show_day.dart';
import '../../../providers/auth_provider.dart';
import 'form_widgets.dart';
import 'add_team_member_screen.dart';

/// Layer 2: Team screen showing all assigned people for a show
class TeamScreen extends ConsumerStatefulWidget {
  final List<AssignedPerson> assignments;
  final String showId;
  final String orgId;
  final VoidCallback? onMemberAdded;

  const TeamScreen({
    super.key,
    required this.assignments,
    required this.showId,
    required this.orgId,
    this.onMemberAdded,
  });

  @override
  ConsumerState<TeamScreen> createState() => _TeamScreenState();
}

class _TeamScreenState extends ConsumerState<TeamScreen> {
  bool _isDeleting = false;

  Future<void> _deleteMember(AssignedPerson person) async {
    // Show confirmation dialog
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Remove Team Member'),
        content: Text('Are you sure you want to remove ${person.name} from this show?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: TextButton.styleFrom(
              foregroundColor: Theme.of(context).colorScheme.error,
            ),
            child: const Text('Remove'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() => _isDeleting = true);

    try {
      final supabase = ref.read(supabaseClientProvider);

      await supabase
          .from('show_assignments')
          .delete()
          .eq('show_id', widget.showId)
          .eq('person_id', person.personId);

      if (mounted) {
        widget.onMemberAdded?.call(); // Refresh the list
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
    final colorScheme = Theme.of(context).colorScheme;

    return LayerScaffold(
      title: 'Team',
      body: Stack(
        children: [
          Column(
            children: [
              Expanded(
                child: widget.assignments.isEmpty
                    ? _buildEmptyState(colorScheme)
                    : ListView.builder(
                        padding: const EdgeInsets.all(24),
                        itemCount: widget.assignments.length,
                        itemBuilder: (context, index) {
                          final person = widget.assignments[index];
                          return TeamMemberCard(
                            name: person.name,
                            memberType: person.memberType,
                            duty: person.duty,
                            onDelete: () => _deleteMember(person),
                          );
                        },
                      ),
              ),
              AddButton(
                onPressed: () => _openAddTeamMember(context),
              ),
            ],
          ),
          if (_isDeleting)
            Container(
              color: colorScheme.surface.withValues(alpha: 0.5),
              child: Center(
                child: CircularProgressIndicator(color: colorScheme.onSurface),
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
            Icons.people_outline,
            size: 64,
            color: colorScheme.onSurfaceVariant.withValues(alpha: 0.5),
          ),
          const SizedBox(height: 16),
          Text(
            'No team members',
            style: TextStyle(
              color: colorScheme.onSurface,
              fontSize: 18,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Add team members to this show',
            style: TextStyle(
              color: colorScheme.onSurfaceVariant,
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }

  void _openAddTeamMember(BuildContext context) {
    Navigator.of(context).push(
      SwipeablePageRoute(
        builder: (context) => AddTeamMemberScreen(
          showId: widget.showId,
          orgId: widget.orgId,
          existingAssignments: widget.assignments,
          onMemberAdded: () {
            widget.onMemberAdded?.call();
            Navigator.of(context).pop();
          },
        ),
      ),
    );
  }
}

/// Card for displaying a team member
class TeamMemberCard extends StatelessWidget {
  final String name;
  final String? memberType;
  final String? duty;
  final VoidCallback? onDelete;

  const TeamMemberCard({
    super.key,
    required this.name,
    this.memberType,
    this.duty,
    this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          // Avatar
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: colorScheme.primary.withValues(alpha: 0.15),
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Text(
                _getInitials(name),
                style: TextStyle(
                  color: colorScheme.primary,
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
          const SizedBox(width: 16),
          // Info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: TextStyle(
                    color: colorScheme.onSurface,
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if (memberType != null || duty != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    _buildSubtitle(),
                    style: TextStyle(
                      color: colorScheme.onSurfaceVariant,
                      fontSize: 14,
                    ),
                  ),
                ],
              ],
            ),
          ),
          // Member type badge
          if (memberType != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: _getMemberTypeColor(memberType!, colorScheme).withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                _formatMemberType(memberType!),
                style: TextStyle(
                  color: _getMemberTypeColor(memberType!, colorScheme),
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          // Delete button
          if (onDelete != null) ...[
            const SizedBox(width: 8),
            IconButton(
              onPressed: onDelete,
              icon: Icon(
                Icons.remove_circle_outline,
                color: colorScheme.error,
                size: 24,
              ),
              tooltip: 'Remove from show',
            ),
          ],
        ],
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

  String _buildSubtitle() {
    if (duty != null && duty!.isNotEmpty) {
      return duty!;
    }
    if (memberType != null) {
      return _formatMemberType(memberType!);
    }
    return '';
  }

  String _formatMemberType(String type) {
    // Convert snake_case to Title Case
    return type
        .split('_')
        .map((word) => word.isNotEmpty ? '${word[0].toUpperCase()}${word.substring(1)}' : '')
        .join(' ');
  }

  Color _getMemberTypeColor(String type, ColorScheme colorScheme) {
    switch (type.toLowerCase()) {
      case 'artist':
        return colorScheme.primary;
      case 'tour_manager':
      case 'manager':
        return colorScheme.tertiary;
      case 'crew':
        return colorScheme.secondary;
      default:
        return colorScheme.onSurfaceVariant;
    }
  }
}
