import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../components/components.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_theme.dart';
import 'network_screen.dart';

/// Edit venue screen - prefilled with existing data
class EditVenueScreen extends ConsumerStatefulWidget {
  final String orgId;
  final Venue venue;
  final VoidCallback? onVenueUpdated;

  const EditVenueScreen({
    super.key,
    required this.orgId,
    required this.venue,
    this.onVenueUpdated,
  });

  @override
  ConsumerState<EditVenueScreen> createState() => _EditVenueScreenState();
}

class _EditVenueScreenState extends ConsumerState<EditVenueScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameController;
  late final TextEditingController _addressController;
  late final TextEditingController _cityController;
  late final TextEditingController _countryController;
  late final TextEditingController _capacityController;
  late final TextEditingController _notesController;
  
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    // Initialize controllers with existing data
    _nameController = TextEditingController(text: widget.venue.name);
    _addressController = TextEditingController(text: widget.venue.address ?? '');
    _cityController = TextEditingController(text: widget.venue.city ?? '');
    _countryController = TextEditingController(text: widget.venue.country ?? '');
    _capacityController = TextEditingController(
      text: widget.venue.capacity?.toString() ?? '',
    );
    _notesController = TextEditingController(text: widget.venue.notes ?? '');
  }

  @override
  void dispose() {
    _nameController.dispose();
    _addressController.dispose();
    _cityController.dispose();
    _countryController.dispose();
    _capacityController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _saveVenue() async {
    if (!_formKey.currentState!.validate()) return;
    
    setState(() => _isLoading = true);

    try {
      final supabase = ref.read(supabaseClientProvider);

      // Parse capacity
      int? capacity;
      if (_capacityController.text.trim().isNotEmpty) {
        capacity = int.tryParse(_capacityController.text.trim());
      }

      // Use RPC function to update
      await supabase.rpc('update_venue', params: {
        'p_venue_id': widget.venue.id,
        'p_name': _nameController.text.trim(),
        'p_address': _addressController.text.trim().isEmpty ? null : _addressController.text.trim(),
        'p_city': _cityController.text.trim().isEmpty ? null : _cityController.text.trim(),
        'p_country': _countryController.text.trim().isEmpty ? null : _countryController.text.trim(),
        'p_capacity': capacity,
        'p_notes': _notesController.text.trim().isEmpty ? null : _notesController.text.trim(),
      });

      if (mounted) {
        widget.onVenueUpdated?.call();
      }
    } catch (e) {
      if (mounted) {
        AppToast.error(context, 'Failed to update venue: $e');
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;

    return LayerScaffold(
      title: 'Edit Venue',
      body: Form(
        key: _formKey,
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: Column(
                  children: [
                    _buildTextField(
                      label: 'Name',
                      hint: 'Venue name',
                      controller: _nameController,
                      brightness: brightness,
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'Name is required';
                        }
                        return null;
                      },
                    ),
                    _buildTextField(
                      label: 'Address',
                      hint: 'Street address',
                      controller: _addressController,
                      brightness: brightness,
                    ),
                    _buildTextField(
                      label: 'City',
                      hint: 'City',
                      controller: _cityController,
                      brightness: brightness,
                    ),
                    _buildTextField(
                      label: 'Country',
                      hint: 'Country',
                      controller: _countryController,
                      brightness: brightness,
                    ),
                    _buildTextField(
                      label: 'Capacity',
                      hint: 'Venue capacity',
                      controller: _capacityController,
                      brightness: brightness,
                      keyboardType: TextInputType.number,
                    ),
                    _buildTextField(
                      label: 'Notes',
                      hint: 'Additional notes',
                      controller: _notesController,
                      brightness: brightness,
                      maxLines: 3,
                    ),
                  ],
                ),
              ),
            ),
            // Submit button
            Padding(
              padding: const EdgeInsets.all(24),
              child: SizedBox(
                width: double.infinity,
                child: CupertinoButton.filled(
                  onPressed: _isLoading ? null : _saveVenue,
                  child: _isLoading
                      ? const CupertinoActivityIndicator(color: CupertinoColors.white)
                      : const Text('Save'),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTextField({
    required String label,
    required String hint,
    required TextEditingController controller,
    required Brightness brightness,
    String? Function(String?)? validator,
    TextInputType? keyboardType,
    int maxLines = 1,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              color: AppTheme.getMutedForegroundColor(brightness),
              fontSize: 14,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 8),
          CupertinoTextFormFieldRow(
            controller: controller,
            placeholder: hint,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: AppTheme.getInputBackgroundColor(brightness),
              borderRadius: BorderRadius.circular(8),
            ),
            style: TextStyle(color: AppTheme.getForegroundColor(brightness)),
            placeholderStyle: TextStyle(color: AppTheme.getMutedForegroundColor(brightness)),
            validator: validator,
            keyboardType: keyboardType,
            maxLines: maxLines,
          ),
        ],
      ),
    );
  }
}
