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
  
  // Airline
  final _airlineController = TextEditingController();
  
  // Departure
  final _departCityController = TextEditingController();
  final _departAirportController = TextEditingController();
  DateTime? _departDate;
  TimeOfDay? _departTime;
  
  // Arrival
  final _arrivalAirportController = TextEditingController();
  final _arrivalCityController = TextEditingController();
  DateTime? _arrivalDate;
  TimeOfDay? _arrivalTime;
  
  // Flight details
  final _gateController = TextEditingController();
  final _boardsController = TextEditingController();
  final _flightNumberController = TextEditingController();
  final _seatController = TextEditingController();
  final _sequenceController = TextEditingController();
  final _groupController = TextEditingController();
  final _passengerController = TextEditingController();
  final _classController = TextEditingController();
  final _ticketNumberController = TextEditingController();
  final _bookingRefController = TextEditingController();
  
  final String _direction = 'arrival';
  bool _isLoading = false;

  @override
  void dispose() {
    _airlineController.dispose();
    _departCityController.dispose();
    _departAirportController.dispose();
    _arrivalAirportController.dispose();
    _arrivalCityController.dispose();
    _gateController.dispose();
    _boardsController.dispose();
    _flightNumberController.dispose();
    _seatController.dispose();
    _sequenceController.dispose();
    _groupController.dispose();
    _passengerController.dispose();
    _classController.dispose();
    _ticketNumberController.dispose();
    _bookingRefController.dispose();
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

      // Build notes from extra fields that don't have direct DB columns
      final notesParts = <String>[];
      if (_boardsController.text.trim().isNotEmpty) {
        notesParts.add('Boards: ${_boardsController.text.trim()}');
      }

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
        'gate': _gateController.text.trim().isEmpty ? null : _gateController.text.trim(),
        'boarding_group': _groupController.text.trim().isEmpty ? null : _groupController.text.trim(),
        'boarding_sequence': _sequenceController.text.trim().isEmpty ? null : _sequenceController.text.trim(),
        'passenger_name': _passengerController.text.trim().isEmpty ? null : _passengerController.text.trim(),
        'seat_number': _seatController.text.trim().isEmpty ? null : _seatController.text.trim(),
        'travel_class': _classController.text.trim().isEmpty ? null : _classController.text.trim(),
        'ticket_number': _ticketNumberController.text.trim().isEmpty ? null : _ticketNumberController.text.trim(),
        'booking_ref': _bookingRefController.text.trim().isEmpty ? null : _bookingRefController.text.trim(),
        'notes': notesParts.isEmpty ? null : notesParts.join('\n'),
        'source': 'artist',
      });

      if (mounted) {
        widget.onFlightAdded?.call();
      }
    } catch (e) {
      if (mounted) {
        AppToast.error(context, 'Failed to save flight: $e');
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
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
                    // Airline
                    FormTextField(
                      label: 'Airline',
                      hint: 'Name',
                      controller: _airlineController,
                    ),
                    const SizedBox(height: 16),
                    
                    // Departure section header
                    _buildSectionHeader(context, 'Departure'),
                    FormTextField(
                      label: '',
                      hint: 'City',
                      controller: _departCityController,
                    ),
                    FormTextField(
                      label: '',
                      hint: 'Airport',
                      controller: _departAirportController,
                    ),
                    FormDateField(
                      label: '',
                      value: _departDate,
                      onChanged: (date) => setState(() => _departDate = date),
                      hint: 'Date',
                    ),
                    FormTimeField(
                      label: '',
                      value: _departTime,
                      onChanged: (time) => setState(() => _departTime = time),
                      hint: 'Time',
                    ),
                    const SizedBox(height: 16),
                    
                    // Arrival section header
                    _buildSectionHeader(context, 'Arrival'),
                    FormTextField(
                      label: '',
                      hint: 'City',
                      controller: _arrivalCityController,
                    ),
                    FormTextField(
                      label: '',
                      hint: 'Airport',
                      controller: _arrivalAirportController,
                    ),
                    FormDateField(
                      label: '',
                      value: _arrivalDate,
                      onChanged: (date) => setState(() => _arrivalDate = date),
                      hint: 'Date',
                    ),
                    FormTimeField(
                      label: '',
                      value: _arrivalTime,
                      onChanged: (time) => setState(() => _arrivalTime = time),
                      hint: 'Time',
                    ),
                    const SizedBox(height: 8),
                    
                    // Flight details
                    FormTextField(
                      label: 'Gate',
                      hint: 'Gate',
                      controller: _gateController,
                    ),
                    FormTextField(
                      label: 'Boards',
                      hint: 'Boards',
                      controller: _boardsController,
                    ),
                    FormTextField(
                      label: 'Flight #',
                      hint: 'Flight Number',
                      controller: _flightNumberController,
                    ),
                    FormTextField(
                      label: 'Seat',
                      hint: 'Seat',
                      controller: _seatController,
                    ),
                    FormTextField(
                      label: 'Seq',
                      hint: 'Sequence',
                      controller: _sequenceController,
                    ),
                    FormTextField(
                      label: 'Group',
                      hint: 'Group',
                      controller: _groupController,
                    ),
                    FormTextField(
                      label: 'Passenger',
                      hint: 'Full Name',
                      controller: _passengerController,
                    ),
                    FormTextField(
                      label: 'Class',
                      hint: 'Class',
                      controller: _classController,
                    ),
                    FormTextField(
                      label: 'Ticket#',
                      hint: 'Ticket Number',
                      controller: _ticketNumberController,
                    ),
                    FormTextField(
                      label: 'Book. No.',
                      hint: 'Booking Number',
                      controller: _bookingRefController,
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

  Widget _buildSectionHeader(BuildContext context, String title) {
    final colorScheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          SizedBox(
            width: 80,
            child: Text(
              title,
              style: TextStyle(
                color: colorScheme.onSurfaceVariant,
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
