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

/// Shows list screen - displays shows for an organization
/// Matches the mockup design with dark theme and card-based list
class ShowsListScreen extends ConsumerStatefulWidget {
  final String orgId;
  final String orgName;

  const ShowsListScreen({
    super.key,
    required this.orgId,
    required this.orgName,
  });

  @override
  ConsumerState<ShowsListScreen> createState() => _ShowsListScreenState();
}

class _ShowsListScreenState extends ConsumerState<ShowsListScreen> {
  bool _isListView = true;

  // Colors matching web dark theme
  static const _background = Color(0xFF000000);
  static const _foreground = Color(0xFFF0F0F0);
  static const _muted = Color(0xFFA3A3A3);
  static const _card = Color(0xFF1E1E1E);
  static const _border = Color(0xFF262626);
  static const _inputBg = Color(0xFF282828);

  @override
  Widget build(BuildContext context) {
    final showsAsync = ref.watch(showsByOrgProvider(widget.orgId));

    return Scaffold(
      backgroundColor: _background,
      body: SafeArea(
        child: Column(
          children: [
            _buildTopBar(),
            Expanded(
              child: showsAsync.when(
                loading: () => const Center(
                  child: CircularProgressIndicator(color: _foreground),
                ),
                error: (error, stack) => _buildErrorState(error),
                data: (shows) => _buildContent(shows),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTopBar() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      child: Row(
        children: [
          // Left: Profile icon
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: _muted, width: 1.5),
            ),
            child: const Icon(Icons.person_outline, color: _foreground, size: 20),
          ),
          // Center: View toggle (list/calendar) - using Expanded to center
          Expanded(
            child: Center(
              child: Container(
                decoration: BoxDecoration(
                  color: _inputBg,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _buildToggle(Icons.format_list_bulleted, _isListView, () {
                      setState(() => _isListView = true);
                    }),
                    _buildToggle(Icons.calendar_today_outlined, !_isListView, () {
                      setState(() => _isListView = false);
                    }),
                  ],
                ),
              ),
            ),
          ),
          // Right: Settings icon
          const Icon(Icons.settings_outlined, color: _foreground, size: 22),
        ],
      ),
    );
  }

  Widget _buildToggle(IconData icon, bool isSelected, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 40,
        height: 32,
        decoration: BoxDecoration(
          color: isSelected ? _border : Colors.transparent,
          borderRadius: BorderRadius.circular(6),
        ),
        child: Icon(icon, color: _foreground, size: 18),
      ),
    );
  }

  Widget _buildErrorState(Object error) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, size: 48, color: _muted),
          const SizedBox(height: 16),
          const Text('Failed to load shows', style: TextStyle(color: _muted)),
          const SizedBox(height: 12),
          TextButton(
            onPressed: () => ref.invalidate(showsByOrgProvider(widget.orgId)),
            child: const Text('Retry', style: TextStyle(color: _foreground)),
          ),
        ],
      ),
    );
  }

  Widget _buildContent(List<Show> shows) {
    return Column(
      children: [
        // Shows list
        Expanded(
          child: shows.isEmpty ? _buildEmptyState() : _buildShowsList(shows),
        ),
        // Search and Add button
        _buildBottomSection(),
      ],
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.event_note_outlined, size: 56, color: _muted.withOpacity(0.5)),
          const SizedBox(height: 16),
          const Text('No shows yet', style: TextStyle(color: _foreground, fontSize: 17)),
          const SizedBox(height: 6),
          const Text('Add your first show to get started', 
            style: TextStyle(color: _muted, fontSize: 14)),
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
                  color: _foreground,
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            // Show cards
            ...monthShows.map((show) => Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: _ShowCard(show: show),
            )),
          ],
        );
      },
    );
  }

  Widget _buildBottomSection() {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Search row
          Row(
            children: [
              Expanded(
                child: Container(
                  height: 48,
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  decoration: BoxDecoration(
                    border: Border.all(color: const Color(0xFF3B82F6), width: 1.5),
                    borderRadius: BorderRadius.circular(25),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.search, color: _muted, size: 20),
                      const SizedBox(width: 10),
                      Expanded(
                        child: TextField(
                          style: const TextStyle(color: _foreground, fontSize: 15),
                          decoration: const InputDecoration(
                            hintText: 'Search',
                            hintStyle: TextStyle(color: _muted),
                            border: InputBorder.none,
                            isDense: true,
                            contentPadding: EdgeInsets.zero,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 12),
              const Icon(Icons.tune, color: _muted, size: 22),
            ],
          ),
          const SizedBox(height: 16),
          // Add New button - white with black text
          SizedBox(
            width: double.infinity,
            height: 50,
            child: ElevatedButton(
              onPressed: () {},
              style: ElevatedButton.styleFrom(
                backgroundColor: _foreground,
                foregroundColor: _background,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(25),
                ),
              ),
              child: const Text(
                'Add New',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
              ),
            ),
          ),
          const SizedBox(height: 16),
          // Bottom navigation
          _buildBottomNav(),
        ],
      ),
    );
  }

  int _selectedNavIndex = 1; // Shows selected by default

  Widget _buildBottomNav() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        color: _inputBg,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          _buildNavItem(Icons.play_arrow_outlined, 'Day', 0),
          _buildNavItem(Icons.format_list_bulleted, 'Shows', 1),
          _buildNavItem(Icons.people_outline, 'Network', 2),
        ],
      ),
    );
  }

  Widget _buildNavItem(IconData icon, String label, int index) {
    final isSelected = _selectedNavIndex == index;
    final color = isSelected ? _foreground : _muted;
    
    return GestureDetector(
      onTap: () => setState(() => _selectedNavIndex = index),
      behavior: HitTestBehavior.opaque,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                color: color,
                fontSize: 14,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Show card matching web client's rounded card design
class _ShowCard extends StatelessWidget {
  final Show show;

  const _ShowCard({required this.show});

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
