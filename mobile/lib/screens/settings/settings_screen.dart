import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart' show UserAttributes;
import '../../components/components.dart';
import '../../providers/auth_provider.dart';
import '../../providers/theme_provider.dart';
import '../../theme/colors.dart';
import '../../theme/app_theme.dart';

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
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;

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

    return LayerScaffold(
      title: 'Settings',
      body: SafeArea(
        top: false, // LayerScaffold handles the top safe area
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
                    // Account Section
                    _buildSectionTitle('Account', brightness),
                    const SizedBox(height: 12),
                    _buildCupertinoTextField('First Name', _firstNameController, 'Enter your first name', brightness),
                    _buildCupertinoTextField('Last Name', _lastNameController, 'Enter your first name', brightness),
                    _buildCupertinoTextField('Phone Number', _phoneController, 'Enter your number', brightness, keyboardType: TextInputType.phone),
                    _buildCupertinoTextField('Email', _emailController, 'Enter your email address', brightness, enabled: false),
                    const SizedBox(height: 8),
                    _buildButton('Save', brightness, _savingProfile ? null : _saveProfile),
                    
                    const SizedBox(height: 32),
                    
                    // Password Section
                    _buildSectionTitle('Password', brightness),
                    const SizedBox(height: 12),
                    _buildCupertinoTextField('Current', _currentPasswordController, 'Enter your current password', brightness, obscureText: true),
                    _buildCupertinoTextField('New', _newPasswordController, 'Enter your new password', brightness, obscureText: true),
                    _buildCupertinoTextField('Confirm', _confirmPasswordController, 'Enter your confirm password', brightness, obscureText: true),
                    const SizedBox(height: 8),
                    _buildButton('Save', brightness, _savingPassword ? null : _savePassword),
                    
                    const SizedBox(height: 32),
                    
                    // Support Section
                    _buildSectionTitleWithIcon('Support', CupertinoIcons.question_circle, brightness),
                    const SizedBox(height: 8),
                    Text(
                      'Email jean@oncore.io or submit a ticket',
                      style: TextStyle(color: AppTheme.getMutedForegroundColor(brightness), fontSize: 13),
                    ),
                    const SizedBox(height: 12),
                    _buildTextArea(_supportController, 'Write your query here...', brightness),
                    const SizedBox(height: 12),
                    _buildButton('Submit', brightness, _submitSupport),
                    
                    const SizedBox(height: 32),
                    
                    // Organizations Section
                    _buildSectionTitle('Organizations', brightness),
                    const SizedBox(height: 12),
                    organizations.when(
                      loading: () => Center(child: CupertinoActivityIndicator(color: AppTheme.getForegroundColor(brightness))),
                      error: (_, __) => Text('Failed to load organizations', style: TextStyle(color: AppTheme.getMutedForegroundColor(brightness))),
                      data: (orgs) => _buildOrganizationsList(orgs),
                    ),
                    
                    const SizedBox(height: 32),
                    
                    // Settings Section
                    _buildSectionTitleWithIcon('Settings', CupertinoIcons.gear, brightness),
                    const SizedBox(height: 16),
                    _buildToggleRow('Email Notification', _emailNotifications, brightness, (value) {
                      setState(() => _emailNotifications = value);
                      _showSnackBar('This does nothing at the moment.');
                    }),
                    const SizedBox(height: 16),
                    _buildDarkModeToggle(brightness),
                    
                    const SizedBox(height: 48),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildSectionTitle(String title, Brightness brightness) {
    return Text(
      title,
      style: TextStyle(
        color: AppTheme.getForegroundColor(brightness),
        fontSize: 18,
        fontWeight: FontWeight.bold,
      ),
    );
  }

  Widget _buildSectionTitleWithIcon(String title, IconData icon, Brightness brightness) {
    return Row(
      children: [
        Text(
          title,
          style: TextStyle(
            color: AppTheme.getForegroundColor(brightness),
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(width: 8),
        Icon(icon, color: AppTheme.getForegroundColor(brightness), size: 20),
      ],
    );
  }

  Widget _buildCupertinoTextField(
    String label,
    TextEditingController controller,
    String placeholder,
    Brightness brightness, {
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
            style: TextStyle(color: AppTheme.getMutedForegroundColor(brightness), fontSize: 13),
          ),
          const SizedBox(height: 6),
          CupertinoTextField(
            controller: controller,
            obscureText: obscureText,
            enabled: enabled,
            keyboardType: keyboardType,
            style: TextStyle(
              color: enabled ? AppTheme.getForegroundColor(brightness) : AppTheme.getMutedForegroundColor(brightness),
              fontSize: 15,
            ),
            decoration: BoxDecoration(
              color: AppTheme.getInputBackgroundColor(brightness),
              borderRadius: BorderRadius.circular(8),
            ),
            placeholder: placeholder,
            placeholderStyle: TextStyle(color: AppTheme.getMutedForegroundColor(brightness).withValues(alpha: 0.6)),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          ),
        ],
      ),
    );
  }

  Widget _buildTextArea(TextEditingController controller, String placeholder, Brightness brightness) {
    return CupertinoTextField(
      controller: controller,
      maxLines: 4,
      style: TextStyle(color: AppTheme.getForegroundColor(brightness), fontSize: 15),
      decoration: BoxDecoration(
        color: AppTheme.getInputBackgroundColor(brightness),
        borderRadius: BorderRadius.circular(8),
      ),
      placeholder: placeholder,
      placeholderStyle: TextStyle(color: AppTheme.getMutedForegroundColor(brightness).withValues(alpha: 0.6)),
      padding: const EdgeInsets.all(16),
    );
  }

  Widget _buildButton(String label, Brightness brightness, VoidCallback? onTap) {
    return SizedBox(
      width: double.infinity,
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          decoration: BoxDecoration(
            color: onTap != null ? AppTheme.getForegroundColor(brightness) : AppTheme.getMutedForegroundColor(brightness),
            borderRadius: BorderRadius.circular(24),
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: AppTheme.getBackgroundColor(brightness),
              fontSize: 14,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildOrganizationsList(List<Map<String, dynamic>> orgs) {
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;
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
                  color: isSelected ? AppColors.info : AppTheme.getInputBackgroundColor(brightness),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      org['name'] as String? ?? 'Organization',
                      style: TextStyle(
                        color: isSelected ? CupertinoColors.white : AppTheme.getForegroundColor(brightness),
                        fontSize: 15,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    if (isSelected)
                      const Text(
                        'Selected',
                        style: TextStyle(
                          color: CupertinoColors.white,
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
                  color: AppTheme.getDestructiveColor(brightness),
                  borderRadius: BorderRadius.circular(24),
                ),
                child: const Text(
                  'Delete',
                  style: TextStyle(
                    color: CupertinoColors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            // Add New button
            GestureDetector(
              onTap: () => context.push('/create-org'),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                decoration: BoxDecoration(
                  color: AppTheme.getPrimaryColor(brightness),
                  borderRadius: BorderRadius.circular(24),
                ),
                child: const Text(
                  'Add New',
                  style: TextStyle(
                    color: CupertinoColors.white,
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

  Widget _buildToggleRow(String label, bool value, Brightness brightness, ValueChanged<bool> onChanged) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            color: AppTheme.getForegroundColor(brightness),
            fontSize: 15,
          ),
        ),
        CupertinoSwitch(
          value: value,
          onChanged: onChanged,
          activeColor: AppColors.info,
          trackColor: AppTheme.getInputBackgroundColor(brightness),
        ),
      ],
    );
  }

  Widget _buildDarkModeToggle(Brightness brightness) {
    final currentBrightness = ref.watch(brightnessProvider);
    final isDark = currentBrightness == Brightness.dark;
    
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          'Dark Mode',
          style: TextStyle(
            color: AppTheme.getForegroundColor(brightness),
            fontSize: 15,
          ),
        ),
        CupertinoSwitch(
          value: isDark,
          onChanged: (value) {
            ref.read(brightnessProvider.notifier).setBrightness(
              value ? Brightness.dark : Brightness.light,
            );
          },
          activeColor: const Color(0xFF3B82F6),
          trackColor: AppTheme.getInputBackgroundColor(brightness),
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
      
      _showSnackBar('Profile updated successfully!', isSuccess: true);
    } catch (e) {
      _showSnackBar('Failed to update profile', isError: true);
    } finally {
      setState(() => _savingProfile = false);
    }
  }

  Future<void> _savePassword() async {
    if (_currentPasswordController.text.isEmpty) {
      _showSnackBar('Current password is required', isError: true);
      return;
    }
    
    if (_newPasswordController.text != _confirmPasswordController.text) {
      _showSnackBar('Passwords do not match', isError: true);
      return;
    }
    
    if (_newPasswordController.text.length < 6) {
      _showSnackBar('Password must be at least 6 characters', isError: true);
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
        _showSnackBar('Current password is incorrect', isError: true);
        return;
      }
      
      // Update password
      await supabase.auth.updateUser(
        UserAttributes(password: _newPasswordController.text),
      );
      
      _showSnackBar('Password changed successfully!', isSuccess: true);
      _currentPasswordController.clear();
      _newPasswordController.clear();
      _confirmPasswordController.clear();
    } catch (e) {
      _showSnackBar('Failed to change password', isError: true);
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
      _showSnackBar('Switched to organization: ${org['name']}', isSuccess: true);
    }
  }

  void _showSnackBar(String message, {bool isError = false, bool isSuccess = false}) {
    if (isError) {
      AppToast.error(context, message);
    } else if (isSuccess) {
      AppToast.success(context, message);
    } else {
      AppToast.info(context, message);
    }
  }
}
