import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../components/components.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_theme.dart';
import 'network_screen.dart';

/// Edit promoter screen - prefilled with existing data
class EditPromoterScreen extends ConsumerStatefulWidget {
  final String orgId;
  final Promoter promoter;
  final VoidCallback? onPromoterUpdated;

  const EditPromoterScreen({
    super.key,
    required this.orgId,
    required this.promoter,
    this.onPromoterUpdated,
  });

  @override
  ConsumerState<EditPromoterScreen> createState() => _EditPromoterScreenState();
}

class _EditPromoterScreenState extends ConsumerState<EditPromoterScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameController;
  late final TextEditingController _companyController;
  late final TextEditingController _emailController;
  late final TextEditingController _phoneController;
  late final TextEditingController _cityController;
  late final TextEditingController _countryController;
  late final TextEditingController _notesController;
  
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    // Initialize controllers with existing data
    _nameController = TextEditingController(text: widget.promoter.name);
    _companyController = TextEditingController(text: widget.promoter.company ?? '');
    _emailController = TextEditingController(text: widget.promoter.email ?? '');
    _phoneController = TextEditingController(text: widget.promoter.phone ?? '');
    _cityController = TextEditingController(text: widget.promoter.city ?? '');
    _countryController = TextEditingController(text: widget.promoter.country ?? '');
    _notesController = TextEditingController(text: widget.promoter.notes ?? '');
  }

  @override
  void dispose() {
    _nameController.dispose();
    _companyController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _cityController.dispose();
    _countryController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _savePromoter() async {
    if (!_formKey.currentState!.validate()) return;
    
    setState(() => _isLoading = true);

    try {
      final supabase = ref.read(supabaseClientProvider);

      // Use RPC function to update (promoters are contacts with contact_type = 'promoter')
      await supabase.rpc('update_contact', params: {
        'p_contact_id': widget.promoter.id,
        'p_name': _nameController.text.trim(),
        'p_company': _companyController.text.trim().isEmpty ? null : _companyController.text.trim(),
        'p_email': _emailController.text.trim().isEmpty ? null : _emailController.text.trim(),
        'p_phone': _phoneController.text.trim().isEmpty ? null : _phoneController.text.trim(),
        'p_city': _cityController.text.trim().isEmpty ? null : _cityController.text.trim(),
        'p_country': _countryController.text.trim().isEmpty ? null : _countryController.text.trim(),
        'p_notes': _notesController.text.trim().isEmpty ? null : _notesController.text.trim(),
      });

      if (mounted) {
        widget.onPromoterUpdated?.call();
      }
    } catch (e) {
      if (mounted) {
        AppToast.error(context, 'Failed to update promoter: $e');
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
      title: 'Edit Promoter',
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
                      hint: 'Full name',
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
                      label: 'Company',
                      hint: 'Company name',
                      controller: _companyController,
                      brightness: brightness,
                    ),
                    _buildTextField(
                      label: 'Email',
                      hint: 'Email address',
                      controller: _emailController,
                      brightness: brightness,
                      keyboardType: TextInputType.emailAddress,
                    ),
                    _buildTextField(
                      label: 'Phone',
                      hint: 'Phone number',
                      controller: _phoneController,
                      brightness: brightness,
                      keyboardType: TextInputType.phone,
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
                  onPressed: _isLoading ? null : _savePromoter,
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
