import 'package:flutter/cupertino.dart';
import '../../../theme/app_theme.dart';
import './main_shell_controller.dart';

/// UI builder service - handles UI building logic
class MainShellUIBuilder {
  final MainShellController controller;
  final Brightness brightness;
  final VoidCallback onShowFilterDialog;
  final VoidCallback onNetworkFilterDialog;
  final VoidCallback onImportDialog;

  MainShellUIBuilder({
    required this.controller,
    required this.brightness,
    required this.onShowFilterDialog,
    required this.onNetworkFilterDialog,
    required this.onImportDialog,
  });

  /// Build network tab toggle button
  Widget buildNetworkToggle(
    IconData icon,
    NetworkTab tab,
    VoidCallback onTap,
  ) {
    final isSelected = controller.networkTab == tab;
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
          size: 20,
        ),
      ),
    );
  }

  /// Build shows view mode toggle button
  Widget buildViewModeToggle(
    IconData icon,
    bool isSelected,
    VoidCallback onTap,
  ) {
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

  /// Build nav item for bottom navigation
  Widget buildNavItem(
    IconData icon,
    String label,
    int navIndex,
    VoidCallback onTap,
  ) {
    final isSelected = controller.currentTabIndex == navIndex;
    final color = isSelected ? AppTheme.getForegroundColor(brightness) : AppTheme.getMutedForegroundColor(brightness);

    return GestureDetector(
      onTap: onTap,
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

  /// Build brand header
  Widget buildBrandHeader() {
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
}
