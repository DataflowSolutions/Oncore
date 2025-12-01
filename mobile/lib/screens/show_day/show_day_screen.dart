import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../models/show.dart';
import '../../models/show_day.dart';
import '../../theme/app_theme.dart';
import 'providers/show_day_providers.dart';
import 'widgets/widgets.dart';

/// Show Day Screen - detailed view of a single show day
/// Matches the web client's CalendarDayView design
class ShowDayScreen extends ConsumerWidget {
  final String orgId;
  final String showId;

  const ShowDayScreen({
    super.key,
    required this.orgId,
    required this.showId,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final showAsync = ref.watch(showDetailProvider(showId));
    final assignmentsAsync = ref.watch(showAssignmentsProvider(showId));
    
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: AppTheme.background,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppTheme.foreground),
          onPressed: () => context.pop(),
        ),
        title: const Text('Day View', style: TextStyle(color: AppTheme.foreground)),
      ),
      body: showAsync.when(
        loading: () => const Center(
          child: CircularProgressIndicator(color: AppTheme.foreground),
        ),
        error: (error, stack) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48, color: AppTheme.muted),
              const SizedBox(height: 16),
              Text(
                'Failed to load show',
                style: AppTheme.bodyMedium.copyWith(color: AppTheme.muted),
              ),
              const SizedBox(height: 12),
              TextButton(
                onPressed: () => ref.invalidate(showDetailProvider(showId)),
                child: Text(
                  'Retry',
                  style: AppTheme.bodyMedium.copyWith(color: AppTheme.foreground),
                ),
              ),
            ],
          ),
        ),
        data: (show) {
          if (show == null) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.event_busy, size: 48, color: AppTheme.muted),
                  const SizedBox(height: 16),
                  Text(
                    'Show not found',
                    style: AppTheme.bodyMedium.copyWith(color: AppTheme.muted),
                  ),
                  const SizedBox(height: 12),
                  TextButton(
                    onPressed: () => context.pop(),
                    child: Text(
                      'Go back',
                      style: AppTheme.bodyMedium.copyWith(color: AppTheme.foreground),
                    ),
                  ),
                ],
              ),
            );
          }
          return assignmentsAsync.when(
            loading: () => const Center(
              child: CircularProgressIndicator(color: AppTheme.foreground),
            ),
            error: (error, stack) => Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, size: 48, color: AppTheme.muted),
                  const SizedBox(height: 16),
                  Text(
                    'Failed to load show data',
                    style: AppTheme.bodyMedium.copyWith(color: AppTheme.muted),
                  ),
                ],
              ),
            ),
            data: (assignments) => _ShowDayContent(
              show: show,
              assignments: assignments,
              showId: showId,
            ),
          );
        },
      ),
    );
  }
}

/// Content widget with all show day data
class _ShowDayContent extends ConsumerWidget {
  final Show show;
  final List<AssignedPerson> assignments;
  final String showId;

