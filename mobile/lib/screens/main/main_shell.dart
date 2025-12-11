import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../theme/app_theme.dart';
import '../shows/create_show_modal.dart';
import '../network/create_person_modal.dart';
import '../network/create_promoter_modal.dart';
import '../network/create_venue_modal.dart';
import 'controllers/main_shell_controller.dart';
import 'controllers/main_shell_navigation_service.dart';
import 'dialogs/shows_filter_dialog.dart';
import 'dialogs/network_filter_dialog.dart';
import 'widgets/main_shell_bottom_nav.dart';
import 'widgets/main_shell_search_bar.dart';
import 'widgets/main_shell_header.dart';
import 'widgets/main_shell_toggles.dart';
import 'widgets/main_shell_content.dart';

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
  late MainShellController _controller;
  late MainShellNavigationService _navigationService;
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
  bool _isNetworkSearchFocused = false;

  @override
  void initState() {
    super.initState();
    _initializeControllers();
    _initializeFocusListeners();
    _loadPersistedState();
  }

  void _initializeControllers() {
    final initialShowsViewMode = widget.initialShowsViewMode ?? ShowsViewMode.list;
    _controller = MainShellController(
      initialTabIndex: widget.initialTabIndex,
      initialShowsViewMode: initialShowsViewMode,
      currentShowId: widget.showId,
    );

    _navigationService = MainShellNavigationService(
      controller: _controller,
      onSaveLastShow: saveLastShow,
    );
  }

  void _initializeFocusListeners() {
    _showsSearchFocusNode.addListener(() {
      setState(() => _isShowsSearchFocused = _showsSearchFocusNode.hasFocus);
    });
    _networkSearchFocusNode.addListener(() {
      setState(() => _isNetworkSearchFocused = _networkSearchFocusNode.hasFocus);
    });
  }

  Future<void> _loadPersistedState() async {
    if (widget.initialShowsViewMode == null) {
      final savedMode = await getShowsViewMode();
      if (mounted) {
        setState(() => _controller.updateShowsViewMode(savedMode));
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
                    onPageChanged: (index) => setState(() => _controller.updateTabIndex(index)),
                    onShowsPageChanged: (index) {
                      setState(() => _controller.updateShowsPageIndex(index));
                      saveShowsViewMode(_controller.showsViewMode);
                    },
                    onNetworkPageChanged: (index) {
                      setState(() => _controller.updateNetworkPageIndex(index));
                    },
                    onShowSelected: (showId) => _navigationService.selectShow(showId, widget.orgId),
                    onNetworkTabChanged: (tab) => _navigationService.navigateToNetworkTab(tab),
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
          onModeChanged: (mode) => _navigationService.navigateToShowsView(mode),
          brightness: brightness,
        ),
      2 => NetworkTabToggle(
          currentTab: _controller.networkTab,
          onTabChanged: (tab) => _navigationService.navigateToNetworkTab(tab),
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
            onTabSelected: (index) => _navigationService.navigateToMainTab(index),
            brightness: brightness,
          ),
      ],
    );
  }
}
