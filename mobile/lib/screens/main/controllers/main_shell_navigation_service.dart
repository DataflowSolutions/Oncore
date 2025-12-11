import 'package:flutter/cupertino.dart';
import './main_shell_controller.dart';

/// Navigation service - handles all navigation operations
class MainShellNavigationService {
  final MainShellController controller;
  final VoidCallback? onShowSelected;
  final Function(String orgId, String showId)? onSaveLastShow;

  MainShellNavigationService({
    required this.controller,
    this.onShowSelected,
    this.onSaveLastShow,
  });

  /// Navigate to main tab
  void navigateToMainTab(int index, {Duration duration = const Duration(milliseconds: 300)}) {
    controller.pageController.animateToPage(
      index,
      duration: duration,
      curve: Curves.easeInOut,
    );
  }

  /// Navigate to shows view (list or calendar)
  void navigateToShowsView(ShowsViewMode mode, {Duration duration = const Duration(milliseconds: 300)}) {
    controller.updateShowsViewMode(mode);
    saveShowsViewMode(mode);
    
    final index = mode == ShowsViewMode.calendar ? 1 : 0;
    controller.showsPageController.animateToPage(
      index,
      duration: duration,
      curve: Curves.easeInOut,
    );
  }

  /// Navigate to network tab
  void navigateToNetworkTab(NetworkTab tab, {Duration duration = const Duration(milliseconds: 300)}) {
    final index = NetworkTab.values.indexOf(tab);
    controller.updateNetworkTab(tab);
    
    controller.networkPageController.animateToPage(
      index,
      duration: duration,
      curve: Curves.easeInOut,
    );
  }

  /// Handle show selection - saves and navigates to day view
  void selectShow(String showId, String orgId) {
    controller.currentShowId = showId;
    onSaveLastShow?.call(orgId, showId);
    
    navigateToMainTab(0);
  }

  /// Handle shows page change
  void onShowsPageChanged(int index) {
    controller.updateShowsPageIndex(index);
    saveShowsViewMode(controller.showsViewMode);
  }

  /// Handle network page change
  void onNetworkPageChanged(int index) {
    controller.updateNetworkTab(NetworkTab.values[index]);
  }
}
