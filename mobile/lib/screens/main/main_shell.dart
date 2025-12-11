import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../theme/app_theme.dart';
import '../shows/create_show_modal.dart';
import '../network/create_person_modal.dart';
import '../network/create_promoter_modal.dart';
import '../network/create_venue_modal.dart';
import 'controllers/main_shell_controller.dart';
import 'dialogs/shows_filter_dialog.dart';
import 'dialogs/network_filter_dialog.dart';
import 'widgets/main_shell_bottom_nav.dart';
import 'widgets/main_shell_search_bar.dart';
import 'widgets/main_shell_header.dart';
import 'widgets/main_shell_toggles.dart';
import 'widgets/main_shell_content.dart';

/// Main shell that wraps Day, Shows (list/calendar), Network screens
/// Uses a FLAT PageView structure for seamless continuous swiping:
/// Day → Shows List → Shows Calendar → Network Team → Network Promoters → Network Venues
class MainShell extends ConsumerStatefulWidget {
  final String orgId;
  final String orgName;
  final int initialTabIndex; // 0=Day, 1=Shows, 2=Network
  final String? showId;
  final ShowsViewMode? initialShowsViewMode;

  const MainShell({
    super.key,
    required this.orgId,
    required this.orgName,
    this.initialTabIndex = 1,
    this.showId,
    this.initialShowsViewMode,
  });

  @override
  ConsumerState<MainShell> createState() => _MainShellState();
}

class _MainShellState extends ConsumerState<MainShell> {
  late MainShellController _controller;
  bool _isInitialized = false;

  // Shows search/filter state
  final TextEditingController _showsSearchController = TextEditingController();
  final FocusNode _showsSearchFocusNode = FocusNode();
  String _showsSearchQuery = '';
  bool _showPastShows = true;
  bool _isShowsSearchFocused = false;

  // Network search/filter state
  final TextEditingController _networkSearchController = TextEditingController();
  final FocusNode _networkSearchFocusNode = FocusNode();
  String _networkSearchQuery = '';
  String? _memberTypeFilter;

  @override
  void initState() {
    super.initState();
    _initializeController();
    _initializeFocusListeners();
    _loadPersistedState();
  }

  void _initializeController() {
    final initialShowsViewMode = widget.initialShowsViewMode ?? ShowsViewMode.list;
    _controller = MainShellController(
      initialTabIndex: widget.initialTabIndex,
      initialShowsViewMode: initialShowsViewMode,
      currentShowId: widget.showId,
    );
  }

  void _initializeFocusListeners() {
    _showsSearchFocusNode.addListener(() {
      setState(() => _isShowsSearchFocused = _showsSearchFocusNode.hasFocus);
    });
  }

  Future<void> _loadPersistedState() async {
    if (widget.initialShowsViewMode == null) {
      final savedMode = await getShowsViewMode();
      if (mounted && savedMode == ShowsViewMode.calendar) {
        // Navigate to calendar if it was the last saved mode
        _controller.navigateToShowsView(savedMode);
      }
    }

    if (_controller.currentShowId == null) {
      final lastShow = await getLastShow();
      if (lastShow != null && lastShow.$1 == widget.orgId && mounted) {
        setState(() => _controller.currentShowId = lastShow.$2);
      }
    }

    if (mounted) setState(() => _isInitialized = true);
  }

  @override
  void dispose() {
    _controller.dispose();
    _showsSearchController.dispose();
    _networkSearchController.dispose();
    _showsSearchFocusNode.dispose();
    _networkSearchFocusNode.dispose();
    super.dispose();
  }

  void _unfocusSearch() {
    _showsSearchFocusNode.unfocus();
    _networkSearchFocusNode.unfocus();
  }

  void _onPageChanged(int flatIndex) {
    setState(() {
      _controller.updateFromFlatIndex(flatIndex);
      // Save shows view mode when changing to a shows page
      if (flatIndex == FlatPageIndex.showsList || flatIndex == FlatPageIndex.showsCalendar) {
        saveShowsViewMode(_controller.showsViewMode);
      }
    });
  }

  void _onShowSelected(String showId) {
    setState(() {
      _controller.currentShowId = showId;
      saveLastShow(widget.orgId, showId);
    });
    _controller.navigateToFlatPage(FlatPageIndex.day);
  }

