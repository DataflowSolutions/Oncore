import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../shows/shows_list_screen.dart';
import '../shows/create_show_modal.dart';
import '../network/network_screen.dart';
import '../calendar/calendar_content.dart';
import '../show_day/show_day_content.dart';
import '../../components/profile_dropdown.dart';

/// Storage key for last viewed show
const String _lastShowKey = 'oncore_last_show';

/// Storage key for shows view mode (list/calendar)
const String _showsViewModeKey = 'oncore_shows_view_mode';

/// Shows view modes
enum ShowsViewMode { list, calendar }

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

/// Helper to save shows view mode
Future<void> saveShowsViewMode(ShowsViewMode mode) async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.setString(_showsViewModeKey, mode == ShowsViewMode.calendar ? 'calendar' : 'list');
}

/// Helper to get shows view mode
Future<ShowsViewMode> getShowsViewMode() async {
  final prefs = await SharedPreferences.getInstance();
  final stored = prefs.getString(_showsViewModeKey);
  return stored == 'calendar' ? ShowsViewMode.calendar : ShowsViewMode.list;
}

/// Main shell that wraps Day, Shows (list/calendar), Network screens
/// This is Layer 1 - always shows the bottom navigation bar
/// All three tabs are swipeable and at the same hierarchy level
class MainShell extends ConsumerStatefulWidget {
  final String orgId;
  final String orgName;
  final int initialTabIndex; // 0=Day, 1=Shows, 2=Network
  final String? showId; // Optional: specific show to display in Day view
  final ShowsViewMode? initialShowsViewMode;

  const MainShell({
    super.key,
    required this.orgId,
    required this.orgName,
    this.initialTabIndex = 1, // Default to Shows
    this.showId,
    this.initialShowsViewMode,
  });

  @override
  ConsumerState<MainShell> createState() => _MainShellState();
}

class _MainShellState extends ConsumerState<MainShell> {
  late PageController _pageController;
  late int _currentTabIndex; // 0=Day, 1=Shows, 2=Network
  late ShowsViewMode _showsViewMode;
  NetworkTab _networkTab = NetworkTab.team;
  bool _isInitialized = false;
  String? _currentShowId;

  @override
  void initState() {
    super.initState();
    _currentTabIndex = widget.initialTabIndex;
    _currentShowId = widget.showId;
    _showsViewMode = widget.initialShowsViewMode ?? ShowsViewMode.list;
    _pageController = PageController(initialPage: widget.initialTabIndex);
    
    _initialize();
  }

