import 'package:flutter/material.dart';

/// Info card types for different content
enum InfoCardType {
  hotel,
  restaurant,
  documents,
  contacts,
  guestlist,
  notes,
}

extension InfoCardTypeExtension on InfoCardType {
  IconData get icon {
    switch (this) {
      case InfoCardType.hotel:
        return Icons.hotel;
      case InfoCardType.restaurant:
        return Icons.restaurant;
      case InfoCardType.documents:
        return Icons.description;
      case InfoCardType.contacts:
        return Icons.people;
      case InfoCardType.guestlist:
        return Icons.list_alt;
      case InfoCardType.notes:
        return Icons.note;
    }
  }

  Color get iconColor {
    switch (this) {
      case InfoCardType.hotel:
        return const Color(0xFF60A5FA); // Blue
      case InfoCardType.restaurant:
        return const Color(0xFFFB923C); // Orange
      case InfoCardType.documents:
        return const Color(0xFFA78BFA); // Purple
      case InfoCardType.contacts:
        return const Color(0xFF34D399); // Green
      case InfoCardType.guestlist:
        return const Color(0xFFFBBF24); // Yellow
      case InfoCardType.notes:
        return const Color(0xFFF472B6); // Pink
    }
  }
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
    final colorScheme = Theme.of(context).colorScheme;
    
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: colorScheme.surfaceContainer,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: colorScheme.outline),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: TextStyle(
                color: colorScheme.onSurface,
                fontSize: 14,
                fontWeight: FontWeight.w600,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            if (subtitle != null) ...[
              const SizedBox(height: 4),
              Text(
                subtitle!,
                style: TextStyle(color: colorScheme.onSurfaceVariant, fontSize: 12),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
            if (detail != null) ...[
              const SizedBox(height: 4),
              Text(
                detail!,
                style: TextStyle(
                  color: colorScheme.onSurfaceVariant.withValues(alpha: 0.7),
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
    final colorScheme = Theme.of(context).colorScheme;
    
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: colorScheme.surfaceContainer,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: colorScheme.outline),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: TextStyle(
                color: colorScheme.onSurface,
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
                style: TextStyle(color: colorScheme.onSurfaceVariant, fontSize: 12),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              )
            else if (badgeCount != null && badgeCount! > 0)
              Text(
                '$badgeCount Attached', // Or "Available" depending on context
                style: TextStyle(color: colorScheme.onSurfaceVariant, fontSize: 12),
              )
            else
              Text(
                'Not Added',
                style: TextStyle(color: colorScheme.onSurfaceVariant.withValues(alpha: 0.5), fontSize: 12),
              ),
          ],
        ),
      ),
    );
  }
}
