import 'package:flutter/cupertino.dart';
import '../../shows/shows_list_screen.dart';
import '../../calendar/calendar_content.dart';
import '../../network/network_screen.dart' hide NetworkTab;
import '../../show_day/show_day_content.dart';
import '../controllers/main_shell_controller.dart';

/// Main content area with a SINGLE flat PageView for seamless continuous swiping
/// Pages: Day → Shows List → Shows Calendar → Network Team → Network Promoters → Network Venues
class MainShellContent extends StatelessWidget {
  final String orgId;
  final String orgName;
  final String? currentShowId;
  final MainShellController controller;
  final ValueChanged<int> onPageChanged;
  final ValueChanged<String> onShowSelected;
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
    required this.onShowSelected,
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
          // Page 0: Day
          ShowDayContent(orgId: orgId, showId: currentShowId),
          // Page 1: Shows List
          ShowsContent(
            orgId: orgId,
            orgName: orgName,
            onShowSelected: onShowSelected,
            searchQuery: showsSearchQuery,
            showPastShows: showPastShows,
          ),
          // Page 2: Shows Calendar
          CalendarContent(
            orgId: orgId,
            orgName: orgName,
            onShowSelected: onShowSelected,
          ),
          // Page 3: Network Team
          NetworkContent(
            orgId: orgId,
            orgName: orgName,
            activeTab: NetworkTab.team,
            onTabChanged: (tab) => controller.navigateToNetworkTab(tab),
            searchQuery: networkSearchQuery,
            memberTypeFilter: memberTypeFilter,
          ),
          // Page 4: Network Promoters
          NetworkContent(
            orgId: orgId,
            orgName: orgName,
            activeTab: NetworkTab.promoters,
            onTabChanged: (tab) => controller.navigateToNetworkTab(tab),
            searchQuery: networkSearchQuery,
            memberTypeFilter: memberTypeFilter,
          ),
          // Page 5: Network Venues
          NetworkContent(
            orgId: orgId,
            orgName: orgName,
            activeTab: NetworkTab.venues,
            onTabChanged: (tab) => controller.navigateToNetworkTab(tab),
            searchQuery: networkSearchQuery,
            memberTypeFilter: memberTypeFilter,
          ),
        ],
      ),
    );
  }
}
