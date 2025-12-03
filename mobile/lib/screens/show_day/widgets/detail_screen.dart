import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../components/components.dart';

/// A reusable detail screen that shows key-value pairs of information
/// Layer 3: Detail view for any entity
class DetailScreen extends StatelessWidget {
  final String title;
  final List<DetailItem> items;
  final Widget? trailing;

  const DetailScreen({
    super.key,
    required this.title,
    required this.items,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    // Filter out items with null or empty values
    final visibleItems = items.where((item) => 
      item.value != null && item.value!.toString().isNotEmpty
    ).toList();

    return LayerScaffold(
      title: title,
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Detail cards
            ...visibleItems.map((item) => _DetailCard(item: item)),
            if (trailing != null) ...[
              const SizedBox(height: 24),
              trailing!,
            ],
          ],
        ),
      ),
    );
  }
}

/// A single detail item
class DetailItem {
  final String label;
  final String? value;
  final IconData? icon;
  final DetailItemType type;

  const DetailItem({
    required this.label,
    this.value,
    this.icon,
    this.type = DetailItemType.text,
  });
}

enum DetailItemType {
  text,
  phone,
  email,
  url,
  multiline,
}

class _DetailCard extends StatelessWidget {
  final DetailItem item;

  const _DetailCard({required this.item});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        crossAxisAlignment: item.type == DetailItemType.multiline 
            ? CrossAxisAlignment.start 
            : CrossAxisAlignment.center,
        children: [
          // Icon
          if (item.icon != null) ...[
            Icon(
              item.icon,
              color: colorScheme.onSurfaceVariant,
              size: 20,
            ),
            const SizedBox(width: 12),
          ],
          // Label and value
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.label,
                  style: TextStyle(
                    color: colorScheme.onSurfaceVariant,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  item.value ?? '',
                  style: TextStyle(
                    color: _getValueColor(colorScheme),
                    fontSize: 15,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
          // Action button for actionable types
          if (_isActionable) ...[
            const SizedBox(width: 8),
            IconButton(
              onPressed: () => _performAction(context),
              icon: Icon(
                _getActionIcon(),
                color: colorScheme.primary,
                size: 20,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Color _getValueColor(ColorScheme colorScheme) {
    if (_isActionable) {
      return colorScheme.primary;
    }
    return colorScheme.onSurface;
  }

  bool get _isActionable => 
      item.type == DetailItemType.phone || 
      item.type == DetailItemType.email || 
      item.type == DetailItemType.url;

  IconData _getActionIcon() {
    switch (item.type) {
      case DetailItemType.phone:
        return Icons.phone_outlined;
      case DetailItemType.email:
        return Icons.email_outlined;
      case DetailItemType.url:
        return Icons.open_in_new;
      default:
        return Icons.arrow_forward;
    }
  }

  Future<void> _performAction(BuildContext context) async {
    Uri? uri;
    
    switch (item.type) {
      case DetailItemType.phone:
        uri = Uri.parse('tel:${item.value}');
        break;
      case DetailItemType.email:
        uri = Uri.parse('mailto:${item.value}');
        break;
      case DetailItemType.url:
        uri = Uri.parse(item.value ?? '');
        break;
      default:
        return;
    }

    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }
}
