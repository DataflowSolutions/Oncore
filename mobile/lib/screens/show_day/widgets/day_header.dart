import 'package:flutter/material.dart';
import '../../../theme/app_theme.dart';

/// Header widget for the show day view
/// Displays: Show title, artist, day/time, and full date
class DayHeader extends StatelessWidget {
  final String title;
  final String artist;
  final String dayTime; // e.g., "Thurs 19:30"
  final String date; // e.g., "22 July 2025"

  const DayHeader({
    super.key,
    required this.title,
    required this.artist,
    required this.dayTime,
    required this.date,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppTheme.spacingLg,
        vertical: AppTheme.spacingMd,
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
                  style: AppTheme.headingMedium.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  artist,
                  style: AppTheme.bodyMedium.copyWith(color: AppTheme.muted),
                ),
              ],
            ),
          ),
          const SizedBox(width: AppTheme.spacingMd),
          // Right: Day/time and date
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                dayTime,
                style: AppTheme.bodyMedium.copyWith(color: AppTheme.muted),
              ),
              const SizedBox(height: 2),
              Text(
                date,
                style: AppTheme.bodySmall,
              ),
            ],
          ),
        ],
      ),
    );
  }
}
