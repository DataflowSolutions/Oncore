import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../components/components.dart';
import '../../../providers/auth_provider.dart';
import '../../../models/show_day.dart';
import 'form_widgets.dart';

/// Layer 3: Edit flight form screen - prefilled with existing data
class EditFlightScreen extends ConsumerStatefulWidget {
  final String showId;  
  final String orgId;
  final FlightInfo flight;
  final VoidCallback? onFlightUpdated;

  const EditFlightScreen({
    super.key,
    required this.showId,
    required this.orgId,
    required this.flight,
    this.onFlightUpdated,
  });

  @override
  ConsumerState<EditFlightScreen> createState() => _EditFlightScreenState();
}

class _EditFlightScreenState extends ConsumerState<EditFlightScreen> {
  final _formKey = GlobalKey<FormState>();
  
  // Airline
  late final TextEditingController _airlineController;
  
  // Departure
  late final TextEditingController _departCityController;
  late final TextEditingController _departAirportController;
  DateTime? _departDate;
  DateTime? _departTime;
  
  // Arrival
  late final TextEditingController _arrivalAirportController;
  late final TextEditingController _arrivalCityController;
  DateTime? _arrivalDate;
  DateTime? _arrivalTime;
  
  // Flight details
  late final TextEditingController _flightNumberController;
  late final TextEditingController _seatController;
  late final TextEditingController _passengerController;
  late final TextEditingController _classController;
  late final TextEditingController _ticketNumberController;
  late final TextEditingController _bookingRefController;
  
  late String _direction;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    // Initialize controllers with existing data
    _airlineController = TextEditingController(text: widget.flight.airline ?? '');
    _departCityController = TextEditingController(text: widget.flight.departCity ?? '');
    _departAirportController = TextEditingController(text: widget.flight.departAirportCode ?? '');
    _arrivalAirportController = TextEditingController(text: widget.flight.arrivalAirportCode ?? '');
    _arrivalCityController = TextEditingController(text: widget.flight.arrivalCity ?? '');
    _flightNumberController = TextEditingController(text: widget.flight.flightNumber ?? '');
    _seatController = TextEditingController(text: widget.flight.seatNumber ?? '');
    _passengerController = TextEditingController(text: widget.flight.passengerName ?? '');
    _classController = TextEditingController(text: widget.flight.travelClass ?? '');
    _ticketNumberController = TextEditingController(text: widget.flight.ticketNumber ?? '');
    _bookingRefController = TextEditingController(text: widget.flight.bookingRef ?? '');
    _direction = widget.flight.direction;
    
