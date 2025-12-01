import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../theme/app_theme.dart';

/// A generic detail modal for displaying information in cards
/// Matches the design of the web client's detail popups
class DetailModal extends StatelessWidget {
  final String? title;
  final String? subtitle;
  final String? address;
  final Widget? headerContent;
  final List<Widget> content;
  final List<DetailAction> actions;

  const DetailModal({
    super.key,
    this.title,
    this.subtitle,
    this.address,
    this.headerContent,
    required this.content,
    this.actions = const [],
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: AppTheme.background,
        elevation: 0,
        leadingWidth: 100,
        leading: TextButton.icon(
          onPressed: () => context.pop(),
          icon: const Icon(Icons.arrow_back_ios, size: 16, color: AppTheme.muted),
          label: const Text('Back', style: TextStyle(color: AppTheme.muted)),
          style: TextButton.styleFrom(
            padding: const EdgeInsets.only(left: AppTheme.spacingMd),
            alignment: Alignment.centerLeft,
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppTheme.spacingLg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Header Card
            if (title != null)
              DetailHeaderCard(
                title: title!,
                subtitle: subtitle,
                address: address,
                content: headerContent,
              ),
            
            const SizedBox(height: AppTheme.spacingMd),
            
            // Content Cards
            ...content.map((widget) => Padding(
              padding: const EdgeInsets.only(bottom: AppTheme.spacingMd),
              child: widget,
            )),
            
            // Actions
            if (actions.isNotEmpty) ...[
              const SizedBox(height: AppTheme.spacingSm),
              const Divider(color: AppTheme.border),
              const SizedBox(height: AppTheme.spacingLg),
              ...actions.map((action) => Padding(
                padding: const EdgeInsets.only(bottom: AppTheme.spacingSm),
                child: DetailActionPill(action: action),
              )),
            ],
          ],
        ),
      ),
    );
  }
}

/// Header card with large title and optional address/subtitle
class DetailHeaderCard extends StatelessWidget {
  final String title;
  final String? subtitle;
  final String? address;
  final Widget? content;

  const DetailHeaderCard({
    super.key,
    required this.title,
    this.subtitle,
    this.address,
    this.content,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppTheme.spacingLg),
      decoration: BoxDecoration(
        color: AppTheme.card,
        borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: AppTheme.headingLarge.copyWith(fontSize: 20),
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 4),
            Text(
              subtitle!,
              style: AppTheme.bodyMedium.copyWith(color: AppTheme.muted),
            ),
          ],
          if (address != null) ...[
            const SizedBox(height: 4),
            Text(
              address!,
              style: AppTheme.bodyMedium.copyWith(color: AppTheme.muted),
            ),
          ],
          if (content != null) ...[
            const SizedBox(height: AppTheme.spacingMd),
            content!,
          ],
        ],
      ),
    );
  }
}

/// Split card for two related values (e.g., Check-in / Check-out)
class DetailSplitCard extends StatelessWidget {
  final String label1;
  final String value1;
  final String? subValue1;
  final String label2;
  final String value2;
  final String? subValue2;

  const DetailSplitCard({
    super.key,
    required this.label1,
    required this.value1,
    this.subValue1,
    required this.label2,
    required this.value2,
    this.subValue2,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppTheme.spacingLg),
      decoration: BoxDecoration(
        color: AppTheme.card,
        borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
      ),
      child: Row(
        children: [
          // Left Side
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label1,
                  style: AppTheme.headingSmall.copyWith(color: AppTheme.muted, fontSize: 14),
                ),
                const SizedBox(height: 8),
                Text(
                  value1,
                  style: AppTheme.bodyMedium,
                ),
                if (subValue1 != null)
                  Text(
                    subValue1!,
                    style: AppTheme.headingMedium,
                  ),
              ],
            ),
          ),
          
          // Divider
          Container(
            width: 1,
            height: 60,
            color: AppTheme.border,
            margin: const EdgeInsets.symmetric(horizontal: AppTheme.spacingMd),
          ),
          
          // Right Side
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  label2,
                  style: AppTheme.headingSmall.copyWith(color: AppTheme.muted, fontSize: 14),
                ),
                const SizedBox(height: 8),
                Text(
                  value2,
                  style: AppTheme.bodyMedium,
                  textAlign: TextAlign.right,
                ),
                if (subValue2 != null)
                  Text(
                    subValue2!,
                    style: AppTheme.headingMedium,
                    textAlign: TextAlign.right,
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Simple card for a label and value
class DetailValueCard extends StatelessWidget {
  final String label;
  final String value;

  const DetailValueCard({
    super.key,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppTheme.spacingLg),
      decoration: BoxDecoration(
        color: AppTheme.card,
        borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: AppTheme.headingSmall.copyWith(color: AppTheme.muted, fontSize: 14), // Matches "Booking Reference" style
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: AppTheme.bodyMedium.copyWith(color: AppTheme.muted), // Matches value style
          ),
        ],
      ),
    );
  }
}

/// Action data model
class DetailAction {
  final IconData icon;
  final String value;
  final VoidCallback? onTap;
  final String type; // 'phone', 'email', 'link'

  DetailAction({
    required this.icon,
    required this.value,
    this.onTap,
    required this.type,
  });
  
  factory DetailAction.phone(String number) {
    return DetailAction(
      icon: Icons.phone,
      value: number,
      type: 'phone',
      onTap: () => launchUrl(Uri.parse('tel:$number')),
    );
  }
  
  factory DetailAction.email(String email) {
    return DetailAction(
      icon: Icons.email,
      value: email,
      type: 'email',
      onTap: () => launchUrl(Uri.parse('mailto:$email')),
    );
  }
}

/// Action pill button (Phone, Email)
class DetailActionPill extends StatelessWidget {
  final DetailAction action;

  const DetailActionPill({
    super.key,
    required this.action,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppTheme.spacingLg,
        vertical: AppTheme.spacingMd,
      ),
      decoration: BoxDecoration(
        color: AppTheme.cardCell,
        borderRadius: BorderRadius.circular(AppTheme.radiusXLarge),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            action.value,
            style: AppTheme.bodyMedium.copyWith(color: AppTheme.muted),
          ),
          GestureDetector(
            onTap: action.onTap,
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppTheme.inputBg,
                shape: BoxShape.circle,
                border: Border.all(color: AppTheme.border),
              ),
              child: Icon(
                action.icon,
                size: 16,
                color: AppTheme.foreground,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
