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
    final guestlistAsync = ref.watch(showGuestlistProvider(showId));
    final notesAsync = ref.watch(showNotesProvider(showId));

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
            showId: showId,
            orgId: show.orgId,
            onItemAdded: () => ref.invalidate(showScheduleProvider(showId)),
          ),
        ),
      );
    }

    void openTeamScreen() {
      Navigator.of(context).push(
        SwipeablePageRoute(
          builder: (_) => TeamScreen(
            assignments: assignments,
            showId: showId,
            orgId: show.orgId,
            onMemberAdded: () => ref.invalidate(showAssignmentsProvider(showId)),
          ),
        ),
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.only(bottom: 50),
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
              ActionItem(icon: Icons.people_outline, onTap: openTeamScreen),
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
            data: (flights) => _FlightsSection(
              flights: flights,
              showId: showId,
              orgId: show.orgId,
              onFlightAdded: () => ref.invalidate(showFlightsProvider(showId)),
            ),
          ),

          const SizedBox(height: 24),

          // Unified 2x3 grid: Hotel, Food, Contacts, Documents, Guestlist, Notes
          _UnifiedInfoGrid(
            lodging: lodgingAsync.value ?? [],
            catering: cateringAsync.value ?? [],
            documents: documentsAsync.value ?? [],
            contacts: contactsAsync.value ?? [],
            guests: guestlistAsync.value ?? [],
            notes: notesAsync.value,
            showId: showId,
            orgId: show.orgId,
            onLodgingAdded: () => ref.invalidate(showLodgingProvider(showId)),
            onCateringAdded: () => ref.invalidate(showCateringProvider(showId)),
            onContactAdded: () => ref.invalidate(showContactsProvider(showId)),
            onDocumentAdded: () => ref.invalidate(showDocumentsProvider(showId)),
            onGuestAdded: () => ref.invalidate(showGuestlistProvider(showId)),
            onNotesChanged: () => ref.invalidate(showNotesProvider(showId)),
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
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
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
    final colorScheme = Theme.of(context).colorScheme;
    
    // Empty state when no schedule items
    if (items.isEmpty) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: colorScheme.surfaceContainer,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: colorScheme.outline),
              ),
              child: Column(
                children: [
                  Icon(
                    Icons.event_note_outlined,
                    size: 32,
                    color: colorScheme.onSurfaceVariant,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Schedule Not Added Yet',
                    style: TextStyle(
                      color: colorScheme.onSurfaceVariant,
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
        ],
      );
    }
    
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
                endTime: item.formattedEndTime,
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
  final String showId;
  final String orgId;
  final VoidCallback? onFlightAdded;

  const _FlightsSection({
    required this.flights,
    required this.showId,
    required this.orgId,
    this.onFlightAdded,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return GestureDetector(
      onTap: () => _openFlightsScreen(context),
      child: Container(
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
            if (flights.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: colorScheme.surfaceContainer,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: colorScheme.outline),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.flight, color: colorScheme.onSurfaceVariant),
                      const SizedBox(width: 12),
                      Text(
                        'Flights',
                        style: TextStyle(
                          color: colorScheme.onSurface,
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const Spacer(),
                      Text(
                        'Not Added',
                        style: TextStyle(
                          color: colorScheme.onSurfaceVariant,
                          fontSize: 14,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Icon(
                        Icons.chevron_right,
                        color: colorScheme.onSurfaceVariant,
                      ),
                    ],
                  ),
                ),
              )
            else
              HorizontalCardList(
                children: [
                  ...flights.map((flight) => GestureDetector(
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
                  )),
                  // Add "Create New" card at the end
                  GestureDetector(
                    onTap: () => _openAddFlight(context),
                    child: _CreateNewFlightCard(),
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }

  void _openFlightsScreen(BuildContext context) {
    Navigator.of(context).push(
      SwipeablePageRoute(
        builder: (context) => FlightsScreen(
          flights: flights,
          showId: showId,
          orgId: orgId,
          onFlightAdded: onFlightAdded,
        ),
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
            if (flight.gate != null)
              DetailValueCard(
                label: 'Gate',
                value: flight.gate!,
              ),
            if (flight.boardingGroup != null)
              DetailValueCard(
                label: 'Boarding Group',
                value: flight.boardingGroup!,
              ),
            if (flight.boardingSequence != null)
              DetailValueCard(
                label: 'Boarding Sequence',
                value: flight.boardingSequence!,
              ),
            if (flight.passengerName != null)
              DetailValueCard(
                label: 'Passenger',
                value: flight.passengerName!,
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

  void _openAddFlight(BuildContext context) {
    Navigator.of(context).push(
      SwipeablePageRoute(
        builder: (context) => AddFlightScreen(
          showId: showId,
          orgId: orgId,
          onFlightAdded: () {
            onFlightAdded?.call();
            Navigator.of(context).pop();
          },
        ),
      ),
    );
  }
}

/// "Create New" flight card matching FlightCard dimensions
class _CreateNewFlightCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      width: 200,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainer,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: colorScheme.outline),
      ),
      child: Center(
        child: Icon(
          Icons.add,
          color: colorScheme.onSurfaceVariant,
          size: 32,
        ),
      ),
    );
  }
}

/// Unified 2x3 grid for Hotel, Food, Contacts, Documents, Guestlist, Notes
class _UnifiedInfoGrid extends StatelessWidget {
  final List<LodgingInfo> lodging;
  final List<CateringInfo> catering;
  final List<DocumentInfo> documents;
  final List<ContactInfo> contacts;
  final List<GuestInfo> guests;
  final String? notes;
  final String showId;
  final String orgId;
  final VoidCallback? onLodgingAdded;
  final VoidCallback? onCateringAdded;
  final VoidCallback? onContactAdded;
  final VoidCallback? onDocumentAdded;
  final VoidCallback? onGuestAdded;
  final VoidCallback? onNotesChanged;

  const _UnifiedInfoGrid({
    required this.lodging,
    required this.catering,
    required this.documents,
    required this.contacts,
    required this.guests,
    this.notes,
    required this.showId,
    required this.orgId,
    this.onLodgingAdded,
    this.onCateringAdded,
    this.onContactAdded,
    this.onDocumentAdded,
    this.onGuestAdded,
    this.onNotesChanged,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final totalGuests = guests.fold<int>(0, (sum, g) => sum + g.guestCount);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        children: [
          // Row 1: Hotel, Food
          Row(
            children: [
              Expanded(
                child: GestureDetector(
                  onTap: () => _openHotelsScreen(context),
                  child: lodging.isNotEmpty
                      ? InfoCard(
                          title: lodging.first.hotelName ?? 'Hotel',
                          subtitle: lodging.length > 1
                              ? '${lodging.length} hotels'
                              : lodging.first.timeRange,
                          type: InfoCardType.hotel,
                        )
                      : _buildEmptyCard(context, 'Hotel', Icons.hotel, colorScheme),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: GestureDetector(
                  onTap: () => _openCateringScreen(context),
                  child: catering.isNotEmpty
                      ? InfoCard(
                          title: catering.first.providerName ?? 'Food',
                          subtitle: catering.length > 1
                              ? '${catering.length} restaurants'
                              : catering.first.formattedServiceTime,
                          type: InfoCardType.restaurant,
                        )
                      : _buildEmptyCard(context, 'Food', Icons.restaurant, colorScheme),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Row 2: Contacts, Documents
          Row(
            children: [
              Expanded(
                child: GestureDetector(
                  onTap: () => _openContactsScreen(context),
                  child: _buildEmptyCard(
                    context,
                    'Contacts',
                    Icons.people,
                    colorScheme,
                    subtitle: contacts.isEmpty ? 'Not Added' : '${contacts.length} contacts',
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: GestureDetector(
                  onTap: () => _openDocumentsScreen(context),
                  child: _buildEmptyCard(
                    context,
                    'Documents',
                    Icons.description,
                    colorScheme,
                    subtitle: documents.isEmpty ? 'Not Added' : '${documents.length} files',
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Row 3: Guestlist, Notes
          Row(
            children: [
              Expanded(
                child: GestureDetector(
                  onTap: () => _openGuestlistScreen(context),
                  child: _buildEmptyCard(
                    context,
                    'Guestlist',
                    Icons.list_alt,
                    colorScheme,
                    subtitle: guests.isEmpty ? 'Not Added' : '$totalGuests guests',
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: GestureDetector(
                  onTap: () => _openNotesScreen(context),
                  child: _buildEmptyCard(
                    context,
                    'Notes',
                    Icons.note,
                    colorScheme,
                    subtitle: notes == null || notes!.isEmpty ? 'Not Added' : 'View Notes',
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyCard(BuildContext context, String title, IconData icon, ColorScheme colorScheme, {String? subtitle}) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainer,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: colorScheme.outline),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 16, color: colorScheme.onSurfaceVariant),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  title,
                  style: TextStyle(
                    color: colorScheme.onSurface,
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            subtitle ?? 'Not Added',
            style: TextStyle(
              color: colorScheme.onSurfaceVariant,
              fontSize: 13,
            ),
          ),
        ],
      ),
    );
  }

  void _openHotelsScreen(BuildContext context) {
    Navigator.of(context).push(
      SwipeablePageRoute(
        builder: (context) => HotelsScreen(
          hotels: lodging,
          showId: showId,
          orgId: orgId,
          onHotelAdded: onLodgingAdded,
        ),
      ),
    );
  }

  void _openCateringScreen(BuildContext context) {
    Navigator.of(context).push(
      SwipeablePageRoute(
        builder: (context) => CateringScreen(
          catering: catering,
          showId: showId,
          orgId: orgId,
          onCateringAdded: onCateringAdded,
        ),
      ),
    );
  }

  void _openContactsScreen(BuildContext context) {
    Navigator.of(context).push(
      SwipeablePageRoute(
        builder: (context) => ContactsScreen(
          contacts: contacts,
          showId: showId,
          orgId: orgId,
          onContactAdded: onContactAdded,
        ),
      ),
    );
  }

  void _openDocumentsScreen(BuildContext context) {
    Navigator.of(context).push(
      SwipeablePageRoute(
        builder: (context) => DocumentsScreen(
          documents: documents,
          showId: showId,
          orgId: orgId,
          onDocumentAdded: onDocumentAdded,
        ),
      ),
    );
  }

  void _openGuestlistScreen(BuildContext context) {
    Navigator.of(context).push(
      SwipeablePageRoute(
        builder: (context) => GuestlistScreen(
          guests: guests,
          showId: showId,
          orgId: orgId,
          onGuestAdded: onGuestAdded,
        ),
      ),
    );
  }

  void _openNotesScreen(BuildContext context) {
    Navigator.of(context).push(
      SwipeablePageRoute(
        builder: (context) => NotesScreen(
          initialNotes: notes,
          showId: showId,
          orgId: orgId,
          onNotesChanged: onNotesChanged,
        ),
      ),
    );
  }
}

/// Lodging & Catering section (Combined grid)
class _LodgingCateringSection extends StatelessWidget {
  final List<LodgingInfo> lodging;
  final List<CateringInfo> catering;
  final String showId;
  final String orgId;
  final VoidCallback? onLodgingAdded;
  final VoidCallback? onCateringAdded;

  const _LodgingCateringSection({
    required this.lodging,
    required this.catering,
    required this.showId,
    required this.orgId,
    this.onLodgingAdded,
    this.onCateringAdded,
  });

  @override
  Widget build(BuildContext context) {
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
    final colorScheme = Theme.of(context).colorScheme;
    final widgets = <Widget>[];

    // Hotels tile - always show, with navigation to full list
    widgets.add(GestureDetector(
      onTap: () => _openHotelsScreen(context),
      child: lodging.isNotEmpty
          ? InfoCard(
              title: lodging.first.hotelName ?? 'Hotel',
              subtitle: lodging.length > 1 
                  ? '${lodging.length} hotels' 
                  : lodging.first.timeRange,
              type: InfoCardType.hotel,
            )
          : Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: colorScheme.surfaceContainer,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: colorScheme.outline),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.hotel, size: 16, color: colorScheme.onSurfaceVariant),
                      const SizedBox(width: 8),
                      Text(
                        'Hotel',
                        style: TextStyle(
                          color: colorScheme.onSurface,
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Not Added',
                    style: TextStyle(
                      color: colorScheme.onSurfaceVariant,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),
    ));

    // Food tile - always show, with navigation to full list
    widgets.add(GestureDetector(
      onTap: () => _openCateringScreen(context),
      child: catering.isNotEmpty
          ? InfoCard(
              title: catering.first.providerName ?? 'Food',
              subtitle: catering.length > 1 
                  ? '${catering.length} restaurants' 
                  : catering.first.formattedServiceTime,
              type: InfoCardType.restaurant,
            )
          : Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: colorScheme.surfaceContainer,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: colorScheme.outline),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.restaurant, size: 16, color: colorScheme.onSurfaceVariant),
                      const SizedBox(width: 8),
                      Text(
                        'Food',
                        style: TextStyle(
                          color: colorScheme.onSurface,
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Not Added',
                    style: TextStyle(
                      color: colorScheme.onSurfaceVariant,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),
    ));

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

  void _openHotelsScreen(BuildContext context) {
    Navigator.of(context).push(
      SwipeablePageRoute(
        builder: (context) => HotelsScreen(
          hotels: lodging,
          showId: showId,
          orgId: orgId,
          onHotelAdded: onLodgingAdded,
        ),
      ),
    );
  }

  void _openCateringScreen(BuildContext context) {
    Navigator.of(context).push(
      SwipeablePageRoute(
        builder: (context) => CateringScreen(
          catering: catering,
          showId: showId,
          orgId: orgId,
          onCateringAdded: onCateringAdded,
        ),
      ),
    );
  }
}

/// Info cards grid for documents, contacts, etc.
class _InfoCardsGrid extends StatelessWidget {
  final List<DocumentInfo> documents;
  final List<ContactInfo> contacts;
  final List<GuestInfo> guests;
  final String? notes;
  final String showId;
  final String orgId;
  final VoidCallback? onContactAdded;
  final VoidCallback? onDocumentAdded;
  final VoidCallback? onGuestAdded;
  final VoidCallback? onNotesChanged;

  const _InfoCardsGrid({
    required this.documents,
    required this.contacts,
    required this.guests,
    this.notes,
    required this.showId,
    required this.orgId,
    this.onContactAdded,
    this.onDocumentAdded,
    this.onGuestAdded,
    this.onNotesChanged,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    // Calculate total guest count
    final totalGuests = guests.fold<int>(0, (sum, g) => sum + g.guestCount);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        children: [
          // First row: Contacts & Documents
          Row(
            children: [
              Expanded(
                child: GestureDetector(
                  onTap: () => _openContactsScreen(context),
                  child: _buildInfoTile(
                    context,
                    'Contacts',
                    contacts.isEmpty ? 'Not Added' : '${contacts.length} contacts',
                    colorScheme,
                    Icons.people,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: GestureDetector(
                  onTap: () => _openDocumentsScreen(context),
                  child: _buildInfoTile(
                    context,
                    'Documents',
                    documents.isEmpty ? 'Not Added' : '${documents.length} files',
                    colorScheme,
                    Icons.description,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Second row: Guestlist & Notes
          Row(
            children: [
              Expanded(
                child: GestureDetector(
                  onTap: () => _openGuestlistScreen(context),
                  child: _buildInfoTile(
                    context,
                    'Guestlist',
                    guests.isEmpty ? 'Not Added' : '$totalGuests guests',
                    colorScheme,
                    Icons.list_alt,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: GestureDetector(
                  onTap: () => _openNotesScreen(context),
                  child: _buildInfoTile(
                    context,
                    'Notes',
                    notes == null || notes!.isEmpty ? 'Not Added' : 'View Notes',
                    colorScheme,
                    Icons.note,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildInfoTile(BuildContext context, String title, String subtitle, ColorScheme colorScheme, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainer,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: colorScheme.outline),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 16, color: colorScheme.onSurfaceVariant),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  title,
                  style: TextStyle(
                    color: colorScheme.onSurface,
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
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

  void _openContactsScreen(BuildContext context) {
    Navigator.of(context).push(
      SwipeablePageRoute(
        builder: (context) => ContactsScreen(
          contacts: contacts,
          showId: showId,
          orgId: orgId,
          onContactAdded: onContactAdded,
        ),
      ),
    );
  }

  void _openDocumentsScreen(BuildContext context) {
    Navigator.of(context).push(
      SwipeablePageRoute(
        builder: (context) => DocumentsScreen(
          documents: documents,
          showId: showId,
          orgId: orgId,
          onDocumentAdded: onDocumentAdded,
        ),
      ),
    );
  }

  void _openGuestlistScreen(BuildContext context) {
    Navigator.of(context).push(
      SwipeablePageRoute(
        builder: (context) => GuestlistScreen(
          guests: guests,
          showId: showId,
          orgId: orgId,
          onGuestAdded: onGuestAdded,
        ),
      ),
    );
  }

  void _openNotesScreen(BuildContext context) {
    Navigator.of(context).push(
      SwipeablePageRoute(
        builder: (context) => NotesScreen(
          initialNotes: notes,
          showId: showId,
          orgId: orgId,
          onNotesChanged: onNotesChanged,
        ),
      ),
    );
  }
}
