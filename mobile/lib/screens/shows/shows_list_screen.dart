import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../theme/app_theme.dart';
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
class ShowsContent extends ConsumerStatefulWidget {
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
  ConsumerState<ShowsContent> createState() => _ShowsContentState();
}

class _ShowsContentState extends ConsumerState<ShowsContent> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  // Filter state - can be expanded for more filter options
  bool _showPastShows = true;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<Show> _filterShows(List<Show> shows) {
    var filtered = shows;
    
    // Filter by search query
    if (_searchQuery.isNotEmpty) {
      final query = _searchQuery.toLowerCase();
      filtered = filtered.where((show) {
        return show.title.toLowerCase().contains(query) ||
            (show.venueName?.toLowerCase().contains(query) ?? false) ||
            (show.venueCity?.toLowerCase().contains(query) ?? false) ||
            show.artistNamesDisplay.toLowerCase().contains(query);
      }).toList();
    }
    
    // Filter past shows
    if (!_showPastShows) {
      final now = DateTime.now();
      filtered = filtered.where((show) => show.date.isAfter(now.subtract(const Duration(days: 1)))).toList();
    }
    
    return filtered;
  }

  @override
  Widget build(BuildContext context) {
    final showsAsync = ref.watch(showsByOrgProvider(widget.orgId));
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;

    return Column(
      children: [
        // Search bar and filter button
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            children: [
              // Search input
              Expanded(
                child: CupertinoSearchTextField(
                  controller: _searchController,
                  onChanged: (value) => setState(() => _searchQuery = value),
                  placeholder: 'Search shows...',
                  style: TextStyle(color: AppTheme.getForegroundColor(brightness), fontSize: 14),
                  itemColor: AppTheme.getMutedForegroundColor(brightness),
                  decoration: BoxDecoration(
                    color: AppTheme.getInputBackgroundColor(brightness),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppTheme.getBorderColor(brightness)),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              // Filter button - enlarged with more spacing
              GestureDetector(
                onTap: _showFilterDialog,
                child: Container(
                  width: 48,
                  height: 44,
                  decoration: BoxDecoration(
                    color: AppTheme.getCardColor(brightness),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppTheme.getBorderColor(brightness)),
                  ),
                  child: Icon(
                    CupertinoIcons.line_horizontal_3_decrease,
                    color: _showPastShows ? AppTheme.getMutedForegroundColor(brightness) : AppTheme.getPrimaryColor(brightness),
                    size: 22,
                  ),
                ),
              ),
            ],
          ),
        ),
        // Shows list
        Expanded(
          child: showsAsync.when(
            loading: () => Center(
              child: CupertinoActivityIndicator(color: AppTheme.getForegroundColor(brightness)),
            ),
            error: (error, stack) => _buildErrorState(context, error, brightness),
            data: (shows) {
              final filtered = _filterShows(shows);
              if (shows.isEmpty) {
                return _buildEmptyState(context, brightness);
              }
              if (filtered.isEmpty) {
                return Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(CupertinoIcons.search, size: 48, color: AppTheme.getMutedForegroundColor(brightness)),
                      const SizedBox(height: 16),
                      Text('No shows match your search', style: TextStyle(color: AppTheme.getMutedForegroundColor(brightness))),
                    ],
                  ),
                );
              }
              return _buildShowsList(context, filtered, brightness);
            },
          ),
        ),
      ],
    );
  }

  void _showFilterDialog() {
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;
    showCupertinoModalPopup(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => Container(
          decoration: BoxDecoration(
            color: AppTheme.getCardColor(brightness),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
          ),
          padding: const EdgeInsets.all(24),
          child: SafeArea(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Filter Shows',
                  style: TextStyle(
                    color: AppTheme.getForegroundColor(brightness),
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 20),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Show past shows', style: TextStyle(color: AppTheme.getForegroundColor(brightness))),
                    CupertinoSwitch(
                      value: _showPastShows,
                      onChanged: (value) {
                        setModalState(() => _showPastShows = value);
                        setState(() => _showPastShows = value);
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: CupertinoButton.filled(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('Done'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildErrorState(BuildContext context, Object error, Brightness brightness) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(CupertinoIcons.exclamationmark_circle, size: 48, color: AppTheme.getMutedForegroundColor(brightness)),
          const SizedBox(height: 16),
          Text('Failed to load shows', style: TextStyle(color: AppTheme.getMutedForegroundColor(brightness))),
          const SizedBox(height: 12),
          CupertinoButton(
            onPressed: () => ref.invalidate(showsByOrgProvider(widget.orgId)),
            child: Text('Retry', style: TextStyle(color: AppTheme.getForegroundColor(brightness))),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context, Brightness brightness) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(CupertinoIcons.calendar, size: 56, color: AppTheme.getMutedForegroundColor(brightness).withOpacity(0.5)),
          const SizedBox(height: 16),
          Text('No shows yet', style: TextStyle(color: AppTheme.getForegroundColor(brightness), fontSize: 17)),
          const SizedBox(height: 6),
          Text('Add your first show to get started', 
            style: TextStyle(color: AppTheme.getMutedForegroundColor(brightness), fontSize: 14)),
        ],
      ),
    );
  }

  Widget _buildShowsList(BuildContext context, List<Show> shows, Brightness brightness) {
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
      padding: const EdgeInsets.only(left: 16, right: 16, bottom: 140),
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
                  color: AppTheme.getForegroundColor(brightness),
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            // Show cards
            ...monthShows.map((show) => Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: ShowCard(show: show, orgId: widget.orgId, onShowSelected: widget.onShowSelected),
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
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;
    
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
          color: AppTheme.getCardColor(brightness),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.getBorderColor(brightness)),
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
                      color: AppTheme.getForegroundColor(brightness),
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 3),
                  Text(
                    show.artistNamesDisplay,
                    style: TextStyle(color: AppTheme.getMutedForegroundColor(brightness), fontSize: 13),
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
                  style: TextStyle(color: AppTheme.getMutedForegroundColor(brightness), fontSize: 13),
                ),
                const SizedBox(height: 3),
                Text(
                  show.formattedDate,
                  style: TextStyle(color: AppTheme.getMutedForegroundColor(brightness), fontSize: 13),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
