import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../components/components.dart';
import '../../../providers/auth_provider.dart';
import 'form_widgets.dart';

/// Layer 3: Add hotel form screen
class AddHotelScreen extends ConsumerStatefulWidget {
  final String showId;
  final String orgId;
  final VoidCallback? onHotelAdded;

  const AddHotelScreen({
    super.key,
    required this.showId,
    required this.orgId,
    this.onHotelAdded,
  });

  @override
  ConsumerState<AddHotelScreen> createState() => _AddHotelScreenState();
}

class _AddHotelScreenState extends ConsumerState<AddHotelScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _addressController = TextEditingController();
  final _cityController = TextEditingController();
  final _countryController = TextEditingController();
  final _bookingRefController = TextEditingController();
  final _roomTypeController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  final _notesController = TextEditingController();
  
  DateTime? _checkInDate;
  TimeOfDay? _checkInTime;
  DateTime? _checkOutDate;
  TimeOfDay? _checkOutTime;
  
  bool _isLoading = false;

  @override
  void dispose() {
    _nameController.dispose();
    _addressController.dispose();
    _cityController.dispose();
    _countryController.dispose();
    _bookingRefController.dispose();
    _roomTypeController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
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

      await supabase.from('advancing_lodging').insert({
        'show_id': widget.showId,
        'hotel_name': _nameController.text.trim(),
        'address': _addressController.text.trim().isEmpty ? null : _addressController.text.trim(),
        'city': _cityController.text.trim().isEmpty ? null : _cityController.text.trim(),
        'country': _countryController.text.trim().isEmpty ? null : _countryController.text.trim(),
        'check_in_at': checkInAt?.toIso8601String(),
        'check_out_at': checkOutAt?.toIso8601String(),
        'booking_refs': bookingRefs.isEmpty ? null : bookingRefs,
        'phone': _phoneController.text.trim().isEmpty ? null : _phoneController.text.trim(),
        'email': _emailController.text.trim().isEmpty ? null : _emailController.text.trim(),
        'notes': _notesController.text.trim().isEmpty ? null : _notesController.text.trim(),
        'source': 'artist',
      });

      if (mounted) {
        widget.onHotelAdded?.call();
      }
    } catch (e) {
      if (mounted) {
        AppToast.error(context, 'Failed to save hotel: $e');
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
      title: 'Add Hotel',
      body: Form(
        key: _formKey,
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: Column(
                  children: [
                    FormTextField(
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
                    FormTextField(
                      label: 'Address',
                      hint: 'Address',
                      controller: _addressController,
                    ),
                    FormTextField(
                      label: 'City',
                      hint: 'City',
                      controller: _cityController,
                    ),
                    FormTextField(
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
                    FormTextField(
                      label: 'Book. no.',
                      hint: 'Booking Number',
                      controller: _bookingRefController,
                    ),
                    FormTextField(
                      label: 'Room Type',
                      hint: 'Room Type',
                      controller: _roomTypeController,
                    ),
                    FormTextField(
                      label: 'Phone',
                      hint: 'Phone',
                      controller: _phoneController,
                      keyboardType: TextInputType.phone,
                    ),
                    FormTextField(
                      label: 'Email',
                      hint: 'Email',
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
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
              onPressed: _saveHotel,
              isLoading: _isLoading,
            ),
          ],
        ),
      ),
    );
  }
}
