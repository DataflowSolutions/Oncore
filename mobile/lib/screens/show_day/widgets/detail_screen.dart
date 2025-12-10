import 'package:flutter/cupertino.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../components/components.dart';
import '../../../theme/app_theme.dart';

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
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.getCardColor(brightness),
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
              color: AppTheme.getMutedForegroundColor(brightness),
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
                    color: AppTheme.getMutedForegroundColor(brightness),
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  item.value ?? '',
                  style: TextStyle(
                    color: _getValueColor(brightness),
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
            CupertinoButton(
              padding: EdgeInsets.zero,
              onPressed: () => _performAction(context),
              child: Icon(
                _getActionIcon(),
                color: AppTheme.getPrimaryColor(brightness),
                size: 20,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Color _getValueColor(Brightness brightness) {
    if (_isActionable) {
      return AppTheme.getPrimaryColor(brightness);
    }
    return AppTheme.getForegroundColor(brightness);
  }

  bool get _isActionable => 
      item.type == DetailItemType.phone || 
      item.type == DetailItemType.email || 
      item.type == DetailItemType.url;

  IconData _getActionIcon() {
    switch (item.type) {
      case DetailItemType.phone:
        return CupertinoIcons.phone;
      case DetailItemType.email:
        return CupertinoIcons.mail;
      case DetailItemType.url:
        return CupertinoIcons.arrow_up_right_square;
      default:
        return CupertinoIcons.chevron_forward;
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
