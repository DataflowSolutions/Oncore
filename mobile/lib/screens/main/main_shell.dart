import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../theme/app_theme.dart';
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
  
  // Shows search/filter state
  final TextEditingController _showsSearchController = TextEditingController();
  String _showsSearchQuery = '';
  bool _showPastShows = true;

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
    _showsSearchController.dispose();
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

  void _showImportDialog(Brightness brightness) {
    showCupertinoModalPopup(
      context: context,
      builder: (context) => Container(
        decoration: BoxDecoration(
          color: AppTheme.getCardColor(brightness),
          borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
        ),
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Import',
              style: TextStyle(
                color: AppTheme.getForegroundColor(brightness),
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Import advancing documents, itineraries, or show data files to quickly populate your show details.',
              style: TextStyle(
                color: AppTheme.getMutedForegroundColor(brightness),
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: CupertinoButton.filled(
                onPressed: () {
                  Navigator.pop(context);
                  // TODO: Implement file import
                },
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: const [
                    Icon(CupertinoIcons.arrow_up_doc, color: CupertinoColors.white),
                    SizedBox(width: 8),
                    Text('Select File'),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: CupertinoButton(
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
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;
    
    if (!_isInitialized) {
      return CupertinoPageScaffold(
        backgroundColor: AppTheme.getBackgroundColor(brightness),
        child: Center(
          child: CupertinoActivityIndicator(color: AppTheme.getForegroundColor(brightness)),
        ),
      );
    }
    
    return CupertinoPageScaffold(
      backgroundColor: AppTheme.getBackgroundColor(brightness),
      child: SafeArea(
        child: Stack(
          children: [
            Column(
              children: [
                // Brand header
                _buildBrandHeader(brightness),
                _buildTopBar(brightness),
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
                            searchQuery: _showsSearchQuery,
                            showPastShows: _showPastShows,
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
              child: _buildBottomSection(brightness),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTopBar(Brightness brightness) {
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
                border: Border.all(color: AppTheme.getMutedForegroundColor(brightness), width: 1.5),
              ),
              child: Icon(CupertinoIcons.person, color: AppTheme.getForegroundColor(brightness), size: 20),
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
                            color: AppTheme.getInputBackgroundColor(brightness),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              _buildViewModeToggle(
                                CupertinoIcons.list_bullet,
                                _showsViewMode == ShowsViewMode.list,
                                brightness,
                                () => _toggleShowsViewMode(ShowsViewMode.list),
                              ),
                              _buildViewModeToggle(
                                CupertinoIcons.calendar,
                                _showsViewMode == ShowsViewMode.calendar,
                                brightness,
                                () => _toggleShowsViewMode(ShowsViewMode.calendar),
                              ),
                            ],
                          ),
                        )
                      : isNetworkTab
                          ? Container(
                              decoration: BoxDecoration(
                                color: AppTheme.getInputBackgroundColor(brightness),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  _buildNetworkToggle(CupertinoIcons.person, NetworkTab.team, brightness),
                                  _buildNetworkToggle(CupertinoIcons.person_2, NetworkTab.promoters, brightness),
                                  _buildNetworkToggle(CupertinoIcons.placemark, NetworkTab.venues, brightness),
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
              
              // Settings icon
              GestureDetector(
                onTap: () => context.push('/org/${widget.orgId}/settings'),
                child: Icon(CupertinoIcons.settings, color: AppTheme.getForegroundColor(brightness) , size: 28),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildNetworkToggle(IconData icon, NetworkTab tab, Brightness brightness) {
    final isSelected = _networkTab == tab;
    return GestureDetector(
      onTap: () => setState(() => _networkTab = tab),
      child: Container(
        width: 44,
        height: 36,
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.getForegroundColor(brightness) : CupertinoColors.transparent,
          borderRadius: BorderRadius.circular(6),
        ),
        child: Icon(
          icon,
          color: isSelected ? AppTheme.getBackgroundColor(brightness) : AppTheme.getMutedForegroundColor(brightness),
          size: 20,
        ),
      ),
    );
  }

  Widget _buildViewModeToggle(IconData icon, bool isSelected, Brightness brightness, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 44,
        height: 36,
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.getForegroundColor(brightness) : CupertinoColors.transparent,
          borderRadius: BorderRadius.circular(6),
        ),
        child: Icon(
          icon,
          color: isSelected ? AppTheme.getBackgroundColor(brightness) : AppTheme.getMutedForegroundColor(brightness),
          size: 18,
        ),
      ),
    );
  }

  Widget _buildBottomSection(Brightness brightness) {
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
                  child: CupertinoSearchTextField(
                    controller: _showsSearchController,
                    onChanged: (value) => setState(() => _showsSearchQuery = value),
                    placeholder: 'Search shows...',
                    style: TextStyle(color: AppTheme.getForegroundColor(brightness), fontSize: 15),
                    itemColor: AppTheme.getMutedForegroundColor(brightness),
                    decoration: BoxDecoration(
                      color: AppTheme.getInputBackgroundColor(brightness),
                      borderRadius: BorderRadius.circular(24),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                GestureDetector(
                  onTap: _showFilterDialog,
                  child: Icon(
                    CupertinoIcons.slider_horizontal_3,
                    color: _showPastShows ? AppTheme.getMutedForegroundColor(brightness) : AppTheme.getPrimaryColor(brightness),
                    size: 28,
                  ),
                ),
                const SizedBox(width: 16),
                GestureDetector(
                  onTap: () => showCreateShowModal(context, widget.orgId),
                  child: Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: AppTheme.getForegroundColor(brightness),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Icon(CupertinoIcons.add, color: AppTheme.getBackgroundColor(brightness), size: 24),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
        ],
        // Bottom navigation - always visible on Layer 1
        ColoredBox(
          color: CupertinoColors.systemBackground.withOpacity(0),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(0, 0, 0, 0), // (1, 2, 3, 4) = (left, top, right, bottom)
            child: _buildBottomNav(brightness),
          ),
        ),
      ],
    );
  }

  Widget _buildBottomNav(Brightness brightness) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
      decoration: BoxDecoration(
        color: const Color(0xFF282828),
        borderRadius: BorderRadius.circular(100),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          _buildNavItem(CupertinoIcons.play, 'Day', 0, brightness),
          _buildNavItem(CupertinoIcons.list_bullet, 'Shows', 1, brightness),
          _buildNavItem(CupertinoIcons.person_2, 'Network', 2, brightness),
        ],
      ),
    );
  }

  Widget _buildBrandHeader(Brightness brightness) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      child: Center(
        child: Text(
          'Oncore',
          style: TextStyle(
            color: AppTheme.getForegroundColor(brightness),
            fontSize: 24,
            fontWeight: FontWeight.w900,
            letterSpacing: -0.5,
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem(IconData icon, String label, int navIndex, Brightness brightness) {
    final isSelected = _currentTabIndex == navIndex;
    final color = isSelected ? AppTheme.getForegroundColor(brightness) : AppTheme.getMutedForegroundColor(brightness);

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