  const _ShowDayContent({
    required this.show,
    required this.assignments,
    required this.showId,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Watch all data providers
    final scheduleAsync = ref.watch(showScheduleProvider(showId));
    final flightsAsync = ref.watch(showFlightsProvider(showId));
    final lodgingAsync = ref.watch(showLodgingProvider(showId));
    final cateringAsync = ref.watch(showCateringProvider(showId));
    final documentsAsync = ref.watch(showDocumentsProvider(showId));
    final contactsAsync = ref.watch(showContactsProvider(showId));

    // Get artist name
    final artists = assignments.where((a) => a.isArtist).toList();
    final artistName = artists.isNotEmpty ? artists.first.name : 'No Artist';

    // Format day and date
    final dayTime = _formatDayTime(show);
    final date = _formatDate(show.date);

    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          DayHeader(
            title: show.title,
            artist: artistName,
            dayTime: dayTime,
            date: date,
          ),

          // Action bar
          ActionBar(
            actions: [
              ActionItem(icon: Icons.people_outline, onTap: () {}),
              ActionItem(icon: Icons.schedule, onTap: () {}),
              ActionItem(icon: Icons.fullscreen, onTap: () {}),
              ActionItem(icon: Icons.refresh, onTap: () => _refresh(ref)),
              ActionItem(icon: Icons.download_outlined, onTap: () {}),
              ActionItem(icon: Icons.share_outlined, onTap: () {}),
            ],
          ),

          const SizedBox(height: AppTheme.spacingLg),

          // Schedule section
          scheduleAsync.when(
            loading: () => const SizedBox.shrink(),
            error: (_, __) => const SizedBox.shrink(),
            data: (items) {
              if (items.isEmpty) return const SizedBox.shrink();
              
              // Filter for upcoming items
              final now = DateTime.now();
              final sortedItems = List<ScheduleItem>.from(items);
              sortedItems.sort((a, b) => a.startTime.compareTo(b.startTime));

              // Find index of first upcoming item
              int upcomingIndex = sortedItems.indexWhere((item) {
                try {
                  final itemTime = DateTime.parse(item.startTime);
                  return itemTime.isAfter(now);
                } catch (_) {
                  return false;
                }
              });

              // If no upcoming items found, or index is -1, use the end of the list
              if (upcomingIndex == -1) {
                upcomingIndex = sortedItems.length;
              }

              // We want 5 items total.
              // Ideally starting from upcomingIndex.
              // If we don't have 5 items after upcomingIndex, we backtrack to include past items.
              
              int startIndex = upcomingIndex;
              int endIndex = upcomingIndex + 5;

              // Adjust if we go past the end
              if (endIndex > sortedItems.length) {
                endIndex = sortedItems.length;
                // Try to backtrack start index to get 5 items
                startIndex = endIndex - 5;
              }

              // Ensure start index is not negative
              if (startIndex < 0) startIndex = 0;

              final displayItems = sortedItems.sublist(startIndex, endIndex);
              
              if (displayItems.isEmpty) return const SizedBox.shrink();

              return Column(
                children: [
                  _UpcomingScheduleSection(items: displayItems),
                ],
              );
            },
          ),

          // Flights section
          flightsAsync.when(
            loading: () => const SizedBox.shrink(),
            error: (_, __) => const SizedBox.shrink(),
            data: (flights) => flights.isNotEmpty
                ? _FlightsSection(flights: flights)
                : const SizedBox.shrink(),
          ),

          // Lodging & Catering section (Combined grid)
          if (lodgingAsync.hasValue || cateringAsync.hasValue)
            _LodgingCateringSection(
              lodging: lodgingAsync.value ?? [],
              catering: cateringAsync.value ?? [],
            ),

          const SizedBox(height: AppTheme.spacingLg),

          // Info cards grid
          _InfoCardsGrid(
            documentsCount: documentsAsync.whenData((d) => d.length).value ?? 0,
            contactsCount: contactsAsync.whenData((c) => c.length).value ?? 0,
          ),

          const SizedBox(height: AppTheme.spacingXl),
        ],
      ),
    );
  }

  String _formatDayTime(Show show) {
    const days = ['Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat', 'Sun'];
    final day = days[show.date.weekday - 1];
    
    if (show.setTime != null) {
      try {
        final time = DateTime.parse(show.setTime!);
        return '$day ${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}';
      } catch (_) {}
    }
    return day;
  }

  String _formatDate(DateTime date) {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return '${date.day} ${months[date.month - 1]} ${date.year}';
  }

  void _refresh(WidgetRef ref) {
    ref.invalidate(showDetailProvider(showId));
    ref.invalidate(showAssignmentsProvider(showId));
    ref.invalidate(showScheduleProvider(showId));
    ref.invalidate(showFlightsProvider(showId));
    ref.invalidate(showLodgingProvider(showId));
    ref.invalidate(showCateringProvider(showId));
    ref.invalidate(showDocumentsProvider(showId));
    ref.invalidate(showContactsProvider(showId));
  }
}

/// Upcoming schedule section with horizontal scroll
class _UpcomingScheduleSection extends StatelessWidget {
  final List<ScheduleItem> items;

