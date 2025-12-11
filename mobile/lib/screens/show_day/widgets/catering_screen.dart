import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../components/components.dart';
import '../../../theme/app_theme.dart';
import '../../../models/show_day.dart';
import '../providers/show_day_providers.dart';
import 'form_widgets.dart';
import 'add_catering_screen.dart';

/// Layer 2: Catering list screen showing all catering for a show
class CateringScreen extends ConsumerWidget {
  final String showId;
  final String orgId;
  final VoidCallback? onCateringAdded;

  const CateringScreen({
    super.key,
    required this.showId,
    required this.orgId,
    this.onCateringAdded,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;
    final cateringAsync = ref.watch(showCateringProvider(showId));

    return LayerScaffold(
      title: 'Catering',
      body: Column(
        children: [
          Expanded(
            child: cateringAsync.when(
              loading: () => Center(
                child: CupertinoActivityIndicator(),
              ),
              error: (error, stack) => Center(
                child: Text(
                  'Failed to load catering',
                  style: TextStyle(
                    color: AppTheme.getMutedForegroundColor(brightness),
                  ),
                ),
              ),
              data: (catering) => catering.isEmpty
                  ? _buildEmptyState(brightness)
                  : ListView.builder(
                      padding: const EdgeInsets.all(24),
                      itemCount: catering.length,
                      itemBuilder: (context, index) {
                        final item = catering[index];
                        return _CateringCard(
                          catering: item,
                          onPhoneTap: item.phone != null
                              ? () => _launchPhone(item.phone!)
                              : null,
                          onEmailTap: item.email != null
                              ? () => _launchEmail(item.email!)
                              : null,
                        );
                      },
                    ),
            ),
          ),
          AddButton(
            onPressed: () => _openAddCatering(context, ref),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(Brightness brightness) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            CupertinoIcons.cart,
            size: 64,
            color: AppTheme.getMutedForegroundColor(brightness).withValues(alpha: 0.5),
          ),
          const SizedBox(height: 16),
          Text(
            'No catering',
            style: TextStyle(
              color: AppTheme.getForegroundColor(brightness),
              fontSize: 18,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Add catering to get started',
            style: TextStyle(
              color: AppTheme.getMutedForegroundColor(brightness),
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }

  void _openAddCatering(BuildContext context, WidgetRef ref) {
    Navigator.of(context).push(
      SwipeablePageRoute(
        builder: (context) => AddCateringScreen(
          showId: showId,
          orgId: orgId,
          onCateringAdded: () {
            ref.invalidate(showCateringProvider(showId));
            onCateringAdded?.call();
            Navigator.of(context).pop();
          },
        ),
      ),
    );
  }

  void _launchPhone(String phone) async {
    final uri = Uri.parse('tel:$phone');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  void _launchEmail(String email) async {
    final uri = Uri.parse('mailto:$email');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }
}

class _CateringCard extends StatelessWidget {
  final CateringInfo catering;
  final VoidCallback? onPhoneTap;
  final VoidCallback? onEmailTap;

  const _CateringCard({
    required this.catering,
    this.onPhoneTap,
    this.onEmailTap,
  });

  @override
  Widget build(BuildContext context) {
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppTheme.getCardColor(brightness),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Provider name
          Text(
            catering.providerName ?? 'Catering',
            style: TextStyle(
              color: AppTheme.getForegroundColor(brightness),
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          if (catering.address != null || catering.city != null) ...[
            const SizedBox(height: 4),
            Text(
              [catering.address, catering.city].where((e) => e != null).join(', '),
              style: TextStyle(
                color: AppTheme.getMutedForegroundColor(brightness),
                fontSize: 14,
              ),
            ),
          ],
          const SizedBox(height: 16),
          // Service time and guest count
          Row(
            children: [
              if (catering.formattedServiceTime != null)
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppTheme.getCardColor(brightness),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Service Time',
                          style: TextStyle(
                            color: AppTheme.getMutedForegroundColor(brightness),
                            fontSize: 12,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          catering.formattedServiceTime!,
                          style: TextStyle(
                            color: AppTheme.getForegroundColor(brightness),
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              if (catering.formattedServiceTime != null && catering.guestCount != null)
                const SizedBox(width: 12),
              if (catering.guestCount != null)
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppTheme.getCardColor(brightness),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Guests',
                          style: TextStyle(
                            color: AppTheme.getMutedForegroundColor(brightness),
                            fontSize: 12,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${catering.guestCount}',
                          style: TextStyle(
                            color: AppTheme.getForegroundColor(brightness),
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ),
          // Booking refs
          if (catering.bookingRefs != null && catering.bookingRefs!.isNotEmpty) ...[
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.getCardColor(brightness),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Booking Reference',
                    style: TextStyle(
                      color: AppTheme.getMutedForegroundColor(brightness),
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    catering.bookingRefs!.join(', '),
                    style: TextStyle(
                      color: AppTheme.getForegroundColor(brightness),
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
          ],
          // Notes
          if (catering.notes != null && catering.notes!.isNotEmpty) ...[
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.getCardColor(brightness),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Notes',
                    style: TextStyle(
                      color: AppTheme.getMutedForegroundColor(brightness),
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    catering.notes!,
                    style: TextStyle(
                      color: AppTheme.getForegroundColor(brightness),
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
          ],
          // Phone
          if (catering.phone != null) ...[
            const SizedBox(height: 12),
            _ActionRow(
              value: catering.phone!,
              icon: CupertinoIcons.phone,
              onTap: onPhoneTap,
            ),
          ],
          // Email
          if (catering.email != null) ...[
            const SizedBox(height: 8),
            _ActionRow(
              value: catering.email!,
              icon: CupertinoIcons.mail,
              onTap: onEmailTap,
            ),
          ],
        ],
      ),
    );
  }
}

class _ActionRow extends StatelessWidget {
  final String value;
  final IconData icon;
  final VoidCallback? onTap;

  const _ActionRow({
    required this.value,
    required this.icon,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: AppTheme.getCardColor(brightness),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Text(
              value,
              style: TextStyle(
                color: AppTheme.getMutedForegroundColor(brightness),
                fontSize: 14,
              ),
            ),
          ),
          GestureDetector(
            onTap: onTap,
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppTheme.getCardColor(brightness),
                shape: BoxShape.circle,
                border: Border.all(color: AppTheme.getBorderColor(brightness)),
              ),
              child: Icon(
                icon,
                size: 16,
                color: AppTheme.getForegroundColor(brightness),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
