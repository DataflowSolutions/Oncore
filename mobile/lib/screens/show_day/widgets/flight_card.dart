import 'package:flutter/material.dart';
import '../../../theme/app_theme.dart';

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
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 240, // Wider card
        padding: const EdgeInsets.all(AppTheme.spacingMd),
        decoration: BoxDecoration(
          color: AppTheme.card,
          borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
          border: Border.all(color: AppTheme.border),
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
                  style: AppTheme.caption,
                ),
                Text(
                  flightNumber,
                  style: AppTheme.caption.copyWith(
                    color: AppTheme.muted,
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppTheme.spacingMd),
            
            // Middle row: Route with big codes
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Flexible(
                  child: Text(
                    departure,
                    style: AppTheme.headingMedium.copyWith(fontSize: 20),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: AppTheme.spacingMd),
                    child: Column(
                      children: [
                        if (duration != null)
                          Text(
                            duration!,
                            style: const TextStyle(
                              color: AppTheme.muted,
                              fontSize: 10,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        const SizedBox(height: 2),
                        Container(
                          height: 1,
                          color: AppTheme.muted.withValues(alpha: 0.5),
                        ),
                      ],
                    ),
                  ),
                ),
                Flexible(
                  child: Text(
                    arrival,
                    style: AppTheme.headingMedium.copyWith(fontSize: 20),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            
            const SizedBox(height: AppTheme.spacingMd),
            
            // Bottom row: Times
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  departureTime,
                  style: AppTheme.bodySmall,
                ),
                Text(
                  arrivalTime,
                  style: AppTheme.bodySmall.copyWith(
                    color: AppTheme.muted,
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