  const _UpcomingScheduleSection({required this.items});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        HorizontalCardList(
          height: 100,
          children: items.map((item) {
            String dateStr = '';
            try {
              final dt = DateTime.parse(item.startTime);
              const months = [
                'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
              ];
              dateStr = '${dt.day} ${months[dt.month - 1]}';
            } catch (_) {}

            return UpcomingScheduleCard(
              title: item.title,
              time: item.formattedStartTime,
              date: dateStr,
            );
          }).toList(),
        ),
        const SizedBox(height: AppTheme.spacingMd),
      ],
    );
  }
}

/// Flights section with horizontal scroll
class _FlightsSection extends StatelessWidget {
  final List<FlightInfo> flights;

  const _FlightsSection({required this.flights});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        border: Border(
          top: BorderSide(color: AppTheme.border, width: 1),
          bottom: BorderSide(color: AppTheme.border, width: 1),
        ),
      ),
      padding: const EdgeInsets.symmetric(vertical: AppTheme.spacingMd),
      margin: const EdgeInsets.only(bottom: AppTheme.spacingLg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          HorizontalCardList(
            height: 140, // Increased height for new card design
            children: flights.map((flight) => FlightCard(
              flightNumber: flight.displayFlightNumber,
              departure: flight.departAirportCode ?? '???',
              arrival: flight.arrivalAirportCode ?? '???',
              departureTime: flight.formattedDepartTime ?? '--:--',
              arrivalTime: flight.formattedArrivalTime ?? '--:--',
              duration: flight.duration,
            )).toList(),
          ),
        ],
      ),
    );
  }
}

/// Lodging & Catering section (Combined grid)
class _LodgingCateringSection extends StatelessWidget {
  final List<LodgingInfo> lodging;
  final List<CateringInfo> catering;

  const _LodgingCateringSection({
    required this.lodging,
    required this.catering,
  });

  @override
  Widget build(BuildContext context) {
    if (lodging.isEmpty && catering.isEmpty) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppTheme.spacingLg),
      child: Column(
        children: [
          // Combine items into rows of 2
          ..._buildRows(),
        ],
      ),
    );
  }

  List<Widget> _buildRows() {
    final widgets = <Widget>[];
    
    // Add lodging items
    for (final hotel in lodging) {
      widgets.add(InfoCard(
        title: hotel.hotelName ?? 'Hotel',
        subtitle: hotel.timeRange,
        type: InfoCardType.hotel,
      ));
    }
    
    // Add catering items
    for (final restaurant in catering) {
      widgets.add(InfoCard(
        title: restaurant.providerName ?? 'Restaurant',
        subtitle: restaurant.formattedServiceTime,
        type: InfoCardType.restaurant,
      ));
    }

    final rows = <Widget>[];
    for (var i = 0; i < widgets.length; i += 2) {
      final left = widgets[i];
      final right = i + 1 < widgets.length ? widgets[i + 1] : null;

      rows.add(Padding(
        padding: const EdgeInsets.only(bottom: AppTheme.spacingMd),
        child: Row(
          children: [
            Expanded(child: left),
            const SizedBox(width: AppTheme.spacingMd),
            Expanded(child: right ?? const SizedBox.shrink()),
          ],
        ),
      ));
    }

    return rows;
  }
}

/// Info cards grid (Documents, Contacts, Guestlist, Notes)
class _InfoCardsGrid extends StatelessWidget {
  final int documentsCount;
  final int contactsCount;

  const _InfoCardsGrid({
    required this.documentsCount,
    required this.contactsCount,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppTheme.spacingLg),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: InfoCardCompact(
                  title: 'Documents',
                  type: InfoCardType.documents,
                  badgeCount: documentsCount,
                ),
              ),
              const SizedBox(width: AppTheme.spacingMd),
              Expanded(
                child: InfoCardCompact(
                  title: 'Contacts',
                  type: InfoCardType.contacts,
                  badgeCount: contactsCount,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppTheme.spacingMd),
          Row(
            children: [
              Expanded(
                child: InfoCardCompact(
                  title: 'Guestlist',
                  type: InfoCardType.guestlist,
                  badgeCount: 0,
                ),
              ),
              const SizedBox(width: AppTheme.spacingMd),
              Expanded(
                child: InfoCardCompact(
                  title: 'Notes',
                  type: InfoCardType.notes,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
