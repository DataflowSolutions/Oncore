import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

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
    final colorScheme = Theme.of(context).colorScheme;
    
    return Scaffold(
      backgroundColor: colorScheme.surface,
      appBar: AppBar(
        backgroundColor: colorScheme.surface,
        elevation: 0,
        leadingWidth: 100,
        leading: TextButton.icon(
          onPressed: () => context.pop(),
          icon: Icon(Icons.arrow_back_ios, size: 16, color: colorScheme.onSurfaceVariant),
          label: Text('Back', style: TextStyle(color: colorScheme.onSurfaceVariant)),
          style: TextButton.styleFrom(
            padding: const EdgeInsets.only(left: 16),
            alignment: Alignment.centerLeft,
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
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
            
            const SizedBox(height: 16),
            
            // Content Cards
            ...content.map((widget) => Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: widget,
            )),
            
            // Actions
            if (actions.isNotEmpty) ...[
              const SizedBox(height: 8),
              Divider(color: colorScheme.outline),
              const SizedBox(height: 24),
              ...actions.map((action) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
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
    final colorScheme = Theme.of(context).colorScheme;
    
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainer,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: TextStyle(
              color: colorScheme.onSurface,
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 4),
            Text(
              subtitle!,
              style: TextStyle(color: colorScheme.onSurfaceVariant, fontSize: 14),
            ),
          ],
          if (address != null) ...[
            const SizedBox(height: 4),
            Text(
              address!,
              style: TextStyle(color: colorScheme.onSurfaceVariant, fontSize: 14),
            ),
          ],
          if (content != null) ...[
            const SizedBox(height: 16),
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
    final colorScheme = Theme.of(context).colorScheme;
    
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainer,
        borderRadius: BorderRadius.circular(8),
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
                  style: TextStyle(color: colorScheme.onSurfaceVariant, fontSize: 14, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 8),
                Text(
                  value1,
                  style: TextStyle(color: colorScheme.onSurface, fontSize: 14),
                ),
                if (subValue1 != null)
                  Text(
                    subValue1!,
                    style: TextStyle(color: colorScheme.onSurface, fontSize: 18, fontWeight: FontWeight.w600),
                  ),
              ],
            ),
          ),
          
          // Divider
          Container(
            width: 1,
            height: 60,
            color: colorScheme.outline,
            margin: const EdgeInsets.symmetric(horizontal: 16),
          ),
          
          // Right Side
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  label2,
                  style: TextStyle(color: colorScheme.onSurfaceVariant, fontSize: 14, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 8),
                Text(
                  value2,
                  style: TextStyle(color: colorScheme.onSurface, fontSize: 14),
                  textAlign: TextAlign.right,
                ),
                if (subValue2 != null)
                  Text(
                    subValue2!,
                    style: TextStyle(color: colorScheme.onSurface, fontSize: 18, fontWeight: FontWeight.w600),
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
    final colorScheme = Theme.of(context).colorScheme;
    
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainer,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(color: colorScheme.onSurfaceVariant, fontSize: 14, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(color: colorScheme.onSurfaceVariant, fontSize: 14),
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
    final colorScheme = Theme.of(context).colorScheme;
    
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: 24,
        vertical: 16,
      ),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            action.value,
            style: TextStyle(color: colorScheme.onSurfaceVariant, fontSize: 14),
          ),
          GestureDetector(
            onTap: action.onTap,
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: colorScheme.surfaceContainerHigh,
                shape: BoxShape.circle,
                border: Border.all(color: colorScheme.outline),
              ),
              child: Icon(
                action.icon,
                size: 16,
                color: colorScheme.onSurface,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
