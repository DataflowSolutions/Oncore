import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../shows/shows_list_screen.dart';
import '../shows/create_show_modal.dart';
import '../network/network_screen.dart';

/// Storage key for last viewed show
const String _lastShowKey = 'oncore_last_show';

/// Helper to save last show to preferences
Future<void> saveLastShow(String orgId, String showId) async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.setString(_lastShowKey, '$orgId:$showId');
}

/// Helper to get last show from preferences
Future<(String?, String?)?> getLastShow() async {
  final prefs = await SharedPreferences.getInstance();
  final stored = prefs.getString(_lastShowKey);
  if (stored != null && stored.contains(':')) {
    final parts = stored.split(':');
    if (parts.length == 2) {
      return (parts[0], parts[1]);
    }
  }
  return null;
}

/// Main shell that wraps Shows, Network screens with swipe navigation
/// Day button navigates directly to last viewed show's day view
class MainShell extends StatefulWidget {
  final String orgId;
  final String orgName;
  final int initialIndex;

  const MainShell({
    super.key,
    required this.orgId,
    required this.orgName,
    this.initialIndex = 0, // Default to Shows (first)
  });

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  late PageController _pageController;
  late int _currentIndex;
  NetworkTab _networkTab = NetworkTab.team;
  bool _isNavigatingToDay = false;

  // Colors matching web dark theme
  static const _background = Color(0xFF000000);
  static const _foreground = Color(0xFFF0F0F0);
  static const _muted = Color(0xFFA3A3A3);
  static const _inputBg = Color(0xFF282828);

  @override
  void initState() {
    super.initState();
    // PageView indices: 0=Day(placeholder), 1=Shows, 2=Network
    // Start on Shows (index 1)
    _currentIndex = 1;
    _pageController = PageController(initialPage: 1);
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _onPageChanged(int index) {
    if (index == 0 && !_isNavigatingToDay) {
      // Swiped to Day - navigate to last show's day view
      _isNavigatingToDay = true;
      _navigateToDay().then((_) {
        // After navigation attempt, snap back to Shows
        if (mounted) {
          _pageController.jumpToPage(1);
          _isNavigatingToDay = false;
        }
      });
      return;
    }
    
    setState(() {
      _currentIndex = index;
    });
  }

  void _onNavTap(int index) async {
    if (index == 0) {
      // Day tapped - navigate to last show's day view
      await _navigateToDay();
    } else {
      // Shows or Network - swipe to that page
      _pageController.animateToPage(
        index,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    }
  }

  Future<void> _navigateToDay() async {
    // Always load fresh from SharedPreferences to get the latest show
    final lastShow = await getLastShow();
    final showId = (lastShow != null && lastShow.$1 == widget.orgId) 
        ? lastShow.$2 
        : null;
    
    if (showId != null && mounted) {
      // Navigate to the day view for the last show
      context.push('/org/${widget.orgId}/shows/$showId/day');
    } else if (mounted) {
      // No last show - show a message
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Open a show first to access Day view'),
          backgroundColor: Color(0xFF282828),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _background,
      body: SafeArea(
        child: Column(
          children: [
            _buildTopBar(),
            Expanded(
              child: PageView(
                controller: _pageController,
                onPageChanged: _onPageChanged,
                children: [
                  // Index 0: Day placeholder - just a black screen that triggers navigation
                  Container(color: _background),
                  // Index 1: Shows
                  ShowsContent(orgId: widget.orgId, orgName: widget.orgName),
                  // Index 2: Network
                  NetworkContent(
                    orgId: widget.orgId, 
                    orgName: widget.orgName,
                    activeTab: _networkTab,
                    onTabChanged: (tab) => setState(() => _networkTab = tab),
                  ),
                ],
              ),
            ),
            _buildBottomSection(),
          ],
        ),
      ),
    );
  }

  Widget _buildTopBar() {
    // Indices: 0=Day, 1=Shows, 2=Network
    final isShowsTab = _currentIndex == 1;
    final isNetworkTab = _currentIndex == 2;

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
          // Center: View toggle (Shows or Network)
          Expanded(
            child: Center(
              child: isShowsTab
                  ? Container(
                      decoration: BoxDecoration(
                        color: _inputBg,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          _buildToggle(Icons.format_list_bulleted, true, () {
                            // Already on list view
                          }),
                          _buildToggle(Icons.calendar_today_outlined, false, () {
                            context.go('/org/${widget.orgId}/calendar', extra: widget.orgName);
                          }),
                        ],
                      ),
                    )
                  : isNetworkTab
                      ? Container(
                          decoration: BoxDecoration(
                            color: _inputBg,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              _buildNetworkToggle(Icons.person_outline, NetworkTab.team),
                              _buildNetworkToggle(Icons.groups_outlined, NetworkTab.promoters),
                              _buildNetworkToggle(Icons.location_on_outlined, NetworkTab.venues),
                            ],
                          ),
                        )
                      : const SizedBox.shrink(),
            ),
          ),
          // Right: Settings icon
          const Icon(Icons.settings_outlined, color: _foreground, size: 22),
        ],
      ),
    );
  }

  Widget _buildNetworkToggle(IconData icon, NetworkTab tab) {
    final isSelected = _networkTab == tab;
    return GestureDetector(
      onTap: () => setState(() => _networkTab = tab),
      child: Container(
        width: 44,
        height: 36,
        decoration: BoxDecoration(
          color: isSelected ? _foreground : Colors.transparent,
          borderRadius: BorderRadius.circular(6),
        ),
        child: Icon(
          icon,
          color: isSelected ? _background : _muted,
          size: 20,
        ),
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
          color: isSelected ? _foreground : Colors.transparent,
          borderRadius: BorderRadius.circular(6),
        ),
        child: Icon(
          icon,
          color: isSelected ? _background : _muted,
          size: 18,
        ),
      ),
    );
  }

  Widget _buildBottomSection() {
    // Nav indices: 0=Day, 1=Shows, 2=Network
    // Only show search/add for Shows tab
    final isShowsTab = _currentIndex == 1;

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Search row - only show for Shows tab
          if (isShowsTab) ...[
            Row(
              children: [
                Expanded(
                  child: Container(
                    height: 48,
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    decoration: BoxDecoration(
                      color: _inputBg,
                      borderRadius: BorderRadius.circular(24),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.search, color: _muted, size: 20),
                        SizedBox(width: 12),
                        Text(
                          'Search',
                          style: TextStyle(color: _muted, fontSize: 15),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                const Icon(Icons.tune, color: _muted, size: 22),
                const SizedBox(width: 12),
                GestureDetector(
                  onTap: () => showCreateShowModal(context, widget.orgId),
                  child: Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: _foreground,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Icon(Icons.add, color: _background, size: 24),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
          ],
          // Bottom navigation
          _buildBottomNav(),
        ],
      ),
    );
  }

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

  Widget _buildNavItem(IconData icon, String label, int navIndex) {
    final isSelected = _currentIndex == navIndex;
    final color = isSelected ? _foreground : _muted;

    return GestureDetector(
      onTap: () => _onNavTap(navIndex),
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
