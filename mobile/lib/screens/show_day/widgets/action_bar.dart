import 'package:flutter/material.dart';

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
        horizontal: 16,
        vertical: 8,
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
    final colorScheme = Theme.of(context).colorScheme;
    
    return GestureDetector(
      onTap: action.onTap,
      behavior: HitTestBehavior.opaque,
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              action.icon,
              color: colorScheme.onSurfaceVariant,
              size: 22,
            ),
            if (action.label != null) ...[
              const SizedBox(height: 4),
              Text(
                action.label!,
                style: TextStyle(
                  color: colorScheme.onSurfaceVariant,
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
