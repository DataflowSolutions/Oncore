import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../components/components.dart';
import '../../models/show.dart';
import '../../models/show_day.dart';
import '../main/main_shell.dart' show saveLastShow;
import 'providers/show_day_providers.dart';
import 'widgets/widgets.dart';
import 'widgets/detail_modal.dart';

/// Show Day Screen - detailed view of a single show day
/// Matches the web client's CalendarDayView design
class ShowDayScreen extends ConsumerStatefulWidget {
  final String orgId;
  final String showId;

  const ShowDayScreen({
    super.key,
    required this.orgId,
    required this.showId,
  });

  @override
  ConsumerState<ShowDayScreen> createState() => _ShowDayScreenState();
}

class _ShowDayScreenState extends ConsumerState<ShowDayScreen> {
  @override
  void initState() {
    super.initState();
    // Save this show as the last viewed show for quick access from Day button
    saveLastShow(widget.orgId, widget.showId);
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final showAsync = ref.watch(showDetailProvider(widget.showId));
    final assignmentsAsync = ref.watch(showAssignmentsProvider(widget.showId));
    
    return LayerScaffold(
      title: 'Day View',
      body: showAsync.when(
        loading: () => Center(
          child: CircularProgressIndicator(color: colorScheme.onSurface),
        ),
        error: (error, stack) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.error_outline, size: 48, color: colorScheme.onSurfaceVariant),
              const SizedBox(height: 16),
              Text(
                'Failed to load show',
                style: TextStyle(color: colorScheme.onSurfaceVariant, fontSize: 14),
              ),
              const SizedBox(height: 12),
              TextButton(
                onPressed: () => ref.invalidate(showDetailProvider(widget.showId)),
                child: Text(
                  'Retry',
                  style: TextStyle(color: colorScheme.onSurface, fontSize: 14),
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
                  Icon(Icons.event_busy, size: 48, color: colorScheme.onSurfaceVariant),
                  const SizedBox(height: 16),
                  Text(
                    'Show not found',
                    style: TextStyle(color: colorScheme.onSurfaceVariant, fontSize: 14),
                  ),
                  const SizedBox(height: 12),
                  TextButton(
                    onPressed: () => context.pop(),
                    child: Text(
                      'Go back',
                      style: TextStyle(color: colorScheme.onSurface, fontSize: 14),
                    ),
                  ),
                ],
              ),
            );
          }
          return assignmentsAsync.when(
            loading: () => Center(
              child: CircularProgressIndicator(color: colorScheme.onSurface),
            ),
            error: (error, stack) => Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.error_outline, size: 48, color: colorScheme.onSurfaceVariant),
                  const SizedBox(height: 16),
                  Text(
                    'Failed to load show data',
                    style: TextStyle(color: colorScheme.onSurfaceVariant, fontSize: 14),
                  ),
                ],
              ),
            ),
            data: (assignments) => _ShowDayContent(
              show: show,
              assignments: assignments,
              showId: widget.showId,
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

          const SizedBox(height: 24),

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

          const SizedBox(height: 24),

          // Info cards grid
          _InfoCardsGrid(
            documents: documentsAsync.value ?? [],
            contacts: contactsAsync.value ?? [],
          ),

          const SizedBox(height: 32),
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

            return GestureDetector(
              onTap: () => _showScheduleDetails(context, item),
              child: UpcomingScheduleCard(
                title: item.title,
                time: item.formattedStartTime,
                date: dateStr,
              ),
            );
          }).toList(),
        ),
        const SizedBox(height: 16),
      ],
    );
  }

  void _showScheduleDetails(BuildContext context, ScheduleItem item) {
    Navigator.of(context).push(
      SwipeablePageRoute(
        builder: (context) => DetailModal(
          title: item.title,
          subtitle: item.type.toUpperCase(),
          address: item.location,
          content: [
            DetailSplitCard(
              label1: 'Start Time',
              value1: item.formattedStartTime,
              label2: 'End Time',
              value2: item.formattedEndTime ?? '-',
            ),
            if (item.notes != null && item.notes!.isNotEmpty)
              DetailValueCard(
                label: 'Notes',
                value: item.notes!,
              ),
          ],
        ),
      ),
    );
  }
}

/// Flights section with horizontal scroll
class _FlightsSection extends StatelessWidget {
  final List<FlightInfo> flights;

