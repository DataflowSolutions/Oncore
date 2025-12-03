import 'package:flutter/material.dart';

/// Flight card widget for displaying flight information
/// Designed for horizontal scrolling list
class FlightCard extends StatelessWidget {
  final String flightNumber;
  final String departure;
  final String? departureCity;
  final String arrival;
  final String? arrivalCity;
  final String departureTime;
  final String arrivalTime;
  final String? duration;
  final VoidCallback? onTap;

  const FlightCard({
    super.key,
    required this.flightNumber,
    required this.departure,
    this.departureCity,
    required this.arrival,
    this.arrivalCity,
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
        width: 260,
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
                  'Flight',
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
            const SizedBox(height: 12),
            
            // Middle row: Route with big codes - fixed proportions
            Row(
              children: [
                // Departure column
                SizedBox(
                  width: 60,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        departure,
                        style: TextStyle(
                          color: colorScheme.onSurface,
                          fontSize: 20,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      if (departureCity != null)
                        Text(
                          departureCity!,
                          style: TextStyle(
                            color: colorScheme.onSurfaceVariant,
                            fontSize: 10,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                    ],
                  ),
                ),
                
                // Duration column - flexible to take remaining space
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                    child: Column(
                      children: [
                        if (duration != null)
                          Text(
                            duration!,
                            style: TextStyle(
                              color: colorScheme.onSurfaceVariant,
                              fontSize: 11,
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
                
                // Arrival column
                SizedBox(
                  width: 60,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        arrival,
                        style: TextStyle(
                          color: colorScheme.onSurface,
                          fontSize: 20,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      if (arrivalCity != null)
                        Text(
                          arrivalCity!,
                          style: TextStyle(
                            color: colorScheme.onSurfaceVariant,
                            fontSize: 10,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          textAlign: TextAlign.right,
                        ),
                    ],
                  ),
                ),
              ],
            ),
            
            const SizedBox(height: 12),
            
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
                    color: colorScheme.onSurface,
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
