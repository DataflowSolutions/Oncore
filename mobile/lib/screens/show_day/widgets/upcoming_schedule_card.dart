import 'package:flutter/cupertino.dart';
import '../../../theme/app_theme.dart';

/// Card for displaying upcoming schedule items
class UpcomingScheduleCard extends StatelessWidget {
  final String title;
  final String time;
  final String? endTime;
  final String date;
  final VoidCallback? onTap;

  const UpcomingScheduleCard({
    super.key,
    required this.title,
    required this.time,
    this.endTime,
    required this.date,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;
    
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 180, // Reduced from 200
        padding: const EdgeInsets.all(12), // Reduced from 16
        decoration: BoxDecoration(
          color: AppTheme.getCardColor(brightness),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: AppTheme.getCardBorderColor(brightness)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            // Title at top
            Text(
              title,
              style: TextStyle(
                color: AppTheme.getForegroundColor(brightness),
                fontSize: 13, // Reduced from 14
                fontWeight: FontWeight.w600,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 6), // Reduced from 8
            // Bottom row: Time on left, Date on right (no icons)
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Time (start-end) on left
                Text(
                  endTime != null ? '$time - $endTime' : time,
                  style: TextStyle(color: AppTheme.getMutedForegroundColor(brightness), fontSize: 11),
                ),
                // Date on right
                Text(
                  date,
                  style: TextStyle(color: AppTheme.getMutedForegroundColor(brightness), fontSize: 11),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
