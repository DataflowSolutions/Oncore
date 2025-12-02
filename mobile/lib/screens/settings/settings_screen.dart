import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart' show UserAttributes;
import '../../providers/auth_provider.dart';
import '../../providers/theme_provider.dart';
import '../../theme/colors.dart';

/// Provider for user profile data
final userProfileProvider = FutureProvider<Map<String, dynamic>?>((ref) async {
  final supabase = ref.watch(supabaseClientProvider);
  final user = supabase.auth.currentUser;
  
  if (user == null) return null;
  
  return {
    'id': user.id,
    'email': user.email,
    'full_name': user.userMetadata?['full_name'],
    'phone': user.userMetadata?['phone'],
  };
});

/// Provider for user organizations
final userOrganizationsProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final supabase = ref.watch(supabaseClientProvider);
  
  final response = await supabase.rpc('get_user_organizations');
  
  if (response == null) return [];
  
  return (response as List<dynamic>).map((e) => e as Map<String, dynamic>).toList();
});

/// Settings Screen - matches web settings page layout
class SettingsScreen extends ConsumerStatefulWidget {
  final String orgId;

  const SettingsScreen({super.key, required this.orgId});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  
  final _currentPasswordController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  
  final _supportController = TextEditingController();
  
  bool _savingProfile = false;
  bool _savingPassword = false;
  bool _emailNotifications = false;

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _currentPasswordController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    _supportController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final userProfile = ref.watch(userProfileProvider);
    final organizations = ref.watch(userOrganizationsProvider);
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    // Initialize controllers with user data
    userProfile.whenData((data) {
      if (data != null && _emailController.text.isEmpty) {
        final fullName = data['full_name'] as String? ?? '';
        final nameParts = fullName.split(' ');
        _firstNameController.text = nameParts.isNotEmpty ? nameParts.first : '';
        _lastNameController.text = nameParts.length > 1 ? nameParts.sublist(1).join(' ') : '';
        _phoneController.text = data['phone'] as String? ?? '';
        _emailController.text = data['email'] as String? ?? '';
      }
    });

