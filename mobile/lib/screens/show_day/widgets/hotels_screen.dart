import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../components/components.dart';
import '../../../theme/app_theme.dart';
import '../../../models/show_day.dart';
import 'form_widgets.dart';
import 'add_hotel_screen.dart';

/// Layer 2: Hotels list screen showing all lodging for a show
class HotelsScreen extends ConsumerWidget {
  final List<LodgingInfo> hotels;
  final String showId;
  final String orgId;
  final VoidCallback? onHotelAdded;

  const HotelsScreen({
    super.key,
    required this.hotels,
    required this.showId,
    required this.orgId,
    this.onHotelAdded,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;

    return LayerScaffold(
      title: 'Hotels',
      body: Column(
        children: [
          Expanded(
            child: hotels.isEmpty
                ? _buildEmptyState(brightness)
                : ListView.builder(
                    padding: const EdgeInsets.all(24),
                    itemCount: hotels.length,
                    itemBuilder: (context, index) {
                      final hotel = hotels[index];
                      return _HotelCard(
                        hotel: hotel,
                        onPhoneTap: hotel.phone != null
                            ? () => _launchPhone(hotel.phone!)
                            : null,
                        onEmailTap: hotel.email != null
                            ? () => _launchEmail(hotel.email!)
                            : null,
                      );
                    },
                  ),
          ),
          AddButton(
            onPressed: () => _openAddHotel(context),
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
            CupertinoIcons.bed_double,
            size: 64,
            color: AppTheme.getMutedForegroundColor(brightness).withValues(alpha: 0.5),
          ),
          const SizedBox(height: 16),
          Text(
            'No hotels',
            style: TextStyle(
              color: AppTheme.getForegroundColor(brightness),
              fontSize: 18,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Add a hotel to get started',
            style: TextStyle(
              color: AppTheme.getMutedForegroundColor(brightness),
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }

  void _openAddHotel(BuildContext context) {
    Navigator.of(context).push(
      SwipeablePageRoute(
        builder: (context) => AddHotelScreen(
          showId: showId,
          orgId: orgId,
          onHotelAdded: () {
            onHotelAdded?.call();
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

class _HotelCard extends StatelessWidget {
  final LodgingInfo hotel;
  final VoidCallback? onPhoneTap;
  final VoidCallback? onEmailTap;

  const _HotelCard({
    required this.hotel,
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
          // Hotel name
          Text(
            hotel.hotelName ?? 'Hotel',
            style: TextStyle(
              color: AppTheme.getForegroundColor(brightness),
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          if (hotel.address != null || hotel.city != null) ...[
            const SizedBox(height: 4),
            Text(
              [hotel.address, hotel.city].where((e) => e != null).join(', '),
              style: TextStyle(
                color: AppTheme.getMutedForegroundColor(brightness),
                fontSize: 14,
              ),
            ),
          ],
          const SizedBox(height: 16),
          // Check-in/Check-out times
          if (hotel.formattedCheckIn != null || hotel.formattedCheckOut != null)
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.getCardColor(brightness),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Check-in',
                          style: TextStyle(
                            color: AppTheme.getMutedForegroundColor(brightness),
                            fontSize: 12,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          hotel.formattedCheckIn ?? '-',
                          style: TextStyle(
                            color: AppTheme.getForegroundColor(brightness),
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    width: 1,
                    height: 40,
                    color: AppTheme.getBorderColor(brightness),
                  ),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          'Check-out',
                          style: TextStyle(
                            color: AppTheme.getMutedForegroundColor(brightness),
                            fontSize: 12,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          hotel.formattedCheckOut ?? '-',
                          style: TextStyle(
                            color: AppTheme.getForegroundColor(brightness),
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          // Booking refs
          if (hotel.bookingRefs != null && hotel.bookingRefs!.isNotEmpty) ...[
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
                    hotel.bookingRefs!.join(', '),
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
          if (hotel.phone != null) ...[
            const SizedBox(height: 12),
            _ActionRow(
              value: hotel.phone!,
              icon: CupertinoIcons.phone,
              onTap: onPhoneTap,
            ),
          ],
          // Email
          if (hotel.email != null) ...[
            const SizedBox(height: 8),
            _ActionRow(
              value: hotel.email!,
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
