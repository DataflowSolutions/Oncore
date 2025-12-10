import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_theme.dart';
import 'network_screen.dart';

/// Create venue modal - matching desktop AddVenueModal functionality
Future<void> showCreateVenueModal(
  BuildContext context,
  String orgId, {
  VoidCallback? onVenueCreated,
}) {
  return showCupertinoModalPopup<void>(
    context: context,
    builder: (BuildContext context) => _CreateVenueModal(
      orgId: orgId,
      onVenueCreated: onVenueCreated,
    ),
  );
}

class _CreateVenueModal extends ConsumerStatefulWidget {
  final String orgId;
  final VoidCallback? onVenueCreated;

  const _CreateVenueModal({
    required this.orgId,
    this.onVenueCreated,
  });

  @override
  ConsumerState<_CreateVenueModal> createState() => _CreateVenueModalState();
}

class _CreateVenueModalState extends ConsumerState<_CreateVenueModal> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _addressController = TextEditingController();
  final _cityController = TextEditingController();
  final _countryController = TextEditingController();
  final _capacityController = TextEditingController();
  final _notesController = TextEditingController();

  bool _isSubmitting = false;
  String? _errorMessage;

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

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    if (_nameController.text.trim().isEmpty) {
      setState(() => _errorMessage = 'Name is required');
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    try {
      final supabase = ref.read(supabaseClientProvider);

      // Parse capacity as integer
      int? capacity;
      if (_capacityController.text.trim().isNotEmpty) {
        capacity = int.tryParse(_capacityController.text.trim());
        if (capacity == null) {
          throw Exception('Capacity must be a valid number');
        }
      }

      // Call create_venue RPC
      final response = await supabase.rpc('create_venue', params: {
        'p_org_id': widget.orgId,
        'p_name': _nameController.text.trim(),
        'p_address': _addressController.text.trim().isEmpty ? null : _addressController.text.trim(),
        'p_city': _cityController.text.trim().isEmpty ? null : _cityController.text.trim(),
        'p_country': _countryController.text.trim().isEmpty ? null : _countryController.text.trim(),
        'p_capacity': capacity,
        'p_notes': _notesController.text.trim().isEmpty ? null : _notesController.text.trim(),
      });

      if (response == null) {
        throw Exception('Failed to create venue');
      }

      // Invalidate the venues provider to refresh the list
      ref.invalidate(venuesProvider(widget.orgId));

      // Show success and close
      if (mounted) {
        widget.onVenueCreated?.call();
        Navigator.of(context).pop();
        _showSuccessDialog();
      }
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
        _isSubmitting = false;
      });
    }
  }

  void _showSuccessDialog() {
    showCupertinoDialog(
      context: context,
      builder: (context) => CupertinoAlertDialog(
        title: const Text('Success'),
        content: const Text('Venue added successfully!'),
        actions: [
          CupertinoDialogAction(
            child: const Text('OK'),
            onPressed: () => Navigator.pop(context),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;

    return Container(
      height: MediaQuery.of(context).size.height * 0.9,
      decoration: BoxDecoration(
        color: AppTheme.getBackgroundColor(brightness),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
      ),
      child: SafeArea(
        child: Column(
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  CupertinoButton(
                    padding: EdgeInsets.zero,
                    onPressed: () => Navigator.of(context).pop(),
                    child: Text(
                      'Cancel',
                      style: TextStyle(color: AppTheme.getForegroundColor(brightness)),
                    ),
                  ),
                  Text(
                    'Add Venue',
                    style: TextStyle(
                      color: AppTheme.getForegroundColor(brightness),
                      fontSize: 17,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  CupertinoButton(
                    padding: EdgeInsets.zero,
                    onPressed: _isSubmitting ? null : _handleSubmit,
                    child: _isSubmitting
                        ? const CupertinoActivityIndicator()
                        : Text(
                            'Add',
                            style: TextStyle(
                              color: AppTheme.getPrimaryColor(brightness),
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                  ),
                ],
              ),
            ),

            // Error message
            if (_errorMessage != null)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: CupertinoColors.systemRed.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      const Icon(CupertinoIcons.exclamationmark_circle, color: CupertinoColors.systemRed, size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _errorMessage!,
                          style: const TextStyle(color: CupertinoColors.systemRed, fontSize: 14),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

            // Form
            Expanded(
              child: Form(
                key: _formKey,
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    // Name Field
                    _buildTextField(
                      controller: _nameController,
                      label: 'Venue Name *',
                      placeholder: 'e.g., Madison Square Garden',
                      brightness: brightness,
                    ),
                    const SizedBox(height: 16),

                    // Address Field
                    _buildTextField(
                      controller: _addressController,
                      label: 'Address',
                      placeholder: '4 Pennsylvania Plaza',
                      brightness: brightness,
                    ),
                    const SizedBox(height: 16),

                    // City Field
                    _buildTextField(
                      controller: _cityController,
                      label: 'City',
                      placeholder: 'New York',
                      brightness: brightness,
                    ),
                    const SizedBox(height: 16),

                    // Country Field
                    _buildTextField(
                      controller: _countryController,
                      label: 'Country',
                      placeholder: 'United States',
                      brightness: brightness,
                    ),
                    const SizedBox(height: 16),

                    // Capacity Field
                    _buildTextField(
                      controller: _capacityController,
                      label: 'Capacity',
                      placeholder: '20000',
                      keyboardType: TextInputType.number,
                      brightness: brightness,
                    ),
                    const SizedBox(height: 16),

                    // Notes Field
                    Text(
                      'Notes',
                      style: TextStyle(
                        color: AppTheme.getForegroundColor(brightness),
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 8),
                    CupertinoTextField(
                      controller: _notesController,
                      placeholder: 'Additional information about this venue...',
                      maxLines: 4,
                      style: TextStyle(color: AppTheme.getForegroundColor(brightness)),
                      decoration: BoxDecoration(
                        color: AppTheme.getInputBackgroundColor(brightness),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      padding: const EdgeInsets.all(12),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required String placeholder,
    required Brightness brightness,
    TextInputType? keyboardType,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            color: AppTheme.getForegroundColor(brightness),
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 8),
        CupertinoTextField(
          controller: controller,
          placeholder: placeholder,
          keyboardType: keyboardType,
          style: TextStyle(color: AppTheme.getForegroundColor(brightness)),
          decoration: BoxDecoration(
            color: AppTheme.getInputBackgroundColor(brightness),
            borderRadius: BorderRadius.circular(8),
          ),
          padding: const EdgeInsets.all(12),
        ),
      ],
    );
  }
}
