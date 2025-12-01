import 'package:flutter/material.dart';
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
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(AppTheme.spacingMd),
        decoration: BoxDecoration(
          color: AppTheme.card,
          borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
          border: Border.all(color: AppTheme.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: AppTheme.bodyMedium.copyWith(
                fontWeight: FontWeight.w600,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 4),
            Text(
              '$startTime - $endTime',
              style: AppTheme.caption.copyWith(
                color: AppTheme.muted,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
