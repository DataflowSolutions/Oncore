import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../components/components.dart';
import '../../../providers/auth_provider.dart';
import 'form_widgets.dart';

/// Layer 3: Add catering form screen
class AddCateringScreen extends ConsumerStatefulWidget {
  final String showId;
  final String orgId;
  final VoidCallback? onCateringAdded;

  const AddCateringScreen({
    super.key,
    required this.showId,
    required this.orgId,
    this.onCateringAdded,
  });

  @override
  ConsumerState<AddCateringScreen> createState() => _AddCateringScreenState();
}

class _AddCateringScreenState extends ConsumerState<AddCateringScreen> {
  final _formKey = GlobalKey<FormState>();
  final _providerNameController = TextEditingController();
  final _addressController = TextEditingController();
  final _cityController = TextEditingController();
  final _guestCountController = TextEditingController();
  final _bookingRefController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  final _notesController = TextEditingController();
  
  DateTime? _serviceDate;
  TimeOfDay? _serviceTime;
  
  bool _isLoading = false;

  @override
  void dispose() {
    _providerNameController.dispose();
    _addressController.dispose();
    _cityController.dispose();
    _guestCountController.dispose();
    _bookingRefController.dispose();
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

  Future<void> _saveCatering() async {
    if (!_formKey.currentState!.validate()) return;
    
    setState(() => _isLoading = true);

    try {
      final supabase = ref.read(supabaseClientProvider);
      
      final serviceAt = _combineDateTime(_serviceDate, _serviceTime);
      
      // Parse booking refs into array
      final bookingRefs = _bookingRefController.text.trim().isNotEmpty
          ? [_bookingRefController.text.trim()]
          : <String>[];
      
      // Parse guest count
      int? guestCount;
      if (_guestCountController.text.trim().isNotEmpty) {
        guestCount = int.tryParse(_guestCountController.text.trim());
      }

      await supabase.from('advancing_catering').insert({
        'show_id': widget.showId,
        'provider_name': _providerNameController.text.trim().isEmpty ? null : _providerNameController.text.trim(),
        'address': _addressController.text.trim().isEmpty ? null : _addressController.text.trim(),
        'city': _cityController.text.trim().isEmpty ? null : _cityController.text.trim(),
        'service_at': serviceAt?.toIso8601String(),
        'guest_count': guestCount,
        'booking_refs': bookingRefs.isEmpty ? null : bookingRefs,
        'phone': _phoneController.text.trim().isEmpty ? null : _phoneController.text.trim(),
        'email': _emailController.text.trim().isEmpty ? null : _emailController.text.trim(),
        'notes': _notesController.text.trim().isEmpty ? null : _notesController.text.trim(),
        'source': 'artist',
      });

      if (mounted) {
        widget.onCateringAdded?.call();
      }
    } catch (e) {
      if (mounted) {
        AppToast.error(context, 'Failed to save catering: $e');
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
      title: 'Add Catering',
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
                      label: 'Provider',
                      hint: 'Provider Name',
                      controller: _providerNameController,
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
                    FormDateField(
                      label: 'Date',
                      value: _serviceDate,
                      onChanged: (date) => setState(() => _serviceDate = date),
                    ),
                    FormTimeField(
                      label: 'Time',
                      value: _serviceTime,
                      onChanged: (time) => setState(() => _serviceTime = time),
                    ),
                    FormTextField(
                      label: 'Guests',
                      hint: 'Guest Count',
                      controller: _guestCountController,
                      keyboardType: TextInputType.number,
                    ),
                    FormTextField(
                      label: 'Booking',
                      hint: 'Booking Reference',
                      controller: _bookingRefController,
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
              onPressed: _saveCatering,
              isLoading: _isLoading,
            ),
          ],
        ),
      ),
    );
  }
}
