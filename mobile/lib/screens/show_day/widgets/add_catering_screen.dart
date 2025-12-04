import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
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

      // Use RPC function instead of direct insert
      final response = await supabase.rpc('create_catering', params: {
        'p_show_id': widget.showId,
        'p_provider_name': _providerNameController.text.trim().isEmpty ? null : _providerNameController.text.trim(),
        'p_address': _addressController.text.trim().isEmpty ? null : _addressController.text.trim(),
        'p_city': _cityController.text.trim().isEmpty ? null : _cityController.text.trim(),
        'p_service_at': serviceAt?.toIso8601String(),
        'p_guest_count': guestCount,
        'p_booking_refs': bookingRefs.isEmpty ? null : bookingRefs,
        'p_phone': _phoneController.text.trim().isEmpty ? null : _phoneController.text.trim(),
        'p_email': _emailController.text.trim().isEmpty ? null : _emailController.text.trim(),
        'p_notes': _notesController.text.trim().isEmpty ? null : _notesController.text.trim(),
        'p_source': 'artist',
      });

      // Sync to schedule if service time is set
      if (response != null && serviceAt != null) {
        final cateringId = response['id'] as String?;
        if (cateringId != null) {
          await _syncCateringToSchedule(
            supabase: supabase,
            cateringId: cateringId,
            providerName: _providerNameController.text.trim(),
            city: _cityController.text.trim(),
            serviceAt: serviceAt,
          );
        }
      }

      if (mounted) {
        widget.onCateringAdded?.call();
      }
    } catch (e) {
      print('═══════════════════════════════════════');
      print('❌ ERROR saving catering: $e');
      print('═══════════════════════════════════════');
      if (mounted) {
        AppToast.error(context, 'Failed to save catering: $e');
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _syncCateringToSchedule({
    required SupabaseClient supabase,
    required String cateringId,
    required String providerName,
    required String city,
    required DateTime serviceAt,
  }) async {
    try {
      // Delete any existing schedule items for this catering
      final existingItems = await supabase
          .rpc('get_schedule_items_for_show', params: {'p_show_id': widget.showId});
      
      if (existingItems != null) {
        final List<dynamic> items = existingItems as List<dynamic>;
        for (final item in items) {
          if (item['source'] == 'advancing_catering' && item['source_ref'] == cateringId) {
            await supabase.rpc('delete_schedule_item', params: {
              'p_item_id': item['id'],
            });
          }
        }
      }

      // Create new schedule item
      final location = city.isEmpty ? null : city;

      await supabase.rpc('create_schedule_item', params: {
        'p_org_id': widget.orgId,
        'p_show_id': widget.showId,
        'p_title': 'Catering${providerName.isEmpty ? '' : ' - $providerName'}',
        'p_starts_at': serviceAt.toIso8601String(),
        'p_location': location,
        'p_item_type': 'catering',
        'p_auto_generated': true,
        'p_source': 'advancing_catering',
        'p_source_ref': cateringId,
      });
    } catch (e) {
      print('═══════════════════════════════════════');
      print('⚠️  WARNING: Failed to sync catering to schedule: $e');
      print('═══════════════════════════════════════');
      // Don't throw - schedule sync is optional
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
