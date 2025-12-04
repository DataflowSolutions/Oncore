import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../components/components.dart';
import '../../../providers/auth_provider.dart';
import 'form_widgets.dart';

/// Layer 3: Add guest form screen
class AddGuestScreen extends ConsumerStatefulWidget {
  final String showId;
  final String orgId;
  final VoidCallback? onGuestAdded;

  const AddGuestScreen({
    super.key,
    required this.showId,
    required this.orgId,
    this.onGuestAdded,
  });

  @override
  ConsumerState<AddGuestScreen> createState() => _AddGuestScreenState();
}

class _AddGuestScreenState extends ConsumerState<AddGuestScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  final _passTypeController = TextEditingController();
  final _notesController = TextEditingController();
  
  int _guestCount = 1;
  bool _isLoading = false;

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _passTypeController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _saveGuest() async {
    if (!_formKey.currentState!.validate()) return;
    
    setState(() => _isLoading = true);

    try {
      final supabase = ref.read(supabaseClientProvider);

      // Use RPC function instead of direct insert
      await supabase.rpc('create_guest', params: {
        'p_show_id': widget.showId,
        'p_name': _nameController.text.trim(),
        'p_phone': _phoneController.text.trim().isEmpty ? null : _phoneController.text.trim(),
        'p_email': _emailController.text.trim().isEmpty ? null : _emailController.text.trim(),
        'p_guest_count': _guestCount,
        'p_pass_type': _passTypeController.text.trim().isEmpty ? null : _passTypeController.text.trim(),
        'p_notes': _notesController.text.trim().isEmpty ? null : _notesController.text.trim(),
      });

      if (mounted) {
        widget.onGuestAdded?.call();
      }
    } catch (e) {
      print('═══════════════════════════════════════');
      print('❌ ERROR saving guest: $e');
      print('═══════════════════════════════════════');
      if (mounted) {
        AppToast.error(context, 'Failed to save guest: $e');
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return LayerScaffold(
      title: 'Add Guest',
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
                      hint: 'Full Name',
                      controller: _nameController,
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'Name is required';
                        }
                        return null;
                      },
                    ),
                    // Guest count
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Row(
                        children: [
                          SizedBox(
                            width: 80,
                            child: Text(
                              'Guests',
                              style: TextStyle(
                                color: colorScheme.onSurfaceVariant,
                                fontSize: 14,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                          Expanded(
                            child: Row(
                              children: [
                                IconButton(
                                  onPressed: _guestCount > 1
                                      ? () => setState(() => _guestCount--)
                                      : null,
                                  icon: Icon(
                                    Icons.remove_circle_outline,
                                    color: _guestCount > 1
                                        ? colorScheme.onSurface
                                        : colorScheme.onSurfaceVariant.withValues(alpha: 0.3),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  '$_guestCount',
                                  style: TextStyle(
                                    color: colorScheme.onSurface,
                                    fontSize: 18,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                IconButton(
                                  onPressed: () => setState(() => _guestCount++),
                                  icon: Icon(
                                    Icons.add_circle_outline,
                                    color: colorScheme.onSurface,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    FormTextField(
                      label: 'Pass Type',
                      hint: 'e.g. VIP, Guest, AAA',
                      controller: _passTypeController,
                    ),
                    FormTextField(
                      label: 'Phone',
                      hint: 'Phone Number',
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
              onPressed: _saveGuest,
              isLoading: _isLoading,
            ),
          ],
        ),
      ),
    );
  }
}
