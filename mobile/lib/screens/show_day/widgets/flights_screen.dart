import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../components/components.dart';
import '../../../theme/app_theme.dart';
import '../../../models/show_day.dart';
import 'add_flight_screen.dart';
import 'form_widgets.dart';

/// Layer 2: Flights list screen showing all flights for a show
class FlightsScreen extends ConsumerWidget {
  final List<FlightInfo> flights;
  final String showId;
  final String orgId;
  final VoidCallback? onFlightAdded;

  const FlightsScreen({
    super.key,
    required this.flights,
    required this.showId,
    required this.orgId,
    this.onFlightAdded,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;

    return LayerScaffold(
      title: 'Flights',
      body: Column(
        children: [
          Expanded(
            child: flights.isEmpty
                ? _buildEmptyState(brightness)
                : ListView.builder(
                    padding: const EdgeInsets.all(24),
                    itemCount: flights.length,
                    itemBuilder: (context, index) {
                      final flight = flights[index];
                      return _FlightCard(flight: flight);
                    },
                  ),
          ),
          AddButton(
            onPressed: () => _openAddFlight(context),
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
            CupertinoIcons.airplane,
            size: 64,
            color: AppTheme.getMutedForegroundColor(brightness).withValues(alpha: 0.5),
          ),
          const SizedBox(height: 16),
          Text(
            'No flights',
            style: TextStyle(
              color: AppTheme.getForegroundColor(brightness),
              fontSize: 18,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Add a flight to get started',
            style: TextStyle(
              color: AppTheme.getMutedForegroundColor(brightness),
              fontSize: 14,
            ),
          ),
        ],
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

class _FlightCard extends StatelessWidget {
  final FlightInfo flight;

  const _FlightCard({required this.flight});

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
          // Airline and flight number
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                flight.airline ?? 'Flight',
                style: TextStyle(
                  color: AppTheme.getForegroundColor(brightness),
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              if (flight.flightNumber != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppTheme.getCardColor(brightness),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    flight.flightNumber!,
                    style: TextStyle(
                      color: AppTheme.getMutedForegroundColor(brightness),
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 16),
          // Route card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.getCardColor(brightness),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                // Departure
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        flight.departAirportCode ?? '---',
                        style: TextStyle(
                          color: AppTheme.getForegroundColor(brightness),
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      if (flight.departCity != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          flight.departCity!,
                          style: TextStyle(
                            color: AppTheme.getMutedForegroundColor(brightness),
                            fontSize: 12,
                          ),
                        ),
                      ],
                      const SizedBox(height: 8),
                      Text(
                        flight.formattedDepartTime ?? '--:--',
                        style: TextStyle(
                          color: AppTheme.getForegroundColor(brightness),
                          fontSize: 16,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
                // Arrow
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Column(
                    children: [
                      Icon(
                        CupertinoIcons.airplane,
                        color: AppTheme.getMutedForegroundColor(brightness),
                        size: 20,
                      ),
                      if (flight.duration != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          flight.duration!,
                          style: TextStyle(
                            color: AppTheme.getMutedForegroundColor(brightness),
                            fontSize: 10,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                // Arrival
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        flight.arrivalAirportCode ?? '---',
                        style: TextStyle(
                          color: AppTheme.getForegroundColor(brightness),
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      if (flight.arrivalCity != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          flight.arrivalCity!,
                          style: TextStyle(
                            color: AppTheme.getMutedForegroundColor(brightness),
                            fontSize: 12,
                          ),
                          textAlign: TextAlign.right,
                        ),
                      ],
                      const SizedBox(height: 8),
                      Text(
                        flight.formattedArrivalTime ?? '--:--',
                        style: TextStyle(
                          color: AppTheme.getForegroundColor(brightness),
                          fontSize: 16,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          // Additional details
          if (flight.travelClass != null || flight.seatNumber != null) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                if (flight.travelClass != null)
                  Expanded(
                    child: _DetailChip(
                      label: 'Class',
                      value: flight.travelClass!,
                    ),
                  ),
                if (flight.travelClass != null && flight.seatNumber != null)
                  const SizedBox(width: 12),
                if (flight.seatNumber != null)
                  Expanded(
                    child: _DetailChip(
                      label: 'Seat',
                      value: flight.seatNumber!,
                    ),
                  ),
              ],
            ),
          ],
          if (flight.bookingRef != null) ...[
            const SizedBox(height: 12),
            _DetailChip(
              label: 'Booking Ref',
              value: flight.bookingRef!,
            ),
          ],
        ],
      ),
    );
  }
}

class _DetailChip extends StatelessWidget {
  final String label;
  final String value;

  const _DetailChip({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppTheme.getCardColor(brightness),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              color: AppTheme.getMutedForegroundColor(brightness),
              fontSize: 12,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              color: AppTheme.getForegroundColor(brightness),
              fontSize: 14,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
