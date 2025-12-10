import 'package:flutter/cupertino.dart';
import '../../../theme/app_theme.dart';

/// Schedule card widget for displaying schedule items
/// Shows title, time range, and optional icon
class ScheduleCard extends StatelessWidget {
  final String title;
  final String startTime;
  final String endTime;
  final IconData? icon;
  final VoidCallback? onTap;

  const ScheduleCard({
    super.key,
    required this.title,
    required this.startTime,
    required this.endTime,
    this.icon,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;
    
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.getCardColor(brightness),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: AppTheme.getCardBorderColor(brightness)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: TextStyle(
                color: AppTheme.getForegroundColor(brightness),
                fontSize: 14,
                fontWeight: FontWeight.w600,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 4),
            Text(
              '$startTime - $endTime',
              style: TextStyle(
                color: AppTheme.getMutedForegroundColor(brightness),
                fontSize: 12,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
