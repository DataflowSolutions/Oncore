import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../components/components.dart';
import '../../models/show.dart';
import '../../models/show_day.dart';
import '../main/main_shell.dart' show saveLastShow;
import 'providers/show_day_providers.dart';
import 'widgets/widgets.dart';
import 'widgets/detail_modal.dart';

/// Show Day Content widget - just the content, no scaffold/nav
/// Used inside MainShell for Layer 1 Day view
/// This is a Layer 1 page - same level as Shows and Network
class ShowDayContent extends ConsumerStatefulWidget {
  final String orgId;
  final String? showId;

  const ShowDayContent({
    super.key,
    required this.orgId,
    this.showId,
  });

  @override
  ConsumerState<ShowDayContent> createState() => _ShowDayContentState();
}

class _ShowDayContentState extends ConsumerState<ShowDayContent> {
  @override
  void initState() {
    super.initState();
    // Save this show as the last viewed show if we have one
    if (widget.showId != null) {
      saveLastShow(widget.orgId, widget.showId!);
    }
  }

  @override
  void didUpdateWidget(ShowDayContent oldWidget) {
    super.didUpdateWidget(oldWidget);
    // When showId changes, save the new one
    if (widget.showId != oldWidget.showId && widget.showId != null) {
      saveLastShow(widget.orgId, widget.showId!);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    
    // If no showId provided, show empty state
    if (widget.showId == null) {
      return _buildEmptyState(colorScheme);
    }

    final showAsync = ref.watch(showDetailProvider(widget.showId!));
    final assignmentsAsync = ref.watch(showAssignmentsProvider(widget.showId!));

    return showAsync.when(
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
              onPressed: () => ref.invalidate(showDetailProvider(widget.showId!)),
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
          return _buildEmptyState(colorScheme);
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
          data: (assignments) => _ShowDayBody(
            show: show,
            assignments: assignments,
            showId: widget.showId!,
          ),
        );
      },
    );
  }

  Widget _buildEmptyState(ColorScheme colorScheme) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.event_note_outlined, size: 56, color: colorScheme.onSurfaceVariant.withValues(alpha: 0.5)),
          const SizedBox(height: 16),
          Text('No show selected', style: TextStyle(color: colorScheme.onSurface, fontSize: 17)),
          const SizedBox(height: 6),
          Text('Open a show from the Shows tab',
              style: TextStyle(color: colorScheme.onSurfaceVariant, fontSize: 14)),
        ],
      ),
    );
  }
}

/// Body widget with all show day data
class _ShowDayBody extends ConsumerWidget {
  final Show show;
  final List<AssignedPerson> assignments;
  final String showId;

  const _ShowDayBody({
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
    
    // Get schedule items for navigation
    final scheduleItems = scheduleAsync.valueOrNull ?? [];

    void openFullSchedule() {
      Navigator.of(context).push(
        SwipeablePageRoute(
          builder: (_) => FullScheduleScreen(
            items: scheduleItems,
            showTitle: show.title,
            showDate: show.date,
          ),
        ),
      );
    }

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
              ActionItem(icon: Icons.schedule, onTap: openFullSchedule),
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

              if (upcomingIndex == -1) {
                upcomingIndex = sortedItems.length;
              }

              int startIndex = upcomingIndex;
              int endIndex = upcomingIndex + 5;

              if (endIndex > sortedItems.length) {
                endIndex = sortedItems.length;
                startIndex = endIndex - 5;
              }

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
            height: 160,
            children: flights.map((flight) => GestureDetector(
              onTap: () => _showFlightDetails(context, flight),
              child: FlightCard(
                flightNumber: flight.displayFlightNumber,
                departure: flight.departAirportCode ?? '???',
                departureCity: flight.departCity,
                arrival: flight.arrivalAirportCode ?? '???',
                arrivalCity: flight.arrivalCity,
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
            // Combined route card with city, airport code, and time
            FlightRouteCard(
              departCity: flight.departCity,
              departAirportCode: flight.departAirportCode,
              departTime: flight.formattedDepartTime,
              arrivalCity: flight.arrivalCity,
              arrivalAirportCode: flight.arrivalAirportCode,
              arrivalTime: flight.formattedArrivalTime,
            ),
            if (flight.duration != null)
              DetailValueCard(
                label: 'Duration',
                value: flight.duration!,
              ),
            if (flight.travelClass != null)
              DetailValueCard(
                label: 'Travel Class',
                value: flight.travelClass!,
              ),
            if (flight.seatNumber != null)
              DetailValueCard(
                label: 'Seat',
                value: flight.seatNumber!,
              ),
            if (flight.aircraftModel != null)
              DetailValueCard(
                label: 'Aircraft',
                value: flight.aircraftModel!,
              ),
            if (flight.bookingRef != null)
              DetailValueCard(
                label: 'Booking Reference',
                value: flight.bookingRef!,
              ),
            if (flight.ticketNumber != null)
              DetailValueCard(
                label: 'Ticket Number',
                value: flight.ticketNumber!,
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
          ..._buildRows(context),
        ],
      ),
    );
  }

  List<Widget> _buildRows(BuildContext context) {
    final widgets = <Widget>[];

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
        padding: const EdgeInsets.only(bottom: 12),
        child: Row(
          children: [
            Expanded(child: left),
            const SizedBox(width: 12),
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
          subtitle: 'LODGING',
          address: hotel.address,
          content: [
            DetailSplitCard(
              label1: 'Check In',
              value1: hotel.formattedCheckIn ?? '-',
              label2: 'Check Out',
              value2: hotel.formattedCheckOut ?? '-',
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
          subtitle: 'CATERING',
          address: restaurant.address,
          content: [
            DetailValueCard(
              label: 'Service Time',
              value: restaurant.formattedServiceTime ?? '-',
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

/// Info cards grid for documents, contacts, etc.
class _InfoCardsGrid extends StatelessWidget {
  final List<DocumentInfo> documents;
  final List<ContactInfo> contacts;

  const _InfoCardsGrid({
    required this.documents,
    required this.contacts,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        children: [
          // First row: Documents & Contacts
          Row(
            children: [
              Expanded(
                child: _buildInfoTile(
                  context,
                  'Documents',
                  documents.isEmpty ? 'Not Added' : '${documents.length} files',
                  colorScheme,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildInfoTile(
                  context,
                  'Contacts',
                  contacts.isEmpty ? 'Not Added' : '${contacts.length} contacts',
                  colorScheme,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Second row: Guestlist & Notes
          Row(
            children: [
              Expanded(
                child: _buildInfoTile(context, 'Guestlist', 'Not Added', colorScheme),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildInfoTile(context, 'Notes', 'Not Added', colorScheme),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildInfoTile(BuildContext context, String title, String subtitle, ColorScheme colorScheme) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHigh,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: TextStyle(
              color: colorScheme.onSurface,
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            subtitle,
            style: TextStyle(
              color: colorScheme.onSurfaceVariant,
              fontSize: 13,
            ),
          ),
        ],
      ),
    );
  }
}
