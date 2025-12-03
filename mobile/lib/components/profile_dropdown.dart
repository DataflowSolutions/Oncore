import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/auth_provider.dart';

/// Profile dropdown widget that shows user info and account options
class ProfileDropdown extends ConsumerWidget {
  const ProfileDropdown({super.key});

  /// Show the profile dropdown as a modal overlay
  static Future<void> show(BuildContext context, WidgetRef ref) {
    return showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (context) => const _ProfileDropdownContent(),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return const _ProfileDropdownContent();
  }
}

class _ProfileDropdownContent extends ConsumerWidget {
  const _ProfileDropdownContent();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colorScheme = Theme.of(context).colorScheme;
    final user = ref.watch(currentUserProvider);
    
    // Get user display name and email
    final fullName = user?.userMetadata?['full_name'] as String? ?? 'User';
    final email = user?.email ?? '';
    
    // Get initials for avatar
    final initials = _getInitials(fullName);

    return Container(
      margin: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHigh,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Close button row
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: Row(
              children: [
                GestureDetector(
                  onTap: () => Navigator.of(context).pop(),
                  child: Icon(
                    Icons.close,
                    color: colorScheme.onSurfaceVariant,
                    size: 24,
                  ),
                ),
                const Spacer(),
              ],
            ),
          ),
          
          // Profile header
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 24),
            child: Column(
              children: [
                Text(
                  'Profile',
                  style: TextStyle(
                    color: colorScheme.onSurface,
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 24),
                
                // Avatar circle
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: colorScheme.onSurfaceVariant,
                      width: 2,
                    ),
                  ),
                  child: Center(
                    child: Text(
                      initials,
                      style: TextStyle(
                        color: colorScheme.onSurface,
                        fontSize: 28,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                
                // User name
                Text(
                  fullName,
                  style: TextStyle(
                    color: colorScheme.onSurface,
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                
                // User email
                Text(
                  email,
                  style: TextStyle(
                    color: colorScheme.onSurfaceVariant,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
          
          // Divider
          Container(
            height: 1,
            color: colorScheme.outlineVariant.withValues(alpha: 0.3),
          ),
          
          // Add account option
          _buildMenuItem(
            context: context,
            icon: Icons.add,
            label: 'Add account',
            onTap: () {
              Navigator.of(context).pop();
              // TODO: Implement add account functionality
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Add account coming soon')),
              );
            },
            colorScheme: colorScheme,
          ),
          
          // Log out option
          _buildMenuItem(
            context: context,
            icon: Icons.logout,
            label: 'Log out',
            onTap: () async {
              Navigator.of(context).pop();
              await ref.read(authProvider.notifier).signOut();
              if (context.mounted) {
                context.go('/login');
              }
            },
            colorScheme: colorScheme,
          ),
          
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  Widget _buildMenuItem({
    required BuildContext context,
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    required ColorScheme colorScheme,
  }) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        child: Row(
          children: [
            Icon(
              icon,
              color: colorScheme.onSurfaceVariant,
              size: 22,
            ),
            const SizedBox(width: 16),
            Text(
              label,
              style: TextStyle(
                color: colorScheme.onSurface,
                fontSize: 16,
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _getInitials(String name) {
    if (name.isEmpty) return 'U';
    
    final parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return parts[0][0].toUpperCase();
  }
}
