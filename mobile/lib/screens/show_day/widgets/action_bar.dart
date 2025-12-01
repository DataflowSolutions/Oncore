import 'package:flutter/material.dart';
import '../../../theme/app_theme.dart';

/// Action item data for the action bar
class ActionItem {
  final IconData icon;
  final String? label;
  final VoidCallback? onTap;

  const ActionItem({
    required this.icon,
    this.label,
    this.onTap,
  });
}

/// Action bar widget with icon buttons
/// Displays a row of action icons (team, time, fullscreen, etc.)
class ActionBar extends StatelessWidget {
  final List<ActionItem> actions;

  const ActionBar({
    super.key,
    required this.actions,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppTheme.spacingMd,
        vertical: AppTheme.spacingSm,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: actions.map((action) => _ActionButton(action: action)).toList(),
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  final ActionItem action;

  const _ActionButton({required this.action});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: action.onTap,
      borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
      child: Padding(
        padding: const EdgeInsets.all(AppTheme.spacingSm),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              action.icon,
              color: AppTheme.muted,
              size: 22,
            ),
            if (action.label != null) ...[
              const SizedBox(height: 4),
              Text(
                action.label!,
                style: AppTheme.bodySmall.copyWith(
                  color: AppTheme.muted,
                  fontSize: 10,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
