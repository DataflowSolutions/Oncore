import 'package:flutter/material.dart';

/// Flight card widget for displaying flight information
/// Designed for horizontal scrolling list
class FlightCard extends StatelessWidget {
  final String flightNumber;
  final String departure;
  final String arrival;
  final String departureTime;
  final String arrivalTime;
  final String? duration;
  final VoidCallback? onTap;

  const FlightCard({
    super.key,
    required this.flightNumber,
    required this.departure,
    required this.arrival,
    required this.departureTime,
    required this.arrivalTime,
    this.duration,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 240, // Wider card
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: colorScheme.surfaceContainer,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: colorScheme.outline),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            // Top row: Label and Flight Number
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Flight', // Generic label or could be passed in
                  style: TextStyle(color: colorScheme.onSurfaceVariant, fontSize: 12),
                ),
                Text(
                  flightNumber,
                  style: TextStyle(
                    color: colorScheme.onSurfaceVariant,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            
            // Middle row: Route with big codes
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Flexible(
                  child: Text(
                    departure,
                    style: TextStyle(
                      color: colorScheme.onSurface,
                      fontSize: 20,
                      fontWeight: FontWeight.w600,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Column(
                      children: [
                        if (duration != null)
                          Text(
                            duration!,
                            style: TextStyle(
                              color: colorScheme.onSurfaceVariant,
                              fontSize: 10,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        const SizedBox(height: 2),
                        Container(
                          height: 1,
                          color: colorScheme.onSurfaceVariant.withValues(alpha: 0.5),
                        ),
                      ],
                    ),
                  ),
                ),
                Flexible(
                  child: Text(
                    arrival,
                    style: TextStyle(
                      color: colorScheme.onSurface,
                      fontSize: 20,
                      fontWeight: FontWeight.w600,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            
            const SizedBox(height: 16),
            
            // Bottom row: Times
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  departureTime,
                  style: TextStyle(color: colorScheme.onSurface, fontSize: 12),
                ),
                Text(
                  arrivalTime,
                  style: TextStyle(
                    color: colorScheme.onSurfaceVariant,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
