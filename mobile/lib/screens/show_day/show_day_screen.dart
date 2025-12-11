import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../components/components.dart';
import '../../models/show.dart';
import '../../models/show_day.dart';
import '../../theme/app_theme.dart';
import '../main/controllers/main_shell_controller.dart' show saveLastShow;
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
    print('═══════════════════════════════════════');
    print('[DEBUG] ShowDayScreen initState() called');
    print('[DEBUG] orgId: ${widget.orgId}');
    print('[DEBUG] showId: ${widget.showId}');
    print('═══════════════════════════════════════');
    // Save this show as the last viewed show for quick access from Day button
    saveLastShow(widget.orgId, widget.showId);
  }

  @override
  void didUpdateWidget(ShowDayScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    print('═══════════════════════════════════════');
    print('[DEBUG] ShowDayScreen didUpdateWidget() called - SHOW SWITCHED!');
    print('[DEBUG] Old showId: ${oldWidget.showId}');
    print('[DEBUG] New showId: ${widget.showId}');
    print('[DEBUG] Show changed: ${oldWidget.showId != widget.showId}');
    print('═══════════════════════════════════════');
    
    if (oldWidget.showId != widget.showId) {
      print('🔄 SHOW CHANGE DETECTED - Updating to new show');
      saveLastShow(widget.orgId, widget.showId);
    }
  }

  @override
  Widget build(BuildContext context) {
    print('═══════════════════════════════════════');
    print('[DEBUG] ShowDayScreen.build() called');
    print('[DEBUG] Building for showId: ${widget.showId}');
    print('═══════════════════════════════════════');
    
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;
    final showAsync = ref.watch(showDetailProvider(widget.showId));
    final assignmentsAsync = ref.watch(showAssignmentsProvider(widget.showId));
    
    print('[DEBUG] Providers watched:');
    print('[DEBUG] - showDetailProvider state: ${showAsync.state.toString().substring(0, 50)}...');
    print('[DEBUG] - assignmentsAsync state: ${assignmentsAsync.state.toString().substring(0, 50)}...');
    
    return LayerScaffold(
      title: 'Day View',
      body: showAsync.when(
        loading: () {
          print('[DEBUG] showDetailProvider is LOADING');
          return Center(
            child: CupertinoActivityIndicator(color: AppTheme.getForegroundColor(brightness)),
          );
        },
        error: (error, stack) {
          print('═══════════════════════════════════════');
          print('❌ showDetailProvider ERROR: $error');
          print('[ERROR] Stack: $stack');
          print('═══════════════════════════════════════');
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(CupertinoIcons.exclamationmark_circle, size: 48, color: AppTheme.getMutedForegroundColor(brightness)),
                const SizedBox(height: 16),
                Text(
                  'Failed to load show: $error',
                  style: TextStyle(color: AppTheme.getMutedForegroundColor(brightness), fontSize: 14),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 12),
                CupertinoButton(
                  onPressed: () {
                    print('[DEBUG] Retry button pressed for showDetailProvider');
                    ref.invalidate(showDetailProvider(widget.showId));
                  },
                  child: Text(
                    'Retry',
                    style: TextStyle(color: AppTheme.getForegroundColor(brightness), fontSize: 14),
                  ),
                ),
              ],
            ),
          );
        },
        data: (show) {
          print('[DEBUG] showDetailProvider DATA received');
          if (show == null) {
            print('⚠️ Show data is null');
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(CupertinoIcons.calendar_badge_minus, size: 48, color: AppTheme.getMutedForegroundColor(brightness)),
                  const SizedBox(height: 16),
                  Text(
                    'Show not found',
                    style: TextStyle(color: AppTheme.getMutedForegroundColor(brightness), fontSize: 14),
                  ),
                  const SizedBox(height: 12),
                  CupertinoButton(
                    onPressed: () {
                      print('[DEBUG] Going back from null show');
                      context.pop();
                    },
                    child: Text(
                      'Go back',
                      style: TextStyle(color: AppTheme.getForegroundColor(brightness), fontSize: 14),
                    ),
                  ),
                ],
              ),
            );
          }
          
          print('[DEBUG] Show loaded: ${show.title}');
          return assignmentsAsync.when(
            loading: () {
              print('[DEBUG] assignmentsAsync is LOADING');
              return Center(
                child: CupertinoActivityIndicator(color: AppTheme.getForegroundColor(brightness)),
              );
            },
            error: (error, stack) {
              print('═══════════════════════════════════════');
              print('❌ assignmentsAsync ERROR: $error');
              print('[ERROR] Stack: $stack');
              print('═══════════════════════════════════════');
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(CupertinoIcons.exclamationmark_circle, size: 48, color: AppTheme.getMutedForegroundColor(brightness)),
                    const SizedBox(height: 16),
                    Text(
                      'Failed to load assignments: $error',
                      style: TextStyle(color: AppTheme.getMutedForegroundColor(brightness), fontSize: 14),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 12),
                    CupertinoButton(
                      onPressed: () {
                        print('[DEBUG] Retry button pressed for assignmentsAsync');
                        ref.invalidate(showAssignmentsProvider(widget.showId));
                      },
                      child: Text(
                        'Retry',
                        style: TextStyle(color: AppTheme.getForegroundColor(brightness), fontSize: 14),
                      ),
                    ),
                  ],
                ),
              );
            },
            data: (assignments) {
              print('[DEBUG] assignmentsAsync DATA received: ${assignments.length} assignments');
              print('═══════════════════════════════════════');
              print('✅ ShowDayScreen FULLY LOADED');
              print('[DEBUG] Show: ${show.title}');
              print('[DEBUG] Assignments: ${assignments.length}');
              print('═══════════════════════════════════════');
              return _ShowDayContent(
                show: show,
                assignments: assignments,
                showId: widget.showId,
              );
            },
          );
        },
      ),
    );
  }
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
    print('═══════════════════════════════════════');
    print('[DEBUG] _ShowDayContent.build() called');
    print('[DEBUG] Show: ${show.title}');
    print('[DEBUG] showId: $showId');
    print('═══════════════════════════════════════');
    
    // Watch all data providers
    final scheduleAsync = ref.watch(showScheduleProvider(showId));
    final flightsAsync = ref.watch(showFlightsProvider(showId));
    final lodgingAsync = ref.watch(showLodgingProvider(showId));
    final cateringAsync = ref.watch(showCateringProvider(showId));
    final documentsAsync = ref.watch(showDocumentsProvider(showId));
    final contactsAsync = ref.watch(showContactsProvider(showId));

    print('[DEBUG] Providers watched:');
    print('[DEBUG] - scheduleAsync: ${scheduleAsync.state.toString().substring(0, 50)}...');
    print('[DEBUG] - flightsAsync: ${flightsAsync.state.toString().substring(0, 50)}...');

    // Get artist name
    final artists = assignments.where((a) => a.isArtist).toList();
    final artistName = artists.isNotEmpty ? artists.first.name : 'No Artist';

    // Format day and date
    final dayTime = _formatDayTime(show);
    final date = _formatDate(show.date);
    
    // Get schedule items for navigation
    final scheduleItems = scheduleAsync.valueOrNull ?? [];

    void openFullSchedule() {
      print('[DEBUG] openFullSchedule called');
      Navigator.of(context).push(
        SwipeablePageRoute(
          builder: (_) => FullScheduleScreen(
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
      print('[DEBUG] openTeamScreen called');
      Navigator.of(context).push(
        SwipeablePageRoute(
          builder: (_) => TeamScreen(
            showId: showId,
            orgId: show.orgId,
            onMemberAdded: () => ref.invalidate(showAssignmentsProvider(showId)),
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
            onScheduleTap: openFullSchedule,
          ),

          // Action bar
          ActionBar(
            actions: [
              ActionItem(icon: CupertinoIcons.people_outline, onTap: openTeamScreen),
              ActionItem(icon: CupertinoIcons.schedule, onTap: openFullSchedule),
              ActionItem(icon: CupertinoIcons.fullscreen, onTap: () {}),
              ActionItem(icon: CupertinoIcons.refresh, onTap: () => _refresh(ref)),
              ActionItem(icon: CupertinoIcons.download_outlined, onTap: () {}),
              ActionItem(icon: CupertinoIcons.share_outlined, onTap: () {}),
            ],
          ),

          const SizedBox(height: 24),

          // Schedule section
          scheduleAsync.when(
            loading: () => const SizedBox.shrink(),
            error: (_, __) => const SizedBox.shrink(),
            data: (items) {
              if (items.isEmpty) {
                // Show empty state with add option
                return Column(
                  children: [
                    _ScheduleEmptyState(
                      showId: showId,
                      orgId: show.orgId,
                      onItemAdded: () => ref.invalidate(showScheduleProvider(showId)),
                    ),
                    const SizedBox(height: 16),
                  ],
                );
              }
              
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
    print('═══════════════════════════════════════');
    print('[DEBUG] _refresh() called for showId: $showId');
    print('[DEBUG] Invalidating all providers...');
    print('═══════════════════════════════════════');
    
    ref.invalidate(showDetailProvider(showId));
    print('[DEBUG] ✓ Invalidated showDetailProvider');
    
    ref.invalidate(showAssignmentsProvider(showId));
    print('[DEBUG] ✓ Invalidated showAssignmentsProvider');
    
    ref.invalidate(showScheduleProvider(showId));
    print('[DEBUG] ✓ Invalidated showScheduleProvider');
    
    ref.invalidate(showFlightsProvider(showId));
    print('[DEBUG] ✓ Invalidated showFlightsProvider');
    
    ref.invalidate(showLodgingProvider(showId));
    print('[DEBUG] ✓ Invalidated showLodgingProvider');
    
    ref.invalidate(showCateringProvider(showId));
    print('[DEBUG] ✓ Invalidated showCateringProvider');
    
    ref.invalidate(showDocumentsProvider(showId));
    print('[DEBUG] ✓ Invalidated showDocumentsProvider');
    
    ref.invalidate(showContactsProvider(showId));
    print('[DEBUG] ✓ Invalidated showContactsProvider');
    
    print('═══════════════════════════════════════');
    print('✅ All providers refreshed');
    print('═══════════════════════════════════════');
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

/// Empty state for schedule section
class _ScheduleEmptyState extends StatelessWidget {
  final String showId;
  final String orgId;
  final VoidCallback? onItemAdded;

  const _ScheduleEmptyState({
    required this.showId,
    required this.orgId,
    this.onItemAdded,
  });

  @override
  Widget build(BuildContext context) {
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;
    
    return GestureDetector(
      onTap: () => _openAddScheduleItem(context),
      child: Container(
        width: 180,
        height: 100,
        margin: const EdgeInsets.symmetric(horizontal: 24),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppTheme.getCardColor(brightness),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: AppTheme.getCardBorderColor(brightness),
            style: BorderStyle.solid,
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              CupertinoIcons.calendar_badge_plus,
              size: 32,
              color: AppTheme.getMutedForegroundColor(brightness).withValues(alpha: 0.5),
            ),
            const SizedBox(height: 8),
            Text(
              'No schedule items',
              style: TextStyle(
                color: AppTheme.getMutedForegroundColor(brightness),
                fontSize: 12,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 4),
            Text(
              'Tap to add',
              style: TextStyle(
                color: AppTheme.getMutedForegroundColor(brightness).withValues(alpha: 0.7),
                fontSize: 11,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  void _openAddScheduleItem(BuildContext context) {
    Navigator.of(context).push(
      SwipeablePageRoute(
        builder: (context) => AddScheduleItemScreen(
          showId: showId,
          orgId: orgId,
          onItemAdded: () {
            onItemAdded?.call();
            Navigator.of(context).pop();
          },
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
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;
    
    return Container(
      decoration: BoxDecoration(
        border: Border(
          top: BorderSide(color: AppTheme.getBorderColor(brightness), width: 1),
          bottom: BorderSide(color: AppTheme.getBorderColor(brightness), width: 1),
        ),
      ),
      padding: const EdgeInsets.symmetric(vertical: 12),
      margin: const EdgeInsets.only(bottom: 12),
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
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;
    
    showCupertinoModalPopup(
      context: context,
      builder: (context) {
        final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;
        return Container(
          decoration: BoxDecoration(
            color: AppTheme.getCardColor(brightness),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
          ),
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
                      color: AppTheme.getForegroundColor(brightness),
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  CupertinoButton(
                    padding: EdgeInsets.zero,
                    onPressed: () => Navigator.pop(context),
                    child: Icon(CupertinoIcons.xmark, color: AppTheme.getForegroundColor(brightness)),
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
                      style: TextStyle(color: AppTheme.getMutedForegroundColor(brightness), fontSize: 14),
                    ),
                  ),
                )
              else
                ...documents.map((doc) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppTheme.getInputBackgroundColor(brightness),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          doc.isPdf ? CupertinoIcons.doc_text : CupertinoIcons.doc,
                          color: const Color(0xFFA78BFA),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                doc.displayName,
                                style: TextStyle(color: AppTheme.getForegroundColor(brightness), fontSize: 14),
                              ),
                              Text(
                                doc.formattedSize,
                                style: TextStyle(color: AppTheme.getMutedForegroundColor(brightness), fontSize: 12),
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
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;
    
    showCupertinoModalPopup(
      context: context,
      builder: (context) {
        final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;
        return Container(
          height: MediaQuery.of(context).size.height * 0.7,
          decoration: BoxDecoration(
            color: AppTheme.getCardColor(brightness),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
          ),
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
                      color: AppTheme.getForegroundColor(brightness),
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  CupertinoButton(
                    padding: EdgeInsets.zero,
                    onPressed: () => Navigator.pop(context),
                    child: Icon(CupertinoIcons.xmark, color: AppTheme.getForegroundColor(brightness)),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Expanded(
                child: contacts.isEmpty
                    ? Center(
                        child: Text(
                          'No contacts attached',
                          style: TextStyle(color: AppTheme.getMutedForegroundColor(brightness), fontSize: 14),
                        ),
                      )
                    : ListView.builder(
                        itemCount: contacts.length,
                        itemBuilder: (context, index) {
                          final contact = contacts[index];
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: AppTheme.getInputBackgroundColor(brightness),
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
                                      CupertinoIcons.person,
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
                                            color: AppTheme.getForegroundColor(brightness),
                                            fontSize: 14,
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                        if (contact.role != null)
                                          Text(
                                            contact.role!,
                                            style: TextStyle(color: AppTheme.getMutedForegroundColor(brightness), fontSize: 12),
                                          ),
                                        if (contact.email != null || contact.phone != null)
                                          Text(
                                            [contact.email, contact.phone]
                                                .where((e) => e != null)
                                                .join(' • '),
                                            style: TextStyle(
                                              color: AppTheme.getMutedForegroundColor(brightness).withValues(alpha: 0.8),
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
