import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../components/components.dart';
import '../../components/cupertino_components.dart';
import '../../providers/auth_provider.dart';
import '../../providers/theme_provider.dart';
import '../../theme/theme.dart';

/// Organization model matching the RPC response
class Organization {
  final String orgId;
  final String name;
  final String slug;
  final String role;
  final String status;

  Organization({
    required this.orgId,
    required this.name,
    required this.slug,
    required this.role,
    required this.status,
  });

  factory Organization.fromJson(Map<String, dynamic> json) {
    return Organization(
      orgId: json['org_id'] as String,
      name: json['name'] as String,
      slug: json['slug'] as String,
      role: json['role'] as String,
      status: json['status'] as String,
    );
  }
}

/// Provider for fetching user organizations
final userOrganizationsProvider = FutureProvider<List<Organization>>((ref) async {
  final supabase = ref.watch(supabaseClientProvider);
  
  final response = await supabase.rpc('get_user_organizations');
  
  if (response == null) {
    return [];
  }
  
  final List<dynamic> data = response as List<dynamic>;
  return data.map((json) => Organization.fromJson(json as Map<String, dynamic>)).toList();
});

/// Home screen - Shows user's organizations after login
/// Matches the web client's HomePageClient component
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final organizationsAsync = ref.watch(userOrganizationsProvider);
    final brightness = ref.watch(brightnessProvider);

    return CupertinoPageScaffold(
      navigationBar: CupertinoNavigationBar(
        middle: Text(
          'oncore',
          style: AppTheme.headlineTextStyle(brightness).copyWith(
            color: AppTheme.getPrimaryColor(brightness),
          ),
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            // User email
            if (authState.user?.email != null)
              Padding(
                padding: const EdgeInsets.only(right: 8),
                child: Text(
                  authState.user!.email!,
                  style: AppTheme.footnoteTextStyle(brightness),
                ),
              ),
            // Sign out button
            CupertinoButton(
              padding: EdgeInsets.zero,
              child: const Icon(CupertinoIcons.square_arrow_right, size: 24),
              onPressed: () async {
                await ref.read(authProvider.notifier).signOut();
              },
            ),
          ],
        ),
      ),
      child: organizationsAsync.when(
        loading: () => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CupertinoActivityIndicator(radius: 14),
              SizedBox(height: 16),
              Text('Loading organizations...'),
            ],
          ),
        ),
        error: (error, stack) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  CupertinoIcons.exclamationmark_triangle,
                  size: 64,
                  color: CupertinoColors.systemRed,
                ),
                const SizedBox(height: 16),
                Text(
                  'Failed to load organizations',
                  style: AppTheme.title3TextStyle(brightness),
                ),
                const SizedBox(height: 8),
                Text(
                  error.toString(),
                  style: AppTheme.bodyTextStyle(brightness).copyWith(
                    color: AppTheme.getMutedForegroundColor(brightness),
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
                CupertinoButton.filled(
                  onPressed: () => ref.invalidate(userOrganizationsProvider),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(CupertinoIcons.refresh, size: 20),
                      SizedBox(width: 8),
                      Text('Retry'),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        data: (organizations) {
          if (organizations.isEmpty) {
            return _EmptyState(
              onCreateOrg: () {
                context.push('/create-org');
              },
            );
          }

          // Auto-navigate to single organization
          if (organizations.length == 1) {
            WidgetsBinding.instance.addPostFrameCallback((_) {
              final org = organizations.first;
              context.go('/org/${org.orgId}/shows', extra: org.name);
            });
            return Center(
              child: CupertinoActivityIndicator(radius: 14),
            );
          }

          return CustomScrollView(
            slivers: [
              CupertinoSliverRefreshControl(
                onRefresh: () async {
                  ref.invalidate(userOrganizationsProvider);
                },
              ),
              SliverPadding(
                padding: const EdgeInsets.all(16),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      if (index == 0) {
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Your Organizations',
                                style: AppTheme.title2TextStyle(brightness),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '${organizations.length} organization${organizations.length != 1 ? 's' : ''}',
                                style: AppTheme.footnoteTextStyle(brightness),
                              ),
                            ],
                          ),
                        );
                      }

                      final org = organizations[index - 1];
                      return _OrganizationCard(organization: org);
                    },
                    childCount: organizations.length + 1,
                  ),
                ),
              ),
              // Add button at bottom
              SliverPadding(
                padding: const EdgeInsets.all(16),
                sliver: SliverToBoxAdapter(
                  child: CupertinoButton.filled(
                    onPressed: () {
                      context.push('/create-org');
                    },
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(CupertinoIcons.add, size: 20),
                        SizedBox(width: 8),
                        Text('New Organization'),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

/// Organization card widget
class _OrganizationCard extends ConsumerWidget {
  final Organization organization;

  const _OrganizationCard({required this.organization});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final brightness = ref.watch(brightnessProvider);

    return GestureDetector(
      onTap: () {
        // Navigate to organization shows list
        context.go(
          '/org/${organization.orgId}/shows',
          extra: organization.name,
        );
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.getCardColor(brightness),
          border: Border.all(
            color: AppTheme.getCardBorderColor(brightness),
            width: 1,
          ),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            // Organization avatar
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: AppTheme.getPrimaryColor(brightness).withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Center(
                child: Text(
                  organization.name.substring(0, 1).toUpperCase(),
                  style: AppTheme.title1TextStyle(brightness).copyWith(
                    color: AppTheme.getPrimaryColor(brightness),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 16),
            // Organization info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    organization.name,
                    style: AppTheme.headlineTextStyle(brightness),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      _RoleBadge(role: organization.role),
                      const SizedBox(width: 8),
                      Text(
                        '/${organization.slug}',
                        style: AppTheme.footnoteTextStyle(brightness),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            // Arrow icon
            Icon(
              CupertinoIcons.chevron_right,
              color: AppTheme.getMutedForegroundColor(brightness),
              size: 20,
            ),
          ],
        ),
      ),
    );
  }
}

/// Role badge widget
class _RoleBadge extends ConsumerWidget {
  final String role;

  const _RoleBadge({required this.role});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final brightness = ref.watch(brightnessProvider);
    
    Color backgroundColor;
    Color textColor;
    
    switch (role.toLowerCase()) {
      case 'owner':
        backgroundColor = CupertinoColors.systemPurple.withOpacity(0.2);
        textColor = CupertinoColors.systemPurple;
        break;
      case 'admin':
        backgroundColor = CupertinoColors.systemBlue.withOpacity(0.2);
        textColor = CupertinoColors.systemBlue;
        break;
      case 'member':
      default:
        backgroundColor = AppTheme.getCardBorderColor(brightness);
        textColor = AppTheme.getMutedForegroundColor(brightness);
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        role.toLowerCase(),
        style: AppTheme.caption1TextStyle(brightness).copyWith(
          fontWeight: FontWeight.w600,
          color: textColor,
        ),
      ),
    );
  }
}

/// Empty state when user has no organizations
class _EmptyState extends ConsumerWidget {
  final VoidCallback onCreateOrg;

  const _EmptyState({required this.onCreateOrg});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final brightness = ref.watch(brightnessProvider);

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              CupertinoIcons.building_2_fill,
              size: 80,
              color: AppTheme.getMutedForegroundColor(brightness).withOpacity(0.5),
            ),
            const SizedBox(height: 24),
            Text(
              'No organizations yet',
              style: AppTheme.title2TextStyle(brightness),
            ),
            const SizedBox(height: 8),
            Text(
              'Create your first organization to get started managing your tours.',
              style: AppTheme.bodyTextStyle(brightness).copyWith(
                color: AppTheme.getMutedForegroundColor(brightness),
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),
            CupertinoButton.filled(
              onPressed: onCreateOrg,
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(CupertinoIcons.add, size: 20),
                  SizedBox(width: 8),
                  Text('Create Organization'),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
