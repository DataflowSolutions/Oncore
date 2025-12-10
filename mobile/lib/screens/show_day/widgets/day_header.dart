import 'package:flutter/cupertino.dart';
import '../../../theme/app_theme.dart';

/// Header widget for the show day view
/// Displays: Show title, artist, day/time, and full date
class DayHeader extends StatelessWidget {
  final String title;
  final String artist;
  final String dayTime; // e.g., "Thurs 19:30"
  final String date; // e.g., "22 Jul 2025" (abbreviated month)
  final VoidCallback? onScheduleTap;

  const DayHeader({
    super.key,
    required this.title,
    required this.artist,
    required this.dayTime,
    required this.date,
    this.onScheduleTap,
  });

  @override
  Widget build(BuildContext context) {
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;
    
    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: 24,
        vertical: 16,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Left: Title and artist
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    color: AppTheme.getForegroundColor(brightness),
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  artist,
                  style: TextStyle(color: AppTheme.getMutedForegroundColor(brightness), fontSize: 14),
                ),
              ],
            ),
          ),
          const SizedBox(width: 16),
          // Right: Day/time and date (both same color now)
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                dayTime,
                style: TextStyle(color: AppTheme.getMutedForegroundColor(brightness), fontSize: 14),
              ),
              const SizedBox(height: 2),
              Text(
                date,
                style: TextStyle(color: AppTheme.getMutedForegroundColor(brightness), fontSize: 12),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
