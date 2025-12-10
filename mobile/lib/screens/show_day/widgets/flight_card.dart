import 'package:flutter/cupertino.dart';
import 'package:mobile/widgets/marquee_text.dart';
import '../../../theme/app_theme.dart';

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
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;
    
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 200,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.getCardColor(brightness),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: AppTheme.getCardBorderColor(brightness)),
        ),
        child: IntrinsicHeight(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
            // Top row: Label and Flight Number
            Row(
              children: [
                Text(
                  'Flight',
                  style: TextStyle(color: AppTheme.getMutedForegroundColor(brightness), fontSize: 11),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: MarqueeText(
                    flightNumber,
                    style: TextStyle(
                      color: AppTheme.getMutedForegroundColor(brightness),
                      fontSize: 11,
                    ),
                    textAlign: TextAlign.right,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12), // Reduced from 12
            
              // Middle row: Route with big codes - spans full width
              Row(
                children: [
                  // Departure column - just code, no city
                  Expanded(
                    child: MarqueeText(
                      departure,
                      style: TextStyle(
                        color: AppTheme.getForegroundColor(brightness),
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  
                  // Duration column - centered
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (duration != null)
                          SizedBox(
                            width: 60,
                            child: MarqueeText(
                              duration!,
                              style: TextStyle(
                                color: AppTheme.getMutedForegroundColor(brightness),
                                fontSize: 10,
                              ),
                              textAlign: TextAlign.center,
                            ),
                          ),
                        const SizedBox(height: 2),
                        Container(
                          width: 60,
                          height: 1,
                          color: AppTheme.getMutedForegroundColor(brightness).withValues(alpha: 0.5),
                        ),
                      ],
                    ),
                  ),
                  
                  // Arrival column - just code, no city
                  Expanded(
                    child: MarqueeText(
                      arrival,
                      style: TextStyle(
                        color: AppTheme.getForegroundColor(brightness),
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                      ),
                      textAlign: TextAlign.right,
                    ),
                  ),
                ],
              ),
            
            const SizedBox(height: 8), // Reduced from 12
            
              // Bottom row: Times
              Row(
                children: [
                  Expanded(
                    child: MarqueeText(
                      departureTime,
                      style: TextStyle(color: AppTheme.getForegroundColor(brightness), fontSize: 11),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: MarqueeText(
                      arrivalTime,
                      style: TextStyle(
                        color: AppTheme.getForegroundColor(brightness),
                        fontSize: 11,
                      ),
                      textAlign: TextAlign.right,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
