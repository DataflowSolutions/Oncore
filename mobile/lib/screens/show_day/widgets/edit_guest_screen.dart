import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../components/components.dart';
import '../../../providers/auth_provider.dart';
import '../../../models/show_day.dart';
import '../../../theme/app_theme.dart';
import 'form_widgets.dart';

/// Layer 3: Edit guest form screen - prefilled with existing data
class EditGuestScreen extends ConsumerStatefulWidget {
  final String showId;
  final String orgId;
  final GuestInfo guest;
  final VoidCallback? onGuestUpdated;

  const EditGuestScreen({
    super.key,
    required this.showId,
    required this.orgId,
    required this.guest,
    this.onGuestUpdated,
  });

  @override
  ConsumerState<EditGuestScreen> createState() => _EditGuestScreenState();
}

class _EditGuestScreenState extends ConsumerState<EditGuestScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameController;
  late final TextEditingController _phoneController;
  late final TextEditingController _emailController;
  late final TextEditingController _passTypeController;
  late final TextEditingController _notesController;
  
  late int _guestCount;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    // Initialize controllers with existing data
    _nameController = TextEditingController(text: widget.guest.name);
    _phoneController = TextEditingController(text: widget.guest.phone ?? '');
    _emailController = TextEditingController(text: widget.guest.email ?? '');
    _passTypeController = TextEditingController(text: widget.guest.passType ?? '');
    _notesController = TextEditingController(text: widget.guest.notes ?? '');
    _guestCount = widget.guest.guestCount;
  }

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

      // Use RPC function to update
      await supabase.rpc('update_guest', params: {
        'p_guest_id': widget.guest.id,
        'p_name': _nameController.text.trim(),
        'p_phone': _phoneController.text.trim().isEmpty ? null : _phoneController.text.trim(),
        'p_email': _emailController.text.trim().isEmpty ? null : _emailController.text.trim(),
        'p_guest_count': _guestCount,
        'p_pass_type': _passTypeController.text.trim().isEmpty ? null : _passTypeController.text.trim(),
        'p_notes': _notesController.text.trim().isEmpty ? null : _notesController.text.trim(),
      });

      if (mounted) {
        widget.onGuestUpdated?.call();
      }
    } catch (e) {
      if (mounted) {
        AppToast.error(context, 'Failed to update guest: $e');
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
      title: 'Edit Guest',
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
                                color: AppTheme.getMutedForegroundColor(brightness),
                                fontSize: 14,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                          Expanded(
                            child: Row(
                              children: [
                                CupertinoButton(
                                  onPressed: _guestCount > 1
                                      ? () => setState(() => _guestCount--)
                                      : null,
                                  child: Icon(
                                    CupertinoIcons.minus_circle,
                                    color: _guestCount > 1
                                        ? AppTheme.getForegroundColor(brightness)
                                        : AppTheme.getMutedForegroundColor(brightness).withValues(alpha: 0.3),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  '$_guestCount',
                                  style: TextStyle(
                                    color: AppTheme.getForegroundColor(brightness),
                                    fontSize: 18,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                CupertinoButton(
                                  onPressed: () => setState(() => _guestCount++),
                                  child: Icon(
                                    CupertinoIcons.plus_circle,
                                    color: AppTheme.getForegroundColor(brightness),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    FormCupertinoTextField(
                      label: 'Pass Type',
                      hint: 'Pass Type (e.g., VIP, Guest)',
                      controller: _passTypeController,
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
              onPressed: _saveGuest,
              isLoading: _isLoading,
            ),
          ],
        ),
      ),
    );
  }
}