  const _FlightsSection({required this.flights});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    
    return Container(
      decoration: BoxDecoration(
        border: Border(
          top: BorderSide(color: colorScheme.outline, width: 1),
          bottom: BorderSide(color: colorScheme.outline, width: 1),
        ),
      ),
      padding: const EdgeInsets.symmetric(vertical: 16),
      margin: const EdgeInsets.only(bottom: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          HorizontalCardList(
            height: 140, // Increased height for new card design
            children: flights.map((flight) => GestureDetector(
              onTap: () => _showFlightDetails(context, flight),
              child: FlightCard(
                flightNumber: flight.displayFlightNumber,
                departure: flight.departAirportCode ?? '???',
                arrival: flight.arrivalAirportCode ?? '???',
                departureTime: flight.formattedDepartTime ?? '--:--',
                arrivalTime: flight.formattedArrivalTime ?? '--:--',
                duration: flight.duration,
              ),
            )).toList(),
          ),
        ],
      ),
    );
  }

  void _showFlightDetails(BuildContext context, FlightInfo flight) {
    Navigator.of(context).push(
      SwipeablePageRoute(
        builder: (context) => DetailModal(
          title: flight.airline ?? 'Flight',
          subtitle: flight.flightNumber,
          content: [
            DetailSplitCard(
              label1: 'Departure',
              value1: flight.formattedDepartTime ?? '--:--',
              subValue1: flight.departAirportCode,
              label2: 'Arrival',
              value2: flight.formattedArrivalTime ?? '--:--',
              subValue2: flight.arrivalAirportCode,
            ),
            if (flight.duration != null)
              DetailValueCard(
                label: 'Duration',
                value: flight.duration!,
              ),
            if (flight.bookingRef != null)
              DetailValueCard(
                label: 'Booking Reference',
                value: flight.bookingRef!,
              ),
          ],
        ),
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
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        children: [
          // Combine items into rows of 2
          ..._buildRows(context),
        ],
      ),
    );
  }

  List<Widget> _buildRows(BuildContext context) {
    final widgets = <Widget>[];
    
    // Add lodging items
    for (final hotel in lodging) {
      widgets.add(GestureDetector(
        onTap: () => _showLodgingDetails(context, hotel),
        child: InfoCard(
          title: hotel.hotelName ?? 'Hotel',
          subtitle: hotel.timeRange,
          type: InfoCardType.hotel,
        ),
      ));
    }
    
    // Add catering items
    for (final restaurant in catering) {
      widgets.add(GestureDetector(
        onTap: () => _showCateringDetails(context, restaurant),
        child: InfoCard(
          title: restaurant.providerName ?? 'Restaurant',
          subtitle: restaurant.formattedServiceTime,
          type: InfoCardType.restaurant,
        ),
      ));
    }

    final rows = <Widget>[];
    for (var i = 0; i < widgets.length; i += 2) {
      final left = widgets[i];
      final right = i + 1 < widgets.length ? widgets[i + 1] : null;

      rows.add(Padding(
        padding: const EdgeInsets.only(bottom: 16),
        child: Row(
          children: [
            Expanded(child: left),
            const SizedBox(width: 16),
            Expanded(child: right ?? const SizedBox.shrink()),
          ],
        ),
      ));
    }

    return rows;
  }

  void _showLodgingDetails(BuildContext context, LodgingInfo hotel) {
    final actions = <DetailAction>[];
    if (hotel.phone != null) actions.add(DetailAction.phone(hotel.phone!));
    if (hotel.email != null) actions.add(DetailAction.email(hotel.email!));

    Navigator.of(context).push(
      SwipeablePageRoute(
        builder: (context) => DetailModal(
          title: hotel.hotelName ?? 'Hotel',
          subtitle: hotel.city, // Or room type if available
          address: hotel.address,
          content: [
            DetailSplitCard(
              label1: 'Check-in',
              value1: hotel.formattedCheckIn ?? '--:--',
              label2: 'Check-out',
              value2: hotel.formattedCheckOut ?? '--:--',
            ),
            if (hotel.bookingRefs != null && hotel.bookingRefs!.isNotEmpty)
              DetailValueCard(
                label: 'Booking Reference',
                value: hotel.bookingRefs!.join(', '),
              ),
            if (hotel.notes != null && hotel.notes!.isNotEmpty)
              DetailValueCard(
                label: 'Notes',
                value: hotel.notes!,
              ),
          ],
          actions: actions,
        ),
      ),
    );
  }

  void _showCateringDetails(BuildContext context, CateringInfo restaurant) {
    final actions = <DetailAction>[];
    if (restaurant.phone != null) actions.add(DetailAction.phone(restaurant.phone!));
    if (restaurant.email != null) actions.add(DetailAction.email(restaurant.email!));

    Navigator.of(context).push(
      SwipeablePageRoute(
        builder: (context) => DetailModal(
          title: restaurant.providerName ?? 'Restaurant',
          subtitle: restaurant.city,
          address: restaurant.address,
          content: [
            if (restaurant.formattedServiceTime != null)
              DetailValueCard(
                label: 'Service Time',
                value: restaurant.formattedServiceTime!,
              ),
            if (restaurant.guestCount != null)
              DetailValueCard(
                label: 'Guest Count',
                value: restaurant.guestCount.toString(),
              ),
            if (restaurant.bookingRefs != null && restaurant.bookingRefs!.isNotEmpty)
              DetailValueCard(
                label: 'Booking Reference',
                value: restaurant.bookingRefs!.join(', '),
              ),
            if (restaurant.notes != null && restaurant.notes!.isNotEmpty)
              DetailValueCard(
                label: 'Notes',
                value: restaurant.notes!,
              ),
          ],
          actions: actions,
        ),
      ),
    );
  }
}

