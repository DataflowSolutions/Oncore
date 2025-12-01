import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../models/show.dart';
import '../../providers/auth_provider.dart';

/// Provider for fetching shows by organization
final showsByOrgProvider = FutureProvider.family<List<Show>, String>((ref, orgId) async {
  final supabase = ref.watch(supabaseClientProvider);
  
  final response = await supabase.rpc('get_shows_by_org', params: {'p_org_id': orgId});
  
  if (response == null) {
    return [];
  }
  
  final List<dynamic> data = response as List<dynamic>;
  return data.map((json) => Show.fromJson(json as Map<String, dynamic>)).toList();
});

// Colors matching web dark theme - shared
const showsBackground = Color(0xFF000000);
const showsForeground = Color(0xFFF0F0F0);
const showsMuted = Color(0xFFA3A3A3);

/// Shows content widget - just the list content, no shell/nav
/// Used inside MainShell for swipe navigation
class ShowsContent extends ConsumerWidget {
  final String orgId;
  final String orgName;

  const ShowsContent({
    super.key,
    required this.orgId,
    required this.orgName,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final showsAsync = ref.watch(showsByOrgProvider(orgId));

    return showsAsync.when(
      loading: () => const Center(
        child: CircularProgressIndicator(color: showsForeground),
      ),
      error: (error, stack) => _buildErrorState(ref, error),
      data: (shows) => shows.isEmpty ? _buildEmptyState() : _buildShowsList(shows),
    );
  }

  Widget _buildErrorState(WidgetRef ref, Object error) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, size: 48, color: showsMuted),
          const SizedBox(height: 16),
          const Text('Failed to load shows', style: TextStyle(color: showsMuted)),
          const SizedBox(height: 12),
          TextButton(
            onPressed: () => ref.invalidate(showsByOrgProvider(orgId)),
            child: const Text('Retry', style: TextStyle(color: showsForeground)),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.event_note_outlined, size: 56, color: showsMuted.withOpacity(0.5)),
          const SizedBox(height: 16),
          const Text('No shows yet', style: TextStyle(color: showsForeground, fontSize: 17)),
          const SizedBox(height: 6),
          const Text('Add your first show to get started', 
            style: TextStyle(color: showsMuted, fontSize: 14)),
        ],
      ),
    );
  }

  Widget _buildShowsList(List<Show> shows) {
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
                style: const TextStyle(
                  color: showsForeground,
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            // Show cards
            ...monthShows.map((show) => Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: ShowCard(show: show),
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

  const ShowCard({super.key, required this.show});

  static const _foreground = Color(0xFFF0F0F0);
  static const _muted = Color(0xFFA3A3A3);
  static const _card = Color(0xFF1E1E1E);
  static const _border = Color(0xFF262626);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: _card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: _border),
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
                  style: const TextStyle(
                    color: _foreground,
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 3),
                const Text(
                  'Alesso', // TODO: Get from show_assignments
                  style: TextStyle(color: _muted, fontSize: 13),
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
                style: const TextStyle(color: _muted, fontSize: 13),
              ),
              const SizedBox(height: 3),
              Text(
                show.formattedDate,
                style: const TextStyle(color: _muted, fontSize: 13),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