    return Scaffold(
      backgroundColor: colorScheme.surface,
      body: SafeArea(
        child: Column(
          children: [
            _buildHeader(),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Account Section
                    _buildSectionTitle('Account', colorScheme),
                    const SizedBox(height: 12),
                    _buildTextField('First Name', _firstNameController, 'Enter your first name', colorScheme),
                    _buildTextField('Last Name', _lastNameController, 'Enter your first name', colorScheme),
                    _buildTextField('Phone Number', _phoneController, 'Enter your number', colorScheme, keyboardType: TextInputType.phone),
                    _buildTextField('Email', _emailController, 'Enter your email address', colorScheme, enabled: false),
                    const SizedBox(height: 8),
                    _buildButton('Save', colorScheme, _savingProfile ? null : _saveProfile),
                    
                    const SizedBox(height: 32),
                    
                    // Password Section
                    _buildSectionTitle('Password', colorScheme),
                    const SizedBox(height: 12),
                    _buildTextField('Current', _currentPasswordController, 'Enter your current password', colorScheme, obscureText: true),
                    _buildTextField('New', _newPasswordController, 'Enter your new password', colorScheme, obscureText: true),
                    _buildTextField('Confirm', _confirmPasswordController, 'Enter your confirm password', colorScheme, obscureText: true),
                    const SizedBox(height: 8),
                    _buildButton('Save', colorScheme, _savingPassword ? null : _savePassword),
                    
                    const SizedBox(height: 32),
                    
                    // Support Section
                    _buildSectionTitleWithIcon('Support', Icons.help_outline, colorScheme),
                    const SizedBox(height: 8),
                    Text(
                      'Email jean@oncore.io or submit a ticket',
                      style: TextStyle(color: colorScheme.onSurfaceVariant, fontSize: 13),
                    ),
                    const SizedBox(height: 12),
                    _buildTextArea(_supportController, 'Write your query here...', colorScheme),
                    const SizedBox(height: 12),
                    _buildButton('Submit', colorScheme, _submitSupport),
                    
                    const SizedBox(height: 32),
                    
                    // Organizations Section
                    _buildSectionTitle('Organizations', colorScheme),
                    const SizedBox(height: 12),
                    organizations.when(
                      loading: () => Center(child: CircularProgressIndicator(color: colorScheme.onSurface)),
                      error: (_, __) => Text('Failed to load organizations', style: TextStyle(color: colorScheme.onSurfaceVariant)),
                      data: (orgs) => _buildOrganizationsList(orgs),
                    ),
                    
                    const SizedBox(height: 32),
                    
                    // Settings Section
                    _buildSectionTitleWithIcon('Settings', Icons.settings_outlined, colorScheme),
                    const SizedBox(height: 16),
                    _buildToggleRow('Email Notification', _emailNotifications, colorScheme, (value) {
                      setState(() => _emailNotifications = value);
                      _showSnackBar('This does nothing at the moment.');
                    }),
                    const SizedBox(height: 16),
                    _buildDarkModeToggle(colorScheme),
                    
                    const SizedBox(height: 48),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
      child: Row(
        children: [
          GestureDetector(
            onTap: () => context.pop(),
            child: Icon(Icons.arrow_back, color: colorScheme.onSurface),
          ),
          const SizedBox(width: 16),
          Text(
            'Settings',
            style: TextStyle(
              color: colorScheme.onSurface,
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title, ColorScheme colorScheme) {
    return Text(
      title,
      style: TextStyle(
        color: colorScheme.onSurface,
        fontSize: 18,
        fontWeight: FontWeight.bold,
      ),
    );
  }

  Widget _buildSectionTitleWithIcon(String title, IconData icon, ColorScheme colorScheme) {
    return Row(
      children: [
        Text(
          title,
          style: TextStyle(
            color: colorScheme.onSurface,
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(width: 8),
        Icon(icon, color: colorScheme.onSurface, size: 20),
      ],
    );
  }

  Widget _buildTextField(
    String label,
    TextEditingController controller,
    String placeholder,
    ColorScheme colorScheme, {
    bool obscureText = false,
    bool enabled = true,
    TextInputType keyboardType = TextInputType.text,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(color: colorScheme.onSurfaceVariant, fontSize: 13),
          ),
          const SizedBox(height: 6),
          TextField(
            controller: controller,
            obscureText: obscureText,
            enabled: enabled,
            keyboardType: keyboardType,
            style: TextStyle(
              color: enabled ? colorScheme.onSurface : colorScheme.onSurfaceVariant,
              fontSize: 15,
            ),
            decoration: InputDecoration(
              hintText: placeholder,
              hintStyle: TextStyle(color: colorScheme.onSurfaceVariant.withValues(alpha: 0.6)),
              filled: true,
              fillColor: colorScheme.surfaceContainerHighest,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide.none,
              ),
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTextArea(TextEditingController controller, String placeholder, ColorScheme colorScheme) {
    return TextField(
      controller: controller,
      maxLines: 4,
      style: TextStyle(color: colorScheme.onSurface, fontSize: 15),
      decoration: InputDecoration(
        hintText: placeholder,
        hintStyle: TextStyle(color: colorScheme.onSurfaceVariant.withValues(alpha: 0.6)),
        filled: true,
        fillColor: colorScheme.surfaceContainerHighest,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide.none,
        ),
        contentPadding: const EdgeInsets.all(16),
      ),
    );
  }

  Widget _buildButton(String label, ColorScheme colorScheme, VoidCallback? onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
        decoration: BoxDecoration(
          color: onTap != null ? colorScheme.onSurface : colorScheme.onSurfaceVariant,
          borderRadius: BorderRadius.circular(24),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: colorScheme.surface,
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }

  Widget _buildOrganizationsList(List<Map<String, dynamic>> orgs) {
    final colorScheme = Theme.of(context).colorScheme;
    return Column(
      children: [
        ...orgs.map((org) {
          final isSelected = org['org_id'] == widget.orgId;
          return Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: GestureDetector(
              onTap: () => _switchOrganization(org),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                decoration: BoxDecoration(
                  color: isSelected ? AppColors.info : colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      org['name'] as String? ?? 'Organization',
                      style: TextStyle(
                        color: isSelected ? Colors.white : colorScheme.onSurface,
                        fontSize: 15,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    if (isSelected)
                      const Text(
                        'Selected',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                        ),
                      ),
                  ],
                ),
              ),
            ),
          );
        }),
        const SizedBox(height: 12),
        Row(
          children: [
            // Delete button (only for owner)
            GestureDetector(
              onTap: () => _showSnackBar('Deleting organization will be coming soon!'),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                decoration: BoxDecoration(
                  color: colorScheme.error,
                  borderRadius: BorderRadius.circular(24),
                ),
                child: const Text(
                  'Delete',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            // Add New button
            GestureDetector(
              onTap: () => _showSnackBar('Creating organization will be coming soon!'),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                decoration: BoxDecoration(
                  color: AppColors.info,
                  borderRadius: BorderRadius.circular(24),
                ),
                child: const Text(
                  'Add New',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildToggleRow(String label, bool value, ColorScheme colorScheme, ValueChanged<bool> onChanged) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            color: colorScheme.onSurface,
            fontSize: 15,
          ),
        ),
        Switch(
          value: value,
          onChanged: onChanged,
          activeThumbColor: AppColors.info,
          activeTrackColor: AppColors.info.withValues(alpha: 0.5),
          inactiveThumbColor: colorScheme.onSurfaceVariant,
          inactiveTrackColor: colorScheme.surfaceContainerHighest,
        ),
      ],
    );
  }

  Widget _buildDarkModeToggle(ColorScheme colorScheme) {
    final themeMode = ref.watch(themeProvider);
    final isDark = themeMode == ThemeMode.dark;
    
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          'Dark Mode',
          style: TextStyle(
            color: colorScheme.onSurface,
            fontSize: 15,
          ),
        ),
        Switch(
          value: isDark,
          onChanged: (value) {
            ref.read(themeProvider.notifier).setThemeMode(
              value ? ThemeMode.dark : ThemeMode.light,
            );
          },
          activeThumbColor: const Color(0xFF3B82F6),
          activeTrackColor: const Color(0xFF3B82F6).withValues(alpha: 0.5),
          inactiveThumbColor: colorScheme.onSurfaceVariant,
          inactiveTrackColor: colorScheme.surfaceContainerHighest,
        ),
      ],
    );
  }

  Future<void> _saveProfile() async {
    setState(() => _savingProfile = true);
    
    try {
      final supabase = ref.read(supabaseClientProvider);
      final fullName = '${_firstNameController.text} ${_lastNameController.text}'.trim();
      
      await supabase.auth.updateUser(
        UserAttributes(
          data: {
            'full_name': fullName,
            'phone': _phoneController.text,
          },
        ),
      );
      
      _showSnackBar('Profile updated successfully!');
    } catch (e) {
      _showSnackBar('Failed to update profile');
    } finally {
      setState(() => _savingProfile = false);
    }
  }

  Future<void> _savePassword() async {
    if (_currentPasswordController.text.isEmpty) {
      _showSnackBar('Current password is required');
      return;
    }
    
    if (_newPasswordController.text != _confirmPasswordController.text) {
      _showSnackBar('Passwords do not match');
      return;
    }
    
    if (_newPasswordController.text.length < 6) {
      _showSnackBar('Password must be at least 6 characters');
      return;
    }
    
    setState(() => _savingPassword = true);
    
    try {
      final supabase = ref.read(supabaseClientProvider);
      final user = supabase.auth.currentUser;
      
      // Verify current password
      final verifyResult = await supabase.auth.signInWithPassword(
        email: user?.email ?? '',
        password: _currentPasswordController.text,
      );
      
      if (verifyResult.user == null) {
        _showSnackBar('Current password is incorrect');
        return;
      }
      
      // Update password
      await supabase.auth.updateUser(
        UserAttributes(password: _newPasswordController.text),
      );
      
      _showSnackBar('Password changed successfully!');
      _currentPasswordController.clear();
      _newPasswordController.clear();
      _confirmPasswordController.clear();
    } catch (e) {
      _showSnackBar('Failed to change password');
    } finally {
      setState(() => _savingPassword = false);
    }
  }

  void _submitSupport() {
    _showSnackBar('Support message sending will be coming soon!');
  }

  Future<void> _switchOrganization(Map<String, dynamic> org) async {
    if (org['org_id'] == widget.orgId) {
      _showSnackBar('You already have this organization selected.');
      return;
    }
    
    // Clear last show when switching orgs
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('oncore_last_show');
    
    if (mounted) {
      context.go('/org/${org['org_id']}/shows');
      _showSnackBar('Switched to organization: ${org['name']}');
    }
  }

  void _showSnackBar(String message) {
    final colorScheme = Theme.of(context).colorScheme;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: colorScheme.surfaceContainerHighest,
      ),
    );
  }
}
