import 'package:flutter/cupertino.dart';
import '../../../theme/app_theme.dart';

/// Bottom navigation bar for the main shell
class MainShellBottomNav extends StatelessWidget {
  final int currentTabIndex;
  final ValueChanged<int> onTabSelected;
  final Brightness brightness;

  const MainShellBottomNav({
    super.key,
    required this.currentTabIndex,
    required this.onTabSelected,
    required this.brightness,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
      decoration: BoxDecoration(
        color: const Color(0xFF282828),
        borderRadius: BorderRadius.circular(100),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          _NavItem(
            icon: CupertinoIcons.play,
            label: 'Day',
            isSelected: currentTabIndex == 0,
            brightness: brightness,
            onTap: () => onTabSelected(0),
          ),
          _NavItem(
            icon: CupertinoIcons.list_bullet,
            label: 'Shows',
            isSelected: currentTabIndex == 1,
            brightness: brightness,
            onTap: () => onTabSelected(1),
          ),
          _NavItem(
            icon: CupertinoIcons.person_2,
            label: 'Network',
            isSelected: currentTabIndex == 2,
            brightness: brightness,
            onTap: () => onTabSelected(2),
          ),
        ],
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isSelected;
  final Brightness brightness;
  final VoidCallback onTap;

  const _NavItem({
    required this.icon,
    required this.label,
    required this.isSelected,
    required this.brightness,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final color = isSelected
        ? AppTheme.getForegroundColor(brightness)
        : AppTheme.getMutedForegroundColor(brightness);

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
}