  String _getNetworkSearchPlaceholder() {
    return switch (_controller.networkTab) {
      NetworkTab.team => 'Search team members...',
      NetworkTab.promoters => 'Search promoters...',
      NetworkTab.venues => 'Search venues...',
    };
  }

  void _handleNetworkAdd() {
    switch (_controller.networkTab) {
      case NetworkTab.team:
        showCreatePersonModal(context, widget.orgId, onPersonCreated: () {});
      case NetworkTab.promoters:
        showCreatePromoterModal(context, widget.orgId, onPromoterCreated: () {});
      case NetworkTab.venues:
        showCreateVenueModal(context, widget.orgId, onVenueCreated: () {});
    }
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
        child: GestureDetector(
          onTap: _unfocusSearch,
          behavior: HitTestBehavior.translucent,
          child: Stack(
            children: [
              Column(
                children: [
                  BrandHeader(brightness: brightness),
                  MainShellTopBar(
                    orgId: widget.orgId,
                    brightness: brightness,
                    centerWidget: _buildCenterWidget(brightness),
                  ),
                  MainShellContent(
                    orgId: widget.orgId,
                    orgName: widget.orgName,
                    currentShowId: _controller.currentShowId,
                    controller: _controller,
                    onPageChanged: _onPageChanged,
                    onShowSelected: _onShowSelected,
                    showsSearchQuery: _showsSearchQuery,
                    showPastShows: _showPastShows,
                    networkSearchQuery: _networkSearchQuery,
                    memberTypeFilter: _memberTypeFilter,
                  ),
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
      ),
    );
  }

  Widget? _buildCenterWidget(Brightness brightness) {
    return switch (_controller.currentTabIndex) {
      0 => null,
      1 => ShowsViewToggle(
          currentMode: _controller.showsViewMode,
          onModeChanged: (mode) {
            _controller.navigateToShowsView(mode);
            setState(() {});
          },
          brightness: brightness,
        ),
      2 => NetworkTabToggle(
          currentTab: _controller.networkTab,
          onTabChanged: (tab) {
            _controller.navigateToNetworkTab(tab);
            setState(() {});
          },
          brightness: brightness,
        ),
      _ => null,
    };
  }

  Widget _buildBottomSection(Brightness brightness) {
    final isShowsTab = _controller.currentTabIndex == 1;
    final isNetworkTab = _controller.currentTabIndex == 2;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (isShowsTab) ...[
          MainShellSearchBar(
            controller: _showsSearchController,
            focusNode: _showsSearchFocusNode,
            placeholder: 'Search shows...',
            onChanged: (value) => setState(() => _showsSearchQuery = value),
            onFilterTap: () => showShowsFilterDialog(
              context: context,
              showPastShows: _showPastShows,
              onShowPastShowsChanged: (value) => setState(() => _showPastShows = value),
            ),
            onAddTap: () => showCreateShowModal(context, widget.orgId),
            isFilterActive: !_showPastShows,
            brightness: brightness,
          ),
          if (!_isShowsSearchFocused) const SizedBox(height: 16),
        ],
        if (isNetworkTab) ...[
          MainShellSearchBar(
            controller: _networkSearchController,
            focusNode: _networkSearchFocusNode,
            placeholder: _getNetworkSearchPlaceholder(),
            onChanged: (value) => setState(() => _networkSearchQuery = value),
            onFilterTap: () {
              if (_controller.networkTab == NetworkTab.team) {
                showNetworkFilterDialog(
                  context: context,
                  currentFilter: _memberTypeFilter,
                  onFilterChanged: (value) => setState(() => _memberTypeFilter = value),
                );
              }
            },
            onAddTap: _handleNetworkAdd,
            isFilterActive: _memberTypeFilter != null,
            brightness: brightness,
          ),
          const SizedBox(height: 16),
        ],
        if (!(isShowsTab && _isShowsSearchFocused))
          MainShellBottomNav(
            currentTabIndex: _controller.currentTabIndex,
            onTabSelected: (index) {
              _controller.navigateToMainTab(index);
              setState(() {});
            },
            brightness: brightness,
          ),
      ],
    );
  }
}
