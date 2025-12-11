import 'package:flutter/cupertino.dart';
import '../../../theme/app_theme.dart';
import '../controllers/main_shell_controller.dart';

/// Toggle for switching between list and calendar view
class ShowsViewToggle extends StatelessWidget {
  final ShowsViewMode currentMode;
  final ValueChanged<ShowsViewMode> onModeChanged;
  final Brightness brightness;

  const ShowsViewToggle({
    super.key,
    required this.currentMode,
    required this.onModeChanged,
    required this.brightness,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.getInputBackgroundColor(brightness),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _ToggleButton(
            icon: CupertinoIcons.list_bullet,
            isSelected: currentMode == ShowsViewMode.list,
            brightness: brightness,
            onTap: () => onModeChanged(ShowsViewMode.list),
          ),
          _ToggleButton(
            icon: CupertinoIcons.calendar,
            isSelected: currentMode == ShowsViewMode.calendar,
            brightness: brightness,
            onTap: () => onModeChanged(ShowsViewMode.calendar),
          ),
        ],
      ),
    );
  }
}

/// Toggle for switching between network tabs
class NetworkTabToggle extends StatelessWidget {
  final NetworkTab currentTab;
  final ValueChanged<NetworkTab> onTabChanged;
  final Brightness brightness;

  const NetworkTabToggle({
    super.key,
    required this.currentTab,
    required this.onTabChanged,
    required this.brightness,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.getInputBackgroundColor(brightness),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _ToggleButton(
            icon: CupertinoIcons.person,
            isSelected: currentTab == NetworkTab.team,
            brightness: brightness,
            onTap: () => onTabChanged(NetworkTab.team),
          ),
          _ToggleButton(
            icon: CupertinoIcons.person_2,
            isSelected: currentTab == NetworkTab.promoters,
            brightness: brightness,
            onTap: () => onTabChanged(NetworkTab.promoters),
          ),
          _ToggleButton(
            icon: CupertinoIcons.placemark,
            isSelected: currentTab == NetworkTab.venues,
            brightness: brightness,
            onTap: () => onTabChanged(NetworkTab.venues),
          ),
        ],
      ),
    );
  }
}

class _ToggleButton extends StatelessWidget {
  final IconData icon;
  final bool isSelected;
  final Brightness brightness;
  final VoidCallback onTap;

  const _ToggleButton({
    required this.icon,
    required this.isSelected,
    required this.brightness,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 44,
        height: 36,
        decoration: BoxDecoration(
          color: isSelected
              ? AppTheme.getForegroundColor(brightness)
              : CupertinoColors.transparent,
          borderRadius: BorderRadius.circular(6),
        ),
        child: Icon(
          icon,
          color: isSelected
              ? AppTheme.getBackgroundColor(brightness)
              : AppTheme.getMutedForegroundColor(brightness),
          size: 18,
        ),
      ),
    );
  }
}
