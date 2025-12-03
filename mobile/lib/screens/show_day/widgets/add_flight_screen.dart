import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../components/components.dart';
import '../../../providers/auth_provider.dart';
import 'form_widgets.dart';

/// Layer 3: Add flight form screen
class AddFlightScreen extends ConsumerStatefulWidget {
  final String showId;
  final String orgId;
  final VoidCallback? onFlightAdded;

  const AddFlightScreen({
    super.key,
    required this.showId,
    required this.orgId,
    this.onFlightAdded,
  });

  @override
  ConsumerState<AddFlightScreen> createState() => _AddFlightScreenState();
}

class _AddFlightScreenState extends ConsumerState<AddFlightScreen> {
  final _formKey = GlobalKey<FormState>();
  final _airlineController = TextEditingController();
  final _flightNumberController = TextEditingController();
  final _departAirportController = TextEditingController();
  final _departCityController = TextEditingController();
  final _arrivalAirportController = TextEditingController();
  final _arrivalCityController = TextEditingController();
  final _bookingRefController = TextEditingController();
  final _ticketNumberController = TextEditingController();
  final _seatNumberController = TextEditingController();
  final _travelClassController = TextEditingController();
  final _notesController = TextEditingController();
  
  String _direction = 'arrival';
  DateTime? _departDate;
  TimeOfDay? _departTime;
  DateTime? _arrivalDate;
  TimeOfDay? _arrivalTime;
  
  bool _isLoading = false;

