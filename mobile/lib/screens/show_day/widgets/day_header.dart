import 'package:flutter/material.dart';

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
    final colorScheme = Theme.of(context).colorScheme;
    
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
                    color: colorScheme.onSurface,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  artist,
                  style: TextStyle(color: colorScheme.onSurfaceVariant, fontSize: 14),
                ),
              ],
            ),
          ),
          const SizedBox(width: 16),
          // Right: Day/time and date
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                dayTime,
                style: TextStyle(color: colorScheme.onSurfaceVariant, fontSize: 14),
              ),
              const SizedBox(height: 2),
              Text(
                date,
                style: TextStyle(color: colorScheme.onSurface, fontSize: 12),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
