import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
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

      // Use RPC function instead of direct insert
      final response = await supabase.rpc('create_flight', params: {
        'p_show_id': widget.showId,
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
        'p_notes': notesParts.isEmpty ? null : notesParts.join('\n'),
        'p_source': 'artist',
        'p_auto_schedule': true,
      });

      // Sync to schedule if auto_schedule is true and times are valid
      if (response != null && departAt != null && arrivalAt != null) {
        final flightId = response['id'] as String?;
        if (flightId != null) {
          await _syncFlightToSchedule(
            supabase: supabase,
            flightId: flightId,
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
      }

      if (mounted) {
        widget.onFlightAdded?.call();
      }
    } catch (e) {
      print('═══════════════════════════════════════');
      print('❌ ERROR saving flight: $e');
      print('═══════════════════════════════════════');
      if (mounted) {
        AppToast.error(context, 'Failed to save flight: $e');
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
      final notesParts = <String>[];
      if (departCity.isNotEmpty) notesParts.add('From $departCity');
      if (arrivalCity.isNotEmpty) notesParts.add('to $arrivalCity');

      await supabase.rpc('create_schedule_item', params: {
        'p_org_id': widget.orgId,
        'p_show_id': widget.showId,
        'p_title': 'Flight ${flightNumber.isEmpty ? '' : flightNumber} - ${airline.isEmpty ? 'Flight' : airline}'.trim(),
        'p_starts_at': departAt.toIso8601String(),
        'p_ends_at': arrivalAt.toIso8601String(),
        'p_location': location,
        'p_notes': notesParts.isEmpty ? null : notesParts.join(' '),
        'p_item_type': direction == 'arrival' ? 'arrival' : 'departure',
        'p_auto_generated': true,
        'p_source': 'advancing_flight',
        'p_source_ref': flightId,
      });
    } catch (e) {
      print('═══════════════════════════════════════');
      print('⚠️  WARNING: Failed to sync flight to schedule: $e');
      print('═══════════════════════════════════════');
      // Don't throw - schedule sync is optional
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
