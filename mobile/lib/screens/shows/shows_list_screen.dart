import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../models/show.dart';
import '../../providers/auth_provider.dart';
import '../main/main_shell.dart' show saveLastShow;

/// Provider for fetching shows by organization with artist assignments
final showsByOrgProvider = FutureProvider.family<List<Show>, String>((ref, orgId) async {
  final supabase = ref.watch(supabaseClientProvider);
  
  // Fetch shows
  final response = await supabase.rpc('get_shows_by_org', params: {'p_org_id': orgId});
  
  if (response == null) {
    return [];
  }
  
  final List<dynamic> data = response as List<dynamic>;
  final shows = data.map((json) => Show.fromJson(json as Map<String, dynamic>)).toList();
  
  if (shows.isEmpty) return shows;
  
  // Fetch show assignments to get artist names (same as web client)
  final showIds = shows.map((s) => s.id).toList();
  final assignmentsResponse = await supabase.rpc(
    'get_show_assignments_for_shows',
    params: {'p_show_ids': showIds},
  );
  
  if (assignmentsResponse == null) return shows;
  
  // Group assignments by show_id, filtering for artists only
  final Map<String, List<String>> artistNamesByShow = {};
  for (final assignment in assignmentsResponse as List<dynamic>) {
    final a = assignment as Map<String, dynamic>;
    final showId = a['show_id'] as String;
    final memberType = a['member_type'] as String?;
    final personName = a['person_name'] as String?;
    
    if (memberType == 'artist' && personName != null) {
      artistNamesByShow.putIfAbsent(showId, () => []).add(personName);
    }
  }
  
  // Merge artist names into shows
  return shows.map((show) {
    final artists = artistNamesByShow[show.id] ?? [];
    return show.copyWith(artistNames: artists);
  }).toList();
});

/// Shows content widget - just the list content, no shell/nav
/// Used inside MainShell for swipe navigation
class ShowsContent extends ConsumerWidget {
  final String orgId;
  final String orgName;
  final void Function(String showId)? onShowSelected;

  const ShowsContent({
    super.key,
    required this.orgId,
    required this.orgName,
    this.onShowSelected,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final showsAsync = ref.watch(showsByOrgProvider(orgId));
    final colorScheme = Theme.of(context).colorScheme;

    return showsAsync.when(
      loading: () => Center(
        child: CircularProgressIndicator(color: colorScheme.onSurface),
      ),
      error: (error, stack) => _buildErrorState(context, ref, error),
      data: (shows) => shows.isEmpty ? _buildEmptyState(context) : _buildShowsList(context, shows),
    );
  }

  Widget _buildErrorState(BuildContext context, WidgetRef ref, Object error) {
    final colorScheme = Theme.of(context).colorScheme;
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error_outline, size: 48, color: colorScheme.onSurfaceVariant),
          const SizedBox(height: 16),
          Text('Failed to load shows', style: TextStyle(color: colorScheme.onSurfaceVariant)),
          const SizedBox(height: 12),
          TextButton(
            onPressed: () => ref.invalidate(showsByOrgProvider(orgId)),
            child: Text('Retry', style: TextStyle(color: colorScheme.onSurface)),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.event_note_outlined, size: 56, color: colorScheme.onSurfaceVariant.withOpacity(0.5)),
          const SizedBox(height: 16),
          Text('No shows yet', style: TextStyle(color: colorScheme.onSurface, fontSize: 17)),
          const SizedBox(height: 6),
          Text('Add your first show to get started', 
            style: TextStyle(color: colorScheme.onSurfaceVariant, fontSize: 14)),
        ],
      ),
    );
  }

  Widget _buildShowsList(BuildContext context, List<Show> shows) {
    final colorScheme = Theme.of(context).colorScheme;
    // Group shows by month
    final grouped = <String, List<Show>>{};
    for (final show in shows) {
      final key = show.monthYear;
      grouped.putIfAbsent(key, () => []).add(show);
    }

    // Sort each group by date
    for (final list in grouped.values) {
      list.sort((a, b) => a.date.compareTo(b.date));
    }

    final sortedKeys = grouped.keys.toList()
      ..sort((a, b) {
        final aDate = grouped[a]!.first.date;
        final bDate = grouped[b]!.first.date;
        return aDate.compareTo(bDate);
      });

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      itemCount: sortedKeys.length,
      itemBuilder: (context, index) {
        final monthYear = sortedKeys[index];
        final monthShows = grouped[monthYear]!;
        
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (index > 0) const SizedBox(height: 24),
            // Month header
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Text(
                monthYear,
                style: TextStyle(
                  color: colorScheme.onSurface,
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            // Show cards
            ...monthShows.map((show) => Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: ShowCard(show: show, orgId: orgId, onShowSelected: onShowSelected),
            )),
          ],
        );
      },
    );
  }
}

/// Show card matching web client's rounded card design
class ShowCard extends StatelessWidget {
  final Show show;
  final String orgId;
  final void Function(String showId)? onShowSelected;

  const ShowCard({
    super.key, 
    required this.show, 
    required this.orgId,
    this.onShowSelected,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    
    return GestureDetector(
      onTap: () async {
        await saveLastShow(orgId, show.id);
        if (onShowSelected != null) {
          onShowSelected!(show.id);
        } else if (context.mounted) {
          context.push('/org/$orgId/shows/${show.id}/day');
        }
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: colorScheme.surfaceContainer,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: colorScheme.outline),
        ),
        child: Row(
          children: [
            // Left: Title and artist
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    show.title,
                    style: TextStyle(
                      color: colorScheme.onSurface,
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 3),
                  Text(
                    show.artistNamesDisplay,
                    style: TextStyle(color: colorScheme.onSurfaceVariant, fontSize: 13),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            // Right: Venue and date
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  show.venueCity ?? 'TBD',
                  style: TextStyle(color: colorScheme.onSurfaceVariant, fontSize: 13),
                ),
                const SizedBox(height: 3),
                Text(
                  show.formattedDate,
                  style: TextStyle(color: colorScheme.onSurfaceVariant, fontSize: 13),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
