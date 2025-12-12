import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../components/components.dart';
import '../../../providers/auth_provider.dart';
import '../../../models/show_day.dart';
import 'form_widgets.dart';

/// Layer 3: Edit hotel form screen - prefilled with existing data
class EditHotelScreen extends ConsumerStatefulWidget {
  final String showId;
  final String orgId;
  final LodgingInfo hotel;
  final VoidCallback? onHotelUpdated;

  const EditHotelScreen({
    super.key,
    required this.showId,
    required this.orgId,
    required this.hotel,
    this.onHotelUpdated,
  });

  @override
  ConsumerState<EditHotelScreen> createState() => _EditHotelScreenState();
}

class _EditHotelScreenState extends ConsumerState<EditHotelScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameController;
  late final TextEditingController _addressController;
  late final TextEditingController _cityController;
  late final TextEditingController _countryController;
  late final TextEditingController _bookingRefController;
  late final TextEditingController _phoneController;
  late final TextEditingController _emailController;
  late final TextEditingController _notesController;
  
  DateTime? _checkInDate;
  DateTime? _checkInTime;
  DateTime? _checkOutDate;
  DateTime? _checkOutTime;
  
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    // Initialize controllers with existing data
    _nameController = TextEditingController(text: widget.hotel.hotelName ?? '');
    _addressController = TextEditingController(text: widget.hotel.address ?? '');
    _cityController = TextEditingController(text: widget.hotel.city ?? '');
    _countryController = TextEditingController();
    _bookingRefController = TextEditingController(
      text: widget.hotel.bookingRefs?.isNotEmpty == true 
          ? widget.hotel.bookingRefs!.first 
          : '',
    );
    _phoneController = TextEditingController(text: widget.hotel.phone ?? '');
    _emailController = TextEditingController(text: widget.hotel.email ?? '');
    _notesController = TextEditingController(text: widget.hotel.notes ?? '');
    
    // Parse existing dates
    if (widget.hotel.checkInAt != null) {
      try {
        final dt = DateTime.parse(widget.hotel.checkInAt!);
        _checkInDate = DateTime(dt.year, dt.month, dt.day);
        _checkInTime = dt;
      } catch (_) {}
    }
    if (widget.hotel.checkOutAt != null) {
      try {
        final dt = DateTime.parse(widget.hotel.checkOutAt!);
        _checkOutDate = DateTime(dt.year, dt.month, dt.day);
        _checkOutTime = dt;
      } catch (_) {}
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _addressController.dispose();
    _cityController.dispose();
    _countryController.dispose();
    _bookingRefController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _notesController.dispose();
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

  Future<void> _saveHotel() async {
    if (!_formKey.currentState!.validate()) return;
    
    setState(() => _isLoading = true);

    try {
      final supabase = ref.read(supabaseClientProvider);
      
      final checkInAt = _combineDateTime(_checkInDate, _checkInTime);
      final checkOutAt = _combineDateTime(_checkOutDate, _checkOutTime);
      
      // Parse booking refs into array
      final bookingRefs = _bookingRefController.text.trim().isNotEmpty
          ? [_bookingRefController.text.trim()]
          : <String>[];

      // Use RPC function to update
      await supabase.rpc('update_lodging', params: {
        'p_lodging_id': widget.hotel.id,
        'p_hotel_name': _nameController.text.trim(),
        'p_address': _addressController.text.trim().isEmpty ? null : _addressController.text.trim(),
        'p_city': _cityController.text.trim().isEmpty ? null : _cityController.text.trim(),
        'p_country': _countryController.text.trim().isEmpty ? null : _countryController.text.trim(),
        'p_check_in_at': checkInAt?.toIso8601String(),
        'p_check_out_at': checkOutAt?.toIso8601String(),
        'p_booking_refs': bookingRefs.isEmpty ? null : bookingRefs,
        'p_phone': _phoneController.text.trim().isEmpty ? null : _phoneController.text.trim(),
        'p_email': _emailController.text.trim().isEmpty ? null : _emailController.text.trim(),
        'p_notes': _notesController.text.trim().isEmpty ? null : _notesController.text.trim(),
      });

      // Sync to schedule if check-in/check-out times are set
      if (checkInAt != null && checkOutAt != null) {
        await _syncLodgingToSchedule(
          supabase: supabase,
          lodgingId: widget.hotel.id,
          hotelName: _nameController.text.trim(),
          city: _cityController.text.trim(),
          checkInAt: checkInAt,
          checkOutAt: checkOutAt,
        );
      }

      if (mounted) {
        widget.onHotelUpdated?.call();
      }
    } catch (e) {
      if (mounted) {
        AppToast.error(context, 'Failed to update hotel: $e');
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _syncLodgingToSchedule({
    required SupabaseClient supabase,
    required String lodgingId,
    required String hotelName,
    required String city,
    required DateTime checkInAt,
    required DateTime checkOutAt,
  }) async {
    try {
      // Delete any existing schedule items for this lodging
      final existingItems = await supabase
          .rpc('get_schedule_items_for_show', params: {'p_show_id': widget.showId});
      
      if (existingItems != null) {
        final List<dynamic> items = existingItems as List<dynamic>;
        for (final item in items) {
          if (item['source'] == 'advancing_lodging' && item['source_ref'] == lodgingId) {
            await supabase.rpc('delete_schedule_item', params: {
              'p_item_id': item['id'],
            });
          }
        }
      }

      // Create new schedule items for check-in and check-out
      final location = city.isEmpty ? null : city;

      // Check-in item
      await supabase.rpc('create_schedule_item', params: {
        'p_org_id': widget.orgId,
        'p_show_id': widget.showId,
        'p_title': 'Check In${hotelName.isEmpty ? '' : ' - $hotelName'}',
        'p_starts_at': checkInAt.toIso8601String(),
        'p_location': location,
        'p_item_type': 'lodging',
        'p_auto_generated': true,
        'p_source': 'advancing_lodging',
        'p_source_ref': lodgingId,
      });

      // Check-out item
      await supabase.rpc('create_schedule_item', params: {
        'p_org_id': widget.orgId,
        'p_show_id': widget.showId,
        'p_title': 'Check Out${hotelName.isEmpty ? '' : ' - $hotelName'}',
        'p_starts_at': checkOutAt.toIso8601String(),
        'p_location': location,
        'p_item_type': 'lodging',
        'p_auto_generated': true,
        'p_source': 'advancing_lodging',
        'p_source_ref': lodgingId,
      });
    } catch (e) {
      // Don't throw - schedule sync is optional
    }
  }

  @override
  Widget build(BuildContext context) {
    return LayerScaffold(
      title: 'Edit Hotel',
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
                      label: 'Name',
                      hint: 'Name',
                      controller: _nameController,
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'Name is required';
                        }
                        return null;
                      },
                    ),
                    FormCupertinoTextField(
                      label: 'Address',
                      hint: 'Address',
                      controller: _addressController,
                    ),
                    FormCupertinoTextField(
                      label: 'City',
                      hint: 'City',
                      controller: _cityController,
                    ),
                    FormCupertinoTextField(
                      label: 'Country',
                      hint: 'Country',
                      controller: _countryController,
                    ),
                    FormDateField(
                      label: 'Check-in',
                      value: _checkInDate,
                      onChanged: (date) => setState(() => _checkInDate = date),
                    ),
                    FormTimeField(
                      label: 'Check-in',
                      value: _checkInTime,
                      onChanged: (time) => setState(() => _checkInTime = time),
                    ),
                    FormDateField(
                      label: 'Check-out',
                      value: _checkOutDate,
                      onChanged: (date) => setState(() => _checkOutDate = date),
                    ),
                    FormTimeField(
                      label: 'Check-out',
                      value: _checkOutTime,
                      onChanged: (time) => setState(() => _checkOutTime = time),
                    ),
                    FormCupertinoTextField(
                      label: 'Book. no.',
                      hint: 'Booking Number',
                      controller: _bookingRefController,
                    ),
                    FormCupertinoTextField(
                      label: 'Phone',
                      hint: 'Phone',
                      controller: _phoneController,
                      keyboardType: TextInputType.phone,
                    ),
                    FormCupertinoTextField(
                      label: 'Email',
                      hint: 'Email',
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                    ),
                    FormCupertinoTextField(
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
              onPressed: _saveHotel,
              isLoading: _isLoading,
            ),
          ],
        ),
      ),
    );
  }
}
