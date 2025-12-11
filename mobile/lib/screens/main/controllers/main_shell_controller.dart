import 'package:flutter/cupertino.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../network/network_screen.dart' show NetworkTab;

// Re-export NetworkTab for convenience
export '../../network/network_screen.dart' show NetworkTab;

/// Navigation tab types
enum ShowsViewMode { list, calendar }

/// Flat page indices for continuous swiping
/// Page 0: Day
/// Page 1: Shows List
/// Page 2: Shows Calendar
/// Page 3: Network Team
/// Page 4: Network Promoters
/// Page 5: Network Venues
class FlatPageIndex {
  static const int day = 0;
  static const int showsList = 1;
  static const int showsCalendar = 2;
  static const int networkTeam = 3;
  static const int networkPromoters = 4;
  static const int networkVenues = 5;
  static const int totalPages = 6;

  /// Get main tab index (0=Day, 1=Shows, 2=Network) from flat page index
  static int getMainTabIndex(int flatIndex) {
    if (flatIndex == day) return 0;
    if (flatIndex <= showsCalendar) return 1;
    return 2;
  }

  /// Get shows view mode from flat page index
  static ShowsViewMode getShowsViewMode(int flatIndex) {
    return flatIndex == showsCalendar ? ShowsViewMode.calendar : ShowsViewMode.list;
  }

  /// Get network tab from flat page index
  static NetworkTab getNetworkTab(int flatIndex) {
    return switch (flatIndex) {
      networkPromoters => NetworkTab.promoters,
      networkVenues => NetworkTab.venues,
      _ => NetworkTab.team,
    };
  }

  /// Get flat page index from main tab and sub-indices
  static int fromMainTab(int mainTabIndex, {ShowsViewMode? showsMode, NetworkTab? networkTab}) {
    return switch (mainTabIndex) {
      0 => day,
      1 => showsMode == ShowsViewMode.calendar ? showsCalendar : showsList,
      2 => switch (networkTab) {
          NetworkTab.promoters => networkPromoters,
          NetworkTab.venues => networkVenues,
          _ => networkTeam,
        },
      _ => day,
    };
  }
}

/// Storage key for last viewed show
const String _lastShowKey = 'oncore_last_show';

/// Storage key for shows view mode (list/calendar)
const String _showsViewModeKey = 'oncore_shows_view_mode';

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

/// Main shell controller - handles navigation with flat page structure
/// All pages are in a single PageView for seamless continuous swiping
class MainShellController {
  final PageController pageController;
  
  int _currentFlatIndex = 0;
  String? currentShowId;

  MainShellController({
    required int initialTabIndex,
    required ShowsViewMode initialShowsViewMode,
    this.currentShowId,
  }) : pageController = PageController(
         initialPage: FlatPageIndex.fromMainTab(
           initialTabIndex,
           showsMode: initialShowsViewMode,
         ),
       ) {
    _currentFlatIndex = FlatPageIndex.fromMainTab(
      initialTabIndex,
      showsMode: initialShowsViewMode,
    );
  }

  /// Current flat page index (0-5)
  int get currentFlatIndex => _currentFlatIndex;

  /// Current main tab index (0=Day, 1=Shows, 2=Network)
  int get currentTabIndex => FlatPageIndex.getMainTabIndex(_currentFlatIndex);

  /// Current shows view mode
  ShowsViewMode get showsViewMode => FlatPageIndex.getShowsViewMode(_currentFlatIndex);

  /// Current network tab
  NetworkTab get networkTab => FlatPageIndex.getNetworkTab(_currentFlatIndex);

  /// Update from flat page index (called on page swipe)
  void updateFromFlatIndex(int flatIndex) {
    _currentFlatIndex = flatIndex;
  }

  /// Navigate to a specific flat page
  void navigateToFlatPage(int flatIndex, {Duration duration = const Duration(milliseconds: 300)}) {
    pageController.animateToPage(
      flatIndex,
      duration: duration,
      curve: Curves.easeInOut,
    );
  }

  /// Navigate to main tab (jumps to first sub-page of that tab)
  void navigateToMainTab(int mainTabIndex) {
    final targetPage = switch (mainTabIndex) {
      0 => FlatPageIndex.day,
      1 => FlatPageIndex.showsList,
      2 => FlatPageIndex.networkTeam,
      _ => FlatPageIndex.day,
    };
    navigateToFlatPage(targetPage);
  }

  /// Navigate to shows view mode
  void navigateToShowsView(ShowsViewMode mode) {
    final targetPage = mode == ShowsViewMode.calendar 
        ? FlatPageIndex.showsCalendar 
        : FlatPageIndex.showsList;
    navigateToFlatPage(targetPage);
    saveShowsViewMode(mode);
  }

  /// Navigate to network tab
  void navigateToNetworkTab(NetworkTab tab) {
    final targetPage = switch (tab) {
      NetworkTab.team => FlatPageIndex.networkTeam,
      NetworkTab.promoters => FlatPageIndex.networkPromoters,
      NetworkTab.venues => FlatPageIndex.networkVenues,
    };
    navigateToFlatPage(targetPage);
  }

  void dispose() {
    pageController.dispose();
  }
}
