import 'package:flutter/cupertino.dart';
import '../../shows/shows_list_screen.dart';
import '../../calendar/calendar_content.dart';
import '../../network/network_screen.dart' hide NetworkTab;
import '../../show_day/show_day_content.dart';
import '../controllers/main_shell_controller.dart';

/// Main content area with swipeable pages
class MainShellContent extends StatelessWidget {
  final String orgId;
  final String orgName;
  final String? currentShowId;
  final MainShellController controller;
  final ValueChanged<int> onPageChanged;
  final ValueChanged<int> onShowsPageChanged;
  final ValueChanged<int> onNetworkPageChanged;
  final ValueChanged<String> onShowSelected;
  final ValueChanged<NetworkTab> onNetworkTabChanged;
  final String showsSearchQuery;
  final bool showPastShows;
  final String networkSearchQuery;
  final String? memberTypeFilter;

  const MainShellContent({
    super.key,
    required this.orgId,
    required this.orgName,
    required this.currentShowId,
    required this.controller,
    required this.onPageChanged,
    required this.onShowsPageChanged,
    required this.onNetworkPageChanged,
    required this.onShowSelected,
    required this.onNetworkTabChanged,
    required this.showsSearchQuery,
    required this.showPastShows,
    required this.networkSearchQuery,
    this.memberTypeFilter,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: PageView(
        controller: controller.pageController,
        onPageChanged: onPageChanged,
        children: [
          // Tab 0: Day view
          ShowDayContent(orgId: orgId, showId: currentShowId),
          // Tab 1: Shows (swipeable between list and calendar)
          _buildShowsPages(),
          // Tab 2: Network (swipeable between team/promoters/venues)
          _buildNetworkPages(),
        ],
      ),
    );
  }

  Widget _buildShowsPages() {
    return PageView(
      controller: controller.showsPageController,
      onPageChanged: onShowsPageChanged,
      children: [
        ShowsContent(
          orgId: orgId,
          orgName: orgName,
          onShowSelected: onShowSelected,
          searchQuery: showsSearchQuery,
          showPastShows: showPastShows,
        ),
        CalendarContent(
          orgId: orgId,
          orgName: orgName,
          onShowSelected: onShowSelected,
        ),
      ],
    );
  }

  Widget _buildNetworkPages() {
    return PageView(
      controller: controller.networkPageController,
      onPageChanged: onNetworkPageChanged,
      children: NetworkTab.values.map((tab) {
        return NetworkContent(
          orgId: orgId,
          orgName: orgName,
          activeTab: tab,
          onTabChanged: onNetworkTabChanged,
          searchQuery: networkSearchQuery,
          memberTypeFilter: memberTypeFilter,
        );
      }).toList(),
    );
  }
}
