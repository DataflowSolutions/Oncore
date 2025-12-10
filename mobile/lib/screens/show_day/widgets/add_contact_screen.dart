import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../components/components.dart';
import '../../../providers/auth_provider.dart';
import '../../../theme/app_theme.dart';
import 'form_widgets.dart';

/// Layer 3: Add contact form screen
class AddContactScreen extends ConsumerStatefulWidget {
  final String showId;
  final String orgId;
  final VoidCallback? onContactAdded;

  const AddContactScreen({
    super.key,
    required this.showId,
    required this.orgId,
    this.onContactAdded,
  });

  @override
  ConsumerState<AddContactScreen> createState() => _AddContactScreenState();
}

class _AddContactScreenState extends ConsumerState<AddContactScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _roleController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  final _notesController = TextEditingController();
  bool _isPromoter = false;
  bool _isLoading = false;

  @override
  void dispose() {
    _nameController.dispose();
    _roleController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _saveContact() async {
    if (!_formKey.currentState!.validate()) return;
    
    setState(() => _isLoading = true);

    try {
      final supabase = ref.read(supabaseClientProvider);
      
      // Use RPC to save contact
      await supabase.rpc('save_show_contact', params: {
        'p_show_id': widget.showId,
        'p_name': _nameController.text.trim(),
        'p_role': _roleController.text.trim().isEmpty ? null : _roleController.text.trim(),
        'p_phone': _phoneController.text.trim().isEmpty ? null : _phoneController.text.trim(),
        'p_email': _emailController.text.trim().isEmpty ? null : _emailController.text.trim(),
        'p_is_promoter': _isPromoter,
        'p_notes': _notesController.text.trim().isEmpty ? null : _notesController.text.trim(),
      });

      if (mounted) {
        widget.onContactAdded?.call();
      }
    } catch (e) {
      if (mounted) {
        AppToast.error(context, 'Failed to save contact: $e');
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
      title: 'Add Contact',
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
                      label: 'Role',
                      hint: 'Role',
                      controller: _roleController,
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
                    const SizedBox(height: 16),
                    // Is Promoter toggle
                    Row(
                      children: [
                        SizedBox(
                          width: 80,
                          child: Text(
                            'Promoter',
                            style: TextStyle(
                              color: AppTheme.getMutedForegroundColor(brightness),
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                        CupertinoSwitch(
                          value: _isPromoter,
                          onChanged: (value) => setState(() => _isPromoter = value),
                          activeColor: AppTheme.getPrimaryColor(brightness),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            FormSubmitButton(
              label: 'Save',
              onPressed: _saveContact,
              isLoading: _isLoading,
            ),
          ],
        ),
      ),
    );
  }
}
