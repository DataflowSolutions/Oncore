import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart' show Colors;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_theme.dart';
import 'network_screen.dart';

/// Create person modal - matching desktop AddPersonButton functionality
Future<void> showCreatePersonModal(
  BuildContext context,
  String orgId, {
  VoidCallback? onPersonCreated,
}) {
  return showCupertinoModalPopup<void>(
    context: context,
    builder: (BuildContext context) => _CreatePersonModal(
      orgId: orgId,
      onPersonCreated: onPersonCreated,
    ),
  );
}

class _CreatePersonModal extends ConsumerStatefulWidget {
  final String orgId;
  final VoidCallback? onPersonCreated;

  const _CreatePersonModal({
    required this.orgId,
    this.onPersonCreated,
  });

  @override
  ConsumerState<_CreatePersonModal> createState() => _CreatePersonModalState();
}

class _CreatePersonModalState extends ConsumerState<_CreatePersonModal> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _roleDescriptionController = TextEditingController();
  final _notesController = TextEditingController();

  String _selectedMemberType = 'artist';
  bool _isSubmitting = false;
  String? _errorMessage;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _roleDescriptionController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    try {
      final supabase = ref.read(supabaseClientProvider);

      // Map member types to database enum values
      final memberTypeMap = {
        'artist': 'artist',
        'crew': 'crew',
        'agent': 'management',
        'manager': 'management',
      };

      final dbMemberType = memberTypeMap[_selectedMemberType];

      // Call create_person RPC
      final response = await supabase.rpc('create_person', params: {
        'p_org_id': widget.orgId,
        'p_name': _nameController.text.trim(),
        'p_email': _emailController.text.trim().isEmpty ? null : _emailController.text.trim(),
        'p_phone': _phoneController.text.trim().isEmpty ? null : _phoneController.text.trim(),
        'p_member_type': dbMemberType,
        'p_role_title': _roleDescriptionController.text.trim().isEmpty ? null : _roleDescriptionController.text.trim(),
        'p_notes': _notesController.text.trim().isEmpty ? null : _notesController.text.trim(),
      });

      if (response == null) {
        throw Exception('Failed to create person');
      }

      // Invalidate the team members provider to refresh the list
      ref.invalidate(teamMembersProvider(widget.orgId));

      // Show success and close
      if (mounted) {
        widget.onPersonCreated?.call();
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
        content: const Text('Team member added successfully!'),
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
                    'Add Team Member',
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
                    // Member Type Selection
                    Text(
                      'Member Type',
                      style: TextStyle(
                        color: AppTheme.getForegroundColor(brightness),
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        _buildMemberTypeButton('artist', 'Artist', CupertinoIcons.music_note, brightness),
                        const SizedBox(width: 12),
                        _buildMemberTypeButton('crew', 'Crew', CupertinoIcons.wrench, brightness),
                        const SizedBox(width: 12),
                        _buildMemberTypeButton('agent', 'Agent', CupertinoIcons.briefcase, brightness),
                        const SizedBox(width: 12),
                        _buildMemberTypeButton('manager', 'Manager', CupertinoIcons.person_2, brightness),
                      ],
                    ),
                    const SizedBox(height: 24),

                    // Name Field
                    Text(
                      'Full Name *',
                      style: TextStyle(
                        color: AppTheme.getForegroundColor(brightness),
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 8),
                    CupertinoTextField(
                      controller: _nameController,
                      placeholder: 'Enter full name',
                      style: TextStyle(color: AppTheme.getForegroundColor(brightness)),
                      decoration: BoxDecoration(
                        color: AppTheme.getInputBackgroundColor(brightness),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      padding: const EdgeInsets.all(12),
                    ),
                    const SizedBox(height: 16),

                    // Email Field
                    Text(
                      'Email Address',
                      style: TextStyle(
                        color: AppTheme.getForegroundColor(brightness),
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 8),
                    CupertinoTextField(
                      controller: _emailController,
                      placeholder: 'Enter email address',
                      keyboardType: TextInputType.emailAddress,
                      style: TextStyle(color: AppTheme.getForegroundColor(brightness)),
                      decoration: BoxDecoration(
                        color: AppTheme.getInputBackgroundColor(brightness),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      padding: const EdgeInsets.all(12),
                    ),
                    const SizedBox(height: 16),

                    // Phone Field
                    Text(
                      'Phone Number',
                      style: TextStyle(
                        color: AppTheme.getForegroundColor(brightness),
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 8),
                    CupertinoTextField(
                      controller: _phoneController,
                      placeholder: 'Enter phone number',
                      keyboardType: TextInputType.phone,
                      style: TextStyle(color: AppTheme.getForegroundColor(brightness)),
                      decoration: BoxDecoration(
                        color: AppTheme.getInputBackgroundColor(brightness),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      padding: const EdgeInsets.all(12),
                    ),
                    const SizedBox(height: 16),

                    // Role Description Field
                    Text(
                      _getRoleDescriptionLabel(),
                      style: TextStyle(
                        color: AppTheme.getForegroundColor(brightness),
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 8),
                    CupertinoTextField(
                      controller: _roleDescriptionController,
                      placeholder: _getRoleDescriptionPlaceholder(),
                      style: TextStyle(color: AppTheme.getForegroundColor(brightness)),
                      decoration: BoxDecoration(
                        color: AppTheme.getInputBackgroundColor(brightness),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      padding: const EdgeInsets.all(12),
                    ),
                    const SizedBox(height: 16),

                    // Notes Field
                    Text(
                      'Bio / Notes',
                      style: TextStyle(
                        color: AppTheme.getForegroundColor(brightness),
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 8),
                    CupertinoTextField(
                      controller: _notesController,
                      placeholder: 'Additional information, skills, or notes...',
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

  Widget _buildMemberTypeButton(String type, String label, IconData icon, Brightness brightness) {
    final isSelected = _selectedMemberType == type;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _selectedMemberType = type),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: isSelected ? AppTheme.getPrimaryColor(brightness).withOpacity(0.1) : AppTheme.getInputBackgroundColor(brightness),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: isSelected ? AppTheme.getPrimaryColor(brightness) : Colors.transparent,
              width: 2,
            ),
          ),
          child: Column(
            children: [
              Icon(
                icon,
                size: 24,
                color: isSelected ? AppTheme.getPrimaryColor(brightness) : AppTheme.getMutedForegroundColor(brightness),
              ),
              const SizedBox(height: 4),
              Text(
                label,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                  color: isSelected ? AppTheme.getPrimaryColor(brightness) : AppTheme.getMutedForegroundColor(brightness),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _getRoleDescriptionLabel() {
    switch (_selectedMemberType) {
      case 'artist':
        return 'Role Description';
      case 'crew':
        return 'Specialty';
      case 'agent':
      case 'manager':
        return 'Agency Name';
      default:
        return 'Role';
    }
  }

  String _getRoleDescriptionPlaceholder() {
    switch (_selectedMemberType) {
      case 'artist':
        return 'e.g., Lead Vocalist, Guitarist';
      case 'crew':
        return 'e.g., Sound Engineer, Lighting Technician';
      case 'agent':
      case 'manager':
        return 'e.g., Elite Talent Agency';
      default:
        return 'Enter role';
    }
  }
}
