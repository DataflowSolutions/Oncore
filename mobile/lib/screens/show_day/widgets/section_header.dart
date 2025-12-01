import 'package:flutter/material.dart';
import '../../../theme/app_theme.dart';

/// Section header widget for day view sections
class SectionHeader extends StatelessWidget {
  final String title;
  final String? actionLabel;
  final VoidCallback? onAction;

  const SectionHeader({
    super.key,
    required this.title,
    this.actionLabel,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppTheme.spacingLg,
        vertical: AppTheme.spacingSm,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            title,
            style: AppTheme.headingSmall,
          ),
          if (actionLabel != null && onAction != null)
            GestureDetector(
              onTap: onAction,
              child: Text(
                actionLabel!,
                style: AppTheme.bodySmall.copyWith(
                  color: AppTheme.primary,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Horizontal scroll list for cards like flights
class HorizontalCardList extends StatelessWidget {
  final List<Widget> children;
  final double height;
  final EdgeInsets padding;

  const HorizontalCardList({
    super.key,
    required this.children,
    this.height = 120,
    this.padding = const EdgeInsets.symmetric(horizontal: 16),
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: height,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: padding,
        itemCount: children.length,
        separatorBuilder: (context, index) => const SizedBox(width: AppTheme.spacingMd),
        itemBuilder: (context, index) => children[index],
      ),
    );
  }
}
