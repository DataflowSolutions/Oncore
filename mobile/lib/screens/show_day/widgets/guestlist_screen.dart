import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../components/components.dart';
import '../../../models/show_day.dart';
import 'form_widgets.dart';
import 'add_guest_screen.dart';

/// Layer 2: Guestlist screen showing all guests for a show
class GuestlistScreen extends ConsumerWidget {
  final List<GuestInfo> guests;
  final String showId;
  final String orgId;
  final VoidCallback? onGuestAdded;

  const GuestlistScreen({
    super.key,
    required this.guests,
    required this.showId,
    required this.orgId,
    this.onGuestAdded,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colorScheme = Theme.of(context).colorScheme;

    // Calculate total guest count
    final totalGuests = guests.fold<int>(0, (sum, g) => sum + g.guestCount);

    return LayerScaffold(
      title: 'Guestlist',
      body: Column(
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
                      color: colorScheme.onSurfaceVariant,
                      fontSize: 14,
                    ),
                  ),
                  Text(
                    '$totalGuests total guests',
                    style: TextStyle(
                      color: colorScheme.onSurfaceVariant,
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
          Expanded(
            child: guests.isEmpty
                ? _buildEmptyState(colorScheme)
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    itemCount: guests.length,
                    itemBuilder: (context, index) {
                      final guest = guests[index];
                      return _GuestCard(guest: guest);
                    },
                  ),
          ),
          AddButton(
            onPressed: () => _openAddGuest(context),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(ColorScheme colorScheme) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.list_alt_outlined,
            size: 64,
            color: colorScheme.onSurfaceVariant.withValues(alpha: 0.5),
          ),
          const SizedBox(height: 16),
          Text(
            'No guests',
            style: TextStyle(
              color: colorScheme.onSurface,
              fontSize: 18,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Add a guest to get started',
            style: TextStyle(
              color: colorScheme.onSurfaceVariant,
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }

  void _openAddGuest(BuildContext context) {
    Navigator.of(context).push(
      SwipeablePageRoute(
        builder: (context) => AddGuestScreen(
          showId: showId,
          orgId: orgId,
          onGuestAdded: () {
            onGuestAdded?.call();
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

  const _GuestCard({required this.guest});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHigh,
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
                    color: colorScheme.onSurface,
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                if (guest.passType != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    guest.passType!,
                    style: TextStyle(
                      color: colorScheme.onSurfaceVariant,
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
              color: colorScheme.surfaceContainer,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Text(
              '${guest.guestCount}',
              style: TextStyle(
                color: colorScheme.onSurface,
                fontSize: 14,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
