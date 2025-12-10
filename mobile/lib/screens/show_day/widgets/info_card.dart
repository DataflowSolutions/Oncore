import 'package:flutter/cupertino.dart';
import '../../../theme/app_theme.dart';

/// Info card types for different content
enum InfoCardType {
  hotel,
  restaurant,
  documents,
  contacts,
  guestlist,
  notes,
}

/// Generic info card for hotel, restaurant, documents, contacts, etc.
class InfoCard extends StatelessWidget {
  final String title;
  final String? subtitle;
  final String? detail;
  final InfoCardType type;
  final VoidCallback? onTap;
  final int? badgeCount;

  const InfoCard({
    super.key,
    required this.title,
    this.subtitle,
    this.detail,
    required this.type,
    this.onTap,
    this.badgeCount,
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
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            if (subtitle != null) ...[
              const SizedBox(height: 4),
              Text(
                subtitle!,
                style: TextStyle(color: AppTheme.getMutedForegroundColor(brightness), fontSize: 13),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
            if (detail != null) ...[
              const SizedBox(height: 4),
              Text(
                detail!,
                style: TextStyle(
                  color: AppTheme.getMutedForegroundColor(brightness).withValues(alpha: 0.7),
                  fontSize: 12,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Compact info card for grid layout
class InfoCardCompact extends StatelessWidget {
  final String title;
  final String? subtitle;
  final InfoCardType type;
  final VoidCallback? onTap;
  final int? badgeCount;

  const InfoCardCompact({
    super.key,
    required this.title,
    this.subtitle,
    required this.type,
    this.onTap,
    this.badgeCount,
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
            if (subtitle != null)
              Text(
                subtitle!,
                style: TextStyle(color: AppTheme.getMutedForegroundColor(brightness), fontSize: 12),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              )
            else if (badgeCount != null && badgeCount! > 0)
              Text(
                '$badgeCount Attached', // Or "Available" depending on context
                style: TextStyle(color: AppTheme.getMutedForegroundColor(brightness), fontSize: 12),
              )
            else
              Text(
                'Not Added',
                style: TextStyle(color: AppTheme.getMutedForegroundColor(brightness).withValues(alpha: 0.5), fontSize: 12),
              ),
          ],
        ),
      ),
    );
  }
}
