import 'package:flutter/cupertino.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../network/network_screen.dart' show NetworkTab;

// Re-export NetworkTab for convenience
export '../../network/network_screen.dart' show NetworkTab;

/// Navigation tab types
enum ShowsViewMode { list, calendar }

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

/// Main shell controller - handles navigation and state management
class MainShellController {
  final PageController pageController;
  final PageController showsPageController;
  final PageController networkPageController;
  
  int currentTabIndex = 0;
  ShowsViewMode showsViewMode = ShowsViewMode.list;
  int currentShowsPageIndex = 0;
  NetworkTab networkTab = NetworkTab.team;
  int currentNetworkPageIndex = 0;
  String? currentShowId;

  MainShellController({
    required int initialTabIndex,
    required ShowsViewMode initialShowsViewMode,
    this.currentShowId,
  })  : pageController = PageController(initialPage: initialTabIndex),
        showsPageController = PageController(
          initialPage: initialShowsViewMode == ShowsViewMode.calendar ? 1 : 0,
        ),
        networkPageController = PageController(initialPage: 0) {
    currentTabIndex = initialTabIndex;
    showsViewMode = initialShowsViewMode;
    currentShowsPageIndex = initialShowsViewMode == ShowsViewMode.calendar ? 1 : 0;
    currentNetworkPageIndex = 0;
  }

  void updateTabIndex(int index) {
    currentTabIndex = index;
  }

  void updateShowsViewMode(ShowsViewMode mode) {
    showsViewMode = mode;
    currentShowsPageIndex = mode == ShowsViewMode.calendar ? 1 : 0;
  }

  void updateShowsPageIndex(int index) {
    currentShowsPageIndex = index;
    showsViewMode = index == 1 ? ShowsViewMode.calendar : ShowsViewMode.list;
  }

  void updateNetworkTab(NetworkTab tab) {
    networkTab = tab;
    currentNetworkPageIndex = NetworkTab.values.indexOf(tab);
  }

  void updateNetworkPageIndex(int index) {
    currentNetworkPageIndex = index;
    networkTab = NetworkTab.values[index];
  }

  void dispose() {
    pageController.dispose();
    showsPageController.dispose();
    networkPageController.dispose();
  }
}