    // Parse existing dates
    if (widget.flight.departAt != null) {
      try {
        final dt = DateTime.parse(widget.flight.departAt!);
        _departDate = DateTime(dt.year, dt.month, dt.day);
        _departTime = dt;
      } catch (_) {}
    }
    if (widget.flight.arrivalAt != null) {
      try {
        final dt = DateTime.parse(widget.flight.arrivalAt!);
        _arrivalDate = DateTime(dt.year, dt.month, dt.day);
        _arrivalTime = dt;
      } catch (_) {}
    }
  }

  @override
  void dispose() {
    _airlineController.dispose();
    _departCityController.dispose();
    _departAirportController.dispose();
    _arrivalAirportController.dispose();
    _arrivalCityController.dispose();
    _flightNumberController.dispose();
    _seatController.dispose();
    _passengerController.dispose();
    _classController.dispose();
    _ticketNumberController.dispose();
    _bookingRefController.dispose();
    super.dispose();
  }

  DateTime? _combineDateTime(DateTime? date, DateTime? time) {
    if (date == null) return null;
    final effectiveTime = time ?? DateTime.now();
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

      // Use RPC function to update
      await supabase.rpc('update_flight', params: {
        'p_flight_id': widget.flight.id,
        'p_direction': _direction,
        'p_airline': _airlineController.text.trim().isEmpty ? null : _airlineController.text.trim(),
        'p_flight_number': _flightNumberController.text.trim().isEmpty ? null : _flightNumberController.text.trim(),
        'p_depart_airport_code': _departAirportController.text.trim().isEmpty ? null : _departAirportController.text.trim().toUpperCase(),
        'p_depart_city': _departCityController.text.trim().isEmpty ? null : _departCityController.text.trim(),
        'p_depart_at': departAt?.toIso8601String(),
        'p_arrival_airport_code': _arrivalAirportController.text.trim().isEmpty ? null : _arrivalAirportController.text.trim().toUpperCase(),
        'p_arrival_city': _arrivalCityController.text.trim().isEmpty ? null : _arrivalCityController.text.trim(),
        'p_arrival_at': arrivalAt?.toIso8601String(),
        'p_passenger_name': _passengerController.text.trim().isEmpty ? null : _passengerController.text.trim(),
        'p_seat_number': _seatController.text.trim().isEmpty ? null : _seatController.text.trim(),
        'p_travel_class': _classController.text.trim().isEmpty ? null : _classController.text.trim(),
        'p_ticket_number': _ticketNumberController.text.trim().isEmpty ? null : _ticketNumberController.text.trim(),
        'p_booking_ref': _bookingRefController.text.trim().isEmpty ? null : _bookingRefController.text.trim(),
      });

      // Sync to schedule if times are valid
      if (departAt != null && arrivalAt != null) {
        await _syncFlightToSchedule(
          supabase: supabase,
          flightId: widget.flight.id,
          flightNumber: _flightNumberController.text.trim(),
          airline: _airlineController.text.trim(),
          departAirport: _departAirportController.text.trim().toUpperCase(),
          departCity: _departCityController.text.trim(),
          arrivalAirport: _arrivalAirportController.text.trim().toUpperCase(),
          arrivalCity: _arrivalCityController.text.trim(),
          departAt: departAt,
          arrivalAt: arrivalAt,
          direction: _direction,
        );
      }

      if (mounted) {
        widget.onFlightUpdated?.call();
      }
    } catch (e) {
      if (mounted) {
        AppToast.error(context, 'Failed to update flight: $e');
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _syncFlightToSchedule({
    required SupabaseClient supabase,
    required String flightId,
    required String flightNumber,
    required String airline,
    required String departAirport,
    required String departCity,
    required String arrivalAirport,
    required String arrivalCity,
    required DateTime departAt,
    required DateTime arrivalAt,
    required String direction,
  }) async {
    try {
      // Delete any existing schedule items for this flight
      final existingItems = await supabase
          .rpc('get_schedule_items_for_show', params: {'p_show_id': widget.showId});
      
      if (existingItems != null) {
        final List<dynamic> items = existingItems as List<dynamic>;
        for (final item in items) {
          if (item['source'] == 'advancing_flight' && item['source_ref'] == flightId) {
            await supabase.rpc('delete_schedule_item', params: {
              'p_item_id': item['id'],
            });
          }
        }
      }

      // Create new schedule item
      final location = '${departAirport.isEmpty ? 'DEP' : departAirport} → ${arrivalAirport.isEmpty ? 'ARR' : arrivalAirport}';
      final title = direction == 'arrival' 
          ? 'Flight Arrival${flightNumber.isEmpty ? '' : ' - $flightNumber'}'
          : 'Flight Departure${flightNumber.isEmpty ? '' : ' - $flightNumber'}';

      await supabase.rpc('create_schedule_item', params: {
        'p_org_id': widget.orgId,
        'p_show_id': widget.showId,
        'p_title': title,
        'p_starts_at': (direction == 'arrival' ? arrivalAt : departAt).toIso8601String(),
        'p_location': location,
        'p_item_type': 'flight',
        'p_auto_generated': true,
        'p_source': 'advancing_flight',
        'p_source_ref': flightId,
      });
    } catch (e) {
      // Don't throw - schedule sync is optional
    }
  }

  @override
  Widget build(BuildContext context) {
    return LayerScaffold(
      title: 'Edit Flight',
      body: Form(
        key: _formKey,
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: Column(
                  children: [
                    FormCupertinoTextField(
                      label: 'Airline',
                      hint: 'Airline',
                      controller: _airlineController,
                    ),
                    FormCupertinoTextField(
                      label: 'Flight #',
                      hint: 'Flight Number',
                      controller: _flightNumberController,
                    ),
                    const SizedBox(height: 16),
                    // Departure section
                    FormCupertinoTextField(
                      label: 'From',
                      hint: 'Departure Airport Code',
                      controller: _departAirportController,
                    ),
                    FormCupertinoTextField(
                      label: 'City',
                      hint: 'Departure City',
                      controller: _departCityController,
                    ),
                    FormDateField(
                      label: 'Depart',
                      value: _departDate,
                      onChanged: (date) => setState(() => _departDate = date),
                    ),
                    FormTimeField(
                      label: 'Depart',
                      value: _departTime,
                      onChanged: (time) => setState(() => _departTime = time),
                    ),
                    const SizedBox(height: 16),
                    // Arrival section
                    FormCupertinoTextField(
                      label: 'To',
                      hint: 'Arrival Airport Code',
                      controller: _arrivalAirportController,
                    ),
                    FormCupertinoTextField(
                      label: 'City',
                      hint: 'Arrival City',
                      controller: _arrivalCityController,
                    ),
                    FormDateField(
                      label: 'Arrive',
                      value: _arrivalDate,
                      onChanged: (date) => setState(() => _arrivalDate = date),
                    ),
                    FormTimeField(
                      label: 'Arrive',
                      value: _arrivalTime,
                      onChanged: (time) => setState(() => _arrivalTime = time),
                    ),
                    const SizedBox(height: 16),
                    // Passenger details
                    FormCupertinoTextField(
                      label: 'Passenger',
                      hint: 'Passenger Name',
                      controller: _passengerController,
                    ),
                    FormCupertinoTextField(
                      label: 'Seat',
                      hint: 'Seat Number',
                      controller: _seatController,
                    ),
                    FormCupertinoTextField(
                      label: 'Class',
                      hint: 'Travel Class',
                      controller: _classController,
                    ),
                    FormCupertinoTextField(
                      label: 'Ticket #',
                      hint: 'Ticket Number',
                      controller: _ticketNumberController,
                    ),
                    FormCupertinoTextField(
                      label: 'Book. Ref',
                      hint: 'Booking Reference',
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
}