  Future<void> _initialize() async {
    // Load saved view mode if not provided
    if (widget.initialShowsViewMode == null) {
      final savedMode = await getShowsViewMode();
      if (mounted) {
        setState(() {
          _showsViewMode = savedMode;
        });
      }
    }
    
    // Load last show if no showId provided and we're on Day tab
    if (_currentShowId == null) {
      final lastShow = await getLastShow();
      if (lastShow != null && lastShow.$1 == widget.orgId && mounted) {
        setState(() {
          _currentShowId = lastShow.$2;
        });
      }
    }
    
    if (mounted) {
      setState(() {
        _isInitialized = true;
      });
    }
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _onPageChanged(int index) {
    setState(() {
      _currentTabIndex = index;
    });
  }

  void _onNavTap(int index) {
    _pageController.animateToPage(
      index,
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOut,
    );
  }

  void _toggleShowsViewMode(ShowsViewMode mode) {
    if (_showsViewMode != mode) {
      setState(() {
        _showsViewMode = mode;
      });
      saveShowsViewMode(mode);
    }
  }

  /// Called when a show is selected from the Shows list or Calendar
  void _onShowSelected(String showId) {
    setState(() {
      _currentShowId = showId;
    });
    saveLastShow(widget.orgId, showId);
    // Navigate to Day tab
    _pageController.animateToPage(
      0,
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOut,
    );
  }

  void _showImportDialog(ColorScheme colorScheme) {
    showModalBottomSheet(
      context: context,
      backgroundColor: colorScheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Import',
              style: TextStyle(
                color: colorScheme.onSurface,
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Import advancing documents, itineraries, or show data files to quickly populate your show details.',
              style: TextStyle(
                color: colorScheme.onSurfaceVariant,
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: () {
                  Navigator.pop(context);
                  // TODO: Implement file import
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Import feature coming soon')),
                  );
                },
                icon: const Icon(Icons.upload_file),
                label: const Text('Select File'),
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Cancel'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    
    if (!_isInitialized) {
      return Scaffold(
        backgroundColor: colorScheme.surface,
        body: Center(
          child: CircularProgressIndicator(color: colorScheme.onSurface),
        ),
      );
    }
    
    return Scaffold(
      backgroundColor: colorScheme.surface,
      body: SafeArea(
        child: Stack(
          children: [
            Column(
              children: [
                // Brand header
                _buildBrandHeader(colorScheme),
                _buildTopBar(colorScheme),
                Expanded(
                  child: PageView(
                    controller: _pageController,
                    onPageChanged: _onPageChanged,
                    children: [
                      // Tab 0: Day view
                      ShowDayContent(orgId: widget.orgId, showId: _currentShowId),
                      // Tab 1: Shows (list or calendar)
                      _showsViewMode == ShowsViewMode.calendar
                          ? CalendarContent(
                              orgId: widget.orgId,
                              orgName: widget.orgName,
                              onShowSelected: _onShowSelected,
                            )
                          : ShowsContent(
                              orgId: widget.orgId,
                              orgName: widget.orgName,
                              onShowSelected: _onShowSelected,
                            ),
                      // Tab 2: Network
                      NetworkContent(
                        orgId: widget.orgId,
                        orgName: widget.orgName,
                        activeTab: _networkTab,
                        onTabChanged: (tab) => setState(() => _networkTab = tab),
                      ),
                    ],
                  ),
                ),
                // Spacer for bottom navigation
                const SizedBox(),
              ],
            ),
            Positioned(
              left: 16,
              right: 16,
              bottom: 16,
              child: _buildBottomSection(colorScheme),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTopBar(ColorScheme colorScheme) {
    final isDayTab = _currentTabIndex == 0;
    final isShowsTab = _currentTabIndex == 1;
    final isNetworkTab = _currentTabIndex == 2;

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      child: Row(
        children: [
          // Left: Profile icon (tappable)
          GestureDetector(
            onTap: () => ProfileDropdown.show(context, ref),
            child: Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: colorScheme.onSurfaceVariant, width: 1.5),
              ),
              child: Icon(Icons.person_outline, color: colorScheme.onSurface, size: 20),
            ),
          ),
          // Center: View toggle (Shows list/calendar or Network tabs)
          Expanded(
            child: Center(
              child: isDayTab
                  // Day tab - no toggle, just empty or could show something else
                  ? const SizedBox.shrink()
                  : isShowsTab
                      ? Container(
                          decoration: BoxDecoration(
                            color: colorScheme.surfaceContainerHigh,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              _buildViewModeToggle(
                                Icons.format_list_bulleted,
                                _showsViewMode == ShowsViewMode.list,
                                colorScheme,
                                () => _toggleShowsViewMode(ShowsViewMode.list),
                              ),
                              _buildViewModeToggle(
                                Icons.calendar_today_outlined,
                                _showsViewMode == ShowsViewMode.calendar,
                                colorScheme,
                                () => _toggleShowsViewMode(ShowsViewMode.calendar),
                              ),
                            ],
                          ),
                        )
                      : isNetworkTab
                          ? Container(
                              decoration: BoxDecoration(
                                color: colorScheme.surfaceContainerHigh,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  _buildNetworkToggle(Icons.person_outline, NetworkTab.team, colorScheme),
                                  _buildNetworkToggle(Icons.groups_outlined, NetworkTab.promoters, colorScheme),
                                  _buildNetworkToggle(Icons.location_on_outlined, NetworkTab.venues, colorScheme),
                                ],
                              ),
                            )
                          : const SizedBox.shrink(),
            ),
          ),
          // Right: Import button + Settings icon
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Import button
              GestureDetector(
                onTap: () => _showImportDialog(colorScheme),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  child: Icon(Icons.file_upload_outlined, color: colorScheme.onSurface, size: 22),
                ),
              ),
              // Settings icon
              GestureDetector(
                onTap: () => context.push('/org/${widget.orgId}/settings'),
                child: Icon(Icons.settings_outlined, color: colorScheme.onSurface, size: 22),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildNetworkToggle(IconData icon, NetworkTab tab, ColorScheme colorScheme) {
    final isSelected = _networkTab == tab;
    return GestureDetector(
      onTap: () => setState(() => _networkTab = tab),
      child: Container(
        width: 44,
        height: 36,
        decoration: BoxDecoration(
          color: isSelected ? colorScheme.onSurface : Colors.transparent,
          borderRadius: BorderRadius.circular(6),
        ),
        child: Icon(
          icon,
          color: isSelected ? colorScheme.surface : colorScheme.onSurfaceVariant,
          size: 20,
        ),
      ),
    );
  }

  Widget _buildViewModeToggle(IconData icon, bool isSelected, ColorScheme colorScheme, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 40,
        height: 32,
        decoration: BoxDecoration(
          color: isSelected ? colorScheme.onSurface : Colors.transparent,
          borderRadius: BorderRadius.circular(6),
        ),
        child: Icon(
          icon,
          color: isSelected ? colorScheme.surface : colorScheme.onSurfaceVariant,
          size: 18,
        ),
      ),
    );
  }

  Widget _buildBottomSection(ColorScheme colorScheme) {
    final isShowsTab = _currentTabIndex == 1;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Search row - only show for Shows tab
        if (isShowsTab) ...[
          Padding(
            padding: const EdgeInsets.fromLTRB(0, 0, 0, 0),
            child: Row(
              children: [
                Expanded(
                  child: Container(
                    height: 48,
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    decoration: BoxDecoration(
                      color: colorScheme.surfaceContainerHigh,
                      borderRadius: BorderRadius.circular(24),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.search, color: colorScheme.onSurfaceVariant, size: 20),
                        const SizedBox(width: 12),
                        Text(
                          'Search',
                          style: TextStyle(color: colorScheme.onSurfaceVariant, fontSize: 15),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Icon(Icons.tune, color: colorScheme.onSurfaceVariant, size: 22),
                const SizedBox(width: 12),
                GestureDetector(
                  onTap: () => showCreateShowModal(context, widget.orgId),
                  child: Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: colorScheme.onSurface,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Icon(Icons.add, color: colorScheme.surface, size: 24),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
        ],
        // Bottom navigation - always visible on Layer 1
        ColoredBox(
          color: Colors.transparent,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(0, 0, 0, 0), // (1, 2, 3, 4) = (left, top, right, bottom)
            child: _buildBottomNav(colorScheme),
          ),
        ),
      ],
    );
  }

  Widget _buildBottomNav(ColorScheme colorScheme) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
      decoration: BoxDecoration(
        color: const Color(0xFF282828),
        borderRadius: BorderRadius.circular(100),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          _buildNavItem(Icons.play_arrow_outlined, 'Day', 0, colorScheme),
          _buildNavItem(Icons.format_list_bulleted, 'Shows', 1, colorScheme),
          _buildNavItem(Icons.people_outline, 'Network', 2, colorScheme),
        ],
      ),
    );
  }

  Widget _buildBrandHeader(ColorScheme colorScheme) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      child: Center(
        child: Text(
          'Oncore',
          style: TextStyle(
            color: colorScheme.onSurface,
            fontSize: 24,
            fontWeight: FontWeight.w900,
            letterSpacing: -0.5,
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem(IconData icon, String label, int navIndex, ColorScheme colorScheme) {
    final isSelected = _currentTabIndex == navIndex;
    final color = isSelected ? colorScheme.onSurface : colorScheme.onSurfaceVariant;

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
