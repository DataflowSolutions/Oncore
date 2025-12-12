import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../components/components.dart';
import '../../../models/show_day.dart';
import '../../../theme/app_theme.dart';
import '../providers/show_day_providers.dart';
import 'form_widgets.dart';
import 'add_guest_screen.dart';
import 'edit_guest_screen.dart';
import 'detail_screen.dart';

/// Layer 2: Guestlist screen showing all guests for a show
class GuestlistScreen extends ConsumerWidget {
  final String showId;
  final String orgId;
  final VoidCallback? onGuestAdded;

  const GuestlistScreen({
    super.key,
    required this.showId,
    required this.orgId,
    this.onGuestAdded,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;
    final guestsAsync = ref.watch(showGuestlistProvider(showId));

    return LayerScaffold(
      title: 'Guestlist',
      body: guestsAsync.when(
        loading: () => Center(
          child: CupertinoActivityIndicator(),
        ),
        error: (error, stack) => Center(
          child: Text(
            'Failed to load guestlist',
            style: TextStyle(
              color: AppTheme.getMutedForegroundColor(brightness),
            ),
          ),
        ),
        data: (guests) {
          // Calculate total guest count
          final totalGuests = guests.fold<int>(0, (sum, g) => sum + g.guestCount);

          return Column(
            children: [
              // Summary header
              if (guests.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.fromLTRB(24, 8, 24, 16),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '${guests.length} entries',
                        style: TextStyle(
                          color: AppTheme.getMutedForegroundColor(brightness),
                          fontSize: 14,
                        ),
                      ),
                      Text(
                        '$totalGuests total guests',
                        style: TextStyle(
                          color: AppTheme.getMutedForegroundColor(brightness),
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                ),
              Expanded(
                child: guests.isEmpty
                    ? _buildEmptyState(brightness)
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 24),
                        itemCount: guests.length,
                        itemBuilder: (context, index) {
                          final guest = guests[index];
                          return _GuestCard(
                            guest: guest,
                            onTap: () => _openGuestDetail(context, guest),
                            onEditTap: () => _openEditGuest(context, ref, guest),
                          );
                        },
                      ),
              ),
              AddButton(
                onPressed: () => _openAddGuest(context, ref),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildEmptyState(Brightness brightness) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            CupertinoIcons.list_bullet,
            size: 64,
            color: AppTheme.getMutedForegroundColor(brightness).withValues(alpha: 0.5),
          ),
          const SizedBox(height: 16),
          Text(
            'No guests',
            style: TextStyle(
              color: AppTheme.getForegroundColor(brightness),
              fontSize: 18,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Add a guest to get started',
            style: TextStyle(
              color: AppTheme.getMutedForegroundColor(brightness),
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }

  void _openAddGuest(BuildContext context, WidgetRef ref) {
    Navigator.of(context).push(
      SwipeablePageRoute(
        builder: (context) => AddGuestScreen(
          showId: showId,
          orgId: orgId,
          onGuestAdded: () {
            ref.invalidate(showGuestlistProvider(showId));
            onGuestAdded?.call();
            Navigator.of(context).pop();
          },
        ),
      ),
    );
  }

  void _openGuestDetail(BuildContext context, GuestInfo guest) {
    Navigator.of(context).push(
      SwipeablePageRoute(
        builder: (context) => DetailScreen(
          title: guest.name,
          items: [
            DetailItem(
              label: 'Name',
              value: guest.name,
              icon: CupertinoIcons.person,
            ),
            DetailItem(
              label: 'Guest Count',
              value: '${guest.guestCount}',
              icon: CupertinoIcons.person_3,
            ),
            if (guest.passType != null)
              DetailItem(
                label: 'Pass Type',
                value: guest.passType,
                icon: CupertinoIcons.person_badge_plus,
              ),
            if (guest.phone != null)
              DetailItem(
                label: 'Phone',
                value: guest.phone,
                icon: CupertinoIcons.phone,
                type: DetailItemType.phone,
              ),
            if (guest.email != null)
              DetailItem(
                label: 'Email',
                value: guest.email,
                icon: CupertinoIcons.mail,
                type: DetailItemType.email,
              ),
            if (guest.notes != null)
              DetailItem(
                label: 'Notes',
                value: guest.notes,
                icon: CupertinoIcons.doc_text,
                type: DetailItemType.multiline,
              ),
          ],
        ),
      ),
    );
  }

  void _openEditGuest(BuildContext context, WidgetRef ref, GuestInfo guest) {
    Navigator.of(context).push(
      SwipeablePageRoute(
        builder: (context) => EditGuestScreen(
          showId: showId,
          orgId: orgId,
          guest: guest,
          onGuestUpdated: () {
            ref.invalidate(showGuestlistProvider(showId));
            Navigator.of(context).pop();
          },
        ),
      ),
    );
  }
}

/// Guest card showing name on left and count on right
class _GuestCard extends StatelessWidget {
  final GuestInfo guest;
  final VoidCallback? onTap;
  final VoidCallback? onEditTap;

  const _GuestCard({
    required this.guest,
    this.onTap,
    this.onEditTap,
  });

  @override
  Widget build(BuildContext context) {
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.getCardColor(brightness),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            // Name
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    guest.name,
                    style: TextStyle(
                      color: AppTheme.getForegroundColor(brightness),
                      fontSize: 16,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  if (guest.passType != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      guest.passType!,
                      style: TextStyle(
                        color: AppTheme.getMutedForegroundColor(brightness),
                        fontSize: 13,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            // Guest count
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: AppTheme.getCardColor(brightness),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Text(
                '${guest.guestCount}',
                style: TextStyle(
                  color: AppTheme.getForegroundColor(brightness),
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            // Edit button
            if (onEditTap != null) ...[
              const SizedBox(width: 8),
              CupertinoButton(
                padding: EdgeInsets.zero,
                onPressed: onEditTap,
                child: Icon(
                  CupertinoIcons.pencil,
                  color: AppTheme.getMutedForegroundColor(brightness),
                  size: 20,
                ),
              ),
            ],
            // Chevron
            const SizedBox(width: 8),
            Icon(
              CupertinoIcons.chevron_right,
              color: AppTheme.getMutedForegroundColor(brightness),
              size: 20,
            ),
          ],
        ),
      ),
    );
  }
}