  @override
  void dispose() {
    _airlineController.dispose();
    _flightNumberController.dispose();
    _departAirportController.dispose();
    _departCityController.dispose();
    _arrivalAirportController.dispose();
    _arrivalCityController.dispose();
    _bookingRefController.dispose();
    _ticketNumberController.dispose();
    _seatNumberController.dispose();
    _travelClassController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  DateTime? _combineDateTime(DateTime? date, TimeOfDay? time) {
    if (date == null) return null;
    final effectiveTime = time ?? const TimeOfDay(hour: 12, minute: 0);
    return DateTime(
      date.year,
      date.month,
      date.day,
      effectiveTime.hour,
      effectiveTime.minute,
    );
  }

  Future<void> _saveFlight() async {
    if (!_formKey.currentState!.validate()) return;
    
    setState(() => _isLoading = true);

    try {
      final supabase = ref.read(supabaseClientProvider);
      
      final departAt = _combineDateTime(_departDate, _departTime);
      final arrivalAt = _combineDateTime(_arrivalDate, _arrivalTime);

      await supabase.from('advancing_flights').insert({
        'show_id': widget.showId,
        'direction': _direction,
        'airline': _airlineController.text.trim().isEmpty ? null : _airlineController.text.trim(),
        'flight_number': _flightNumberController.text.trim().isEmpty ? null : _flightNumberController.text.trim(),
        'depart_airport_code': _departAirportController.text.trim().isEmpty ? null : _departAirportController.text.trim().toUpperCase(),
        'depart_city': _departCityController.text.trim().isEmpty ? null : _departCityController.text.trim(),
        'depart_at': departAt?.toIso8601String(),
        'arrival_airport_code': _arrivalAirportController.text.trim().isEmpty ? null : _arrivalAirportController.text.trim().toUpperCase(),
        'arrival_city': _arrivalCityController.text.trim().isEmpty ? null : _arrivalCityController.text.trim(),
        'arrival_at': arrivalAt?.toIso8601String(),
        'booking_ref': _bookingRefController.text.trim().isEmpty ? null : _bookingRefController.text.trim(),
        'ticket_number': _ticketNumberController.text.trim().isEmpty ? null : _ticketNumberController.text.trim(),
        'seat_number': _seatNumberController.text.trim().isEmpty ? null : _seatNumberController.text.trim(),
        'travel_class': _travelClassController.text.trim().isEmpty ? null : _travelClassController.text.trim(),
        'notes': _notesController.text.trim().isEmpty ? null : _notesController.text.trim(),
        'source': 'artist',
      });

      if (mounted) {
        widget.onFlightAdded?.call();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to save flight: $e'),
            backgroundColor: Theme.of(context).colorScheme.error,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return LayerScaffold(
      title: 'Add Flight',
      body: Form(
        key: _formKey,
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: Column(
                  children: [
                    // Direction toggle
                    Row(
                      children: [
                        SizedBox(
                          width: 80,
                          child: Text(
                            'Direction',
                            style: TextStyle(
                              color: colorScheme.onSurfaceVariant,
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                        Expanded(
                          child: SegmentedButton<String>(
                            segments: const [
                              ButtonSegment(value: 'arrival', label: Text('Arrival')),
                              ButtonSegment(value: 'departure', label: Text('Departure')),
                            ],
                            selected: {_direction},
                            onSelectionChanged: (values) {
                              setState(() => _direction = values.first);
                            },
                            style: ButtonStyle(
                              backgroundColor: WidgetStateProperty.resolveWith((states) {
                                if (states.contains(WidgetState.selected)) {
                                  return colorScheme.onSurface;
                                }
                                return colorScheme.surfaceContainer;
                              }),
                              foregroundColor: WidgetStateProperty.resolveWith((states) {
                                if (states.contains(WidgetState.selected)) {
                                  return colorScheme.surface;
                                }
                                return colorScheme.onSurface;
                              }),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    FormTextField(
                      label: 'Airline',
                      hint: 'Airline',
                      controller: _airlineController,
                    ),
                    FormTextField(
                      label: 'Flight No.',
                      hint: 'Flight Number',
                      controller: _flightNumberController,
                    ),
                    const SizedBox(height: 16),
                    // Departure section
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Align(
                        alignment: Alignment.centerLeft,
                        child: Text(
                          'DEPARTURE',
                          style: TextStyle(
                            color: colorScheme.onSurfaceVariant,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                    FormTextField(
                      label: 'Airport',
                      hint: 'Airport Code (e.g. JFK)',
                      controller: _departAirportController,
                    ),
                    FormTextField(
                      label: 'City',
                      hint: 'City',
                      controller: _departCityController,
                    ),
                    FormDateField(
                      label: 'Date',
                      value: _departDate,
                      onChanged: (date) => setState(() => _departDate = date),
                    ),
                    FormTimeField(
                      label: 'Time',
                      value: _departTime,
                      onChanged: (time) => setState(() => _departTime = time),
                    ),
                    const SizedBox(height: 16),
                    // Arrival section
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Align(
                        alignment: Alignment.centerLeft,
                        child: Text(
                          'ARRIVAL',
                          style: TextStyle(
                            color: colorScheme.onSurfaceVariant,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                    FormTextField(
                      label: 'Airport',
                      hint: 'Airport Code (e.g. LAX)',
                      controller: _arrivalAirportController,
                    ),
                    FormTextField(
                      label: 'City',
                      hint: 'City',
                      controller: _arrivalCityController,
                    ),
                    FormDateField(
                      label: 'Date',
                      value: _arrivalDate,
                      onChanged: (date) => setState(() => _arrivalDate = date),
                    ),
                    FormTimeField(
                      label: 'Time',
                      value: _arrivalTime,
                      onChanged: (time) => setState(() => _arrivalTime = time),
                    ),
                    const SizedBox(height: 16),
                    // Booking details
                    FormTextField(
                      label: 'Booking',
                      hint: 'Booking Reference',
                      controller: _bookingRefController,
                    ),
                    FormTextField(
                      label: 'Ticket',
                      hint: 'Ticket Number',
                      controller: _ticketNumberController,
                    ),
                    FormTextField(
                      label: 'Seat',
                      hint: 'Seat Number',
                      controller: _seatNumberController,
                    ),
                    FormTextField(
                      label: 'Class',
                      hint: 'Travel Class',
                      controller: _travelClassController,
                    ),
                    FormTextField(
                      label: 'Notes',
                      hint: 'Notes',
                      controller: _notesController,
                      maxLines: 3,
                    ),
                  ],
                ),
              ),
            ),
            FormSubmitButton(
              label: 'Save',
              onPressed: _saveFlight,
              isLoading: _isLoading,
            ),
          ],
        ),
      ),
    );
  }
}