/// Info cards grid (Documents, Contacts, Guestlist, Notes)
class _InfoCardsGrid extends StatelessWidget {
  final List<DocumentInfo> documents;
  final List<ContactInfo> contacts;

  const _InfoCardsGrid({
    required this.documents,
    required this.contacts,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: InfoCardCompact(
                  title: 'Documents',
                  type: InfoCardType.documents,
                  badgeCount: documents.length,
                  onTap: () => _showDocumentsModal(context),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: InfoCardCompact(
                  title: 'Contacts',
                  type: InfoCardType.contacts,
                  badgeCount: contacts.length,
                  onTap: () => _showContactsModal(context),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: InfoCardCompact(
                  title: 'Guestlist',
                  type: InfoCardType.guestlist,
                  badgeCount: 0,
                ),
              ),
              const SizedBox(width: 16),
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

  void _showDocumentsModal(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    
    showModalBottomSheet(
      context: context,
      backgroundColor: colorScheme.surfaceContainer,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) {
        final colorScheme = Theme.of(context).colorScheme;
        return Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Documents',
                    style: TextStyle(
                      color: colorScheme.onSurface,
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  IconButton(
                    icon: Icon(Icons.close, color: colorScheme.onSurface),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              if (documents.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 24),
                  child: Center(
                    child: Text(
                      'No documents attached',
                      style: TextStyle(color: colorScheme.onSurfaceVariant, fontSize: 14),
                    ),
                  ),
                )
              else
                ...documents.map((doc) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: colorScheme.surfaceContainerHigh,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.description, color: Color(0xFFA78BFA)),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                doc.label ?? 'Document',
                                style: TextStyle(color: colorScheme.onSurface, fontSize: 14),
                              ),
                              Text(
                                '${doc.fileCount} file${doc.fileCount != 1 ? 's' : ''} • ${doc.partyType == 'from_us' ? 'From Us' : 'From You'}',
                                style: TextStyle(color: colorScheme.onSurfaceVariant, fontSize: 12),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                )),
              const SizedBox(height: 16),
            ],
          ),
        );
      },
    );
  }

  void _showContactsModal(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    
    showModalBottomSheet(
      context: context,
      backgroundColor: colorScheme.surfaceContainer,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      isScrollControlled: true,
      builder: (context) {
        final colorScheme = Theme.of(context).colorScheme;
        return DraggableScrollableSheet(
          initialChildSize: 0.5,
          minChildSize: 0.3,
          maxChildSize: 0.9,
          expand: false,
          builder: (context, scrollController) => Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Contacts',
                      style: TextStyle(
                        color: colorScheme.onSurface,
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    IconButton(
                      icon: Icon(Icons.close, color: colorScheme.onSurface),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Expanded(
                  child: contacts.isEmpty
                      ? Center(
                          child: Text(
                            'No contacts attached',
                            style: TextStyle(color: colorScheme.onSurfaceVariant, fontSize: 14),
                          ),
                        )
                      : ListView.builder(
                          controller: scrollController,
                          itemCount: contacts.length,
                          itemBuilder: (context, index) {
                            final contact = contacts[index];
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: Container(
                                padding: const EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                  color: colorScheme.surfaceContainerHigh,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Row(
                                  children: [
                                    Container(
                                      width: 40,
                                      height: 40,
                                      decoration: BoxDecoration(
                                        color: const Color(0xFF34D399).withValues(alpha: 0.2),
                                        borderRadius: BorderRadius.circular(20),
                                      ),
                                      child: const Icon(
                                        Icons.person,
                                        color: Color(0xFF34D399),
                                        size: 20,
                                      ),
                                    ),
                                    const SizedBox(width: 16),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            contact.name,
                                            style: TextStyle(
                                              color: colorScheme.onSurface,
                                              fontSize: 14,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                          if (contact.role != null)
                                            Text(
                                              contact.role!,
                                              style: TextStyle(color: colorScheme.onSurfaceVariant, fontSize: 12),
                                            ),
                                          if (contact.email != null || contact.phone != null)
                                            Text(
                                              [contact.email, contact.phone]
                                                  .where((e) => e != null)
                                                  .join(' • '),
                                              style: TextStyle(
                                                color: colorScheme.onSurfaceVariant.withValues(alpha: 0.8),
                                                fontSize: 12,
                                              ),
                                            ),
                                        ],
                                      ),
                                    ),
                                    if (contact.isPromoter)
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 8,
                                          vertical: 4,
                                        ),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFFFBBF24).withValues(alpha: 0.2),
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                        child: const Text(
                                          'Promoter',
                                          style: TextStyle(
                                            color: Color(0xFFFBBF24),
                                            fontSize: 10,
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
