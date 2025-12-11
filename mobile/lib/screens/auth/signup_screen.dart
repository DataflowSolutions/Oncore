import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_theme.dart';

/// Signup screen - matches the web client's SignUpForm
class SignupScreen extends ConsumerStatefulWidget {
  const SignupScreen({super.key});

  @override
  ConsumerState<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends ConsumerState<SignupScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;
  bool _signupSuccess = false;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleSignUp() async {
    if (!_formKey.currentState!.validate()) return;

    // Clear any previous errors
    ref.read(authProvider.notifier).clearError();

    final success = await ref.read(authProvider.notifier).signUp(
      email: _emailController.text.trim(),
      password: _passwordController.text,
    );

    if (success && mounted) {
      setState(() {
        _signupSuccess = true;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final brightness = CupertinoTheme.brightnessOf(context);

    return CupertinoPageScaffold(
      child: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 400),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Tab switcher (Sign In / Sign Up)
                  Row(
                    children: [
                      Expanded(
                        child: _TabButton(
                          label: 'Sign In',
                          isSelected: false,
                          onTap: () => context.go('/login'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _TabButton(
                          label: 'Sign Up',
                          isSelected: true,
                          onTap: () {},
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 32),

                  // Logo/Brand
                  Text(
                    'oncore',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.getPrimaryColor(brightness),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Title
                  Text(
                    'Create account',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.getForegroundColor(brightness),
                    ),
                  ),
                  const SizedBox(height: 8),

                  // Description
                  Text(
                    'Create your account to streamline your tours',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 15,
                      color: AppTheme.getMutedForegroundColor(brightness),
                    ),
                  ),
                  const SizedBox(height: 32),

                  // Success message
                  if (_signupSuccess) ...[
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: CupertinoColors.systemGreen.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: CupertinoColors.systemGreen.withOpacity(0.3),
                        ),
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            CupertinoIcons.check_mark_circled,
                            color: CupertinoColors.systemGreen,
                            size: 24,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              'Success! Check your email for a confirmation link to complete your registration.',
                              style: TextStyle(
                                color: AppTheme.getForegroundColor(brightness),
                                fontSize: 14,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),
                    CupertinoButton.filled(
                      onPressed: () => context.go('/login'),
                      child: const Text(
                        'Go to Sign In',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ] else ...[
                    // Form
                    Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          // Email field
                          CupertinoTextField(
                            controller: _emailController,
                            keyboardType: TextInputType.emailAddress,
                            enabled: !authState.isLoading,
                            placeholder: 'Email',
                            prefix: const Padding(
                              padding: EdgeInsets.only(left: 12),
                              child: Icon(CupertinoIcons.mail, size: 20),
                            ),
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 16,
                            ),
                            decoration: BoxDecoration(
                              color: AppTheme.getCardColor(brightness),
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                          const SizedBox(height: 16),

                          // Password field
                          CupertinoTextField(
                            controller: _passwordController,
                            obscureText: _obscurePassword,
                            enabled: !authState.isLoading,
                            placeholder: 'Password',
                            prefix: const Padding(
                              padding: EdgeInsets.only(left: 12),
                              child: Icon(CupertinoIcons.lock, size: 20),
                            ),
                            suffix: CupertinoButton(
                              padding: EdgeInsets.zero,
                              minSize: 0,
                              child: Icon(
                                _obscurePassword
                                    ? CupertinoIcons.eye
                                    : CupertinoIcons.eye_slash,
                                size: 20,
                              ),
                              onPressed: () {
                                setState(() {
                                  _obscurePassword = !_obscurePassword;
                                });
                              },
                            ),
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 16,
                            ),
                            decoration: BoxDecoration(
                              color: AppTheme.getCardColor(brightness),
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Must be at least 6 characters',
                            style: TextStyle(
                              fontSize: 13,
                              color: AppTheme.getMutedForegroundColor(brightness),
                            ),
                          ),
                          const SizedBox(height: 24),

                          // Error message
                          if (authState.error != null) ...[
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: CupertinoColors.destructiveRed.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                  color: CupertinoColors.destructiveRed.withOpacity(0.3),
                                ),
                              ),
                              child: Row(
                                children: [
                                  const Icon(
                                    CupertinoIcons.exclamationmark_circle,
                                    color: CupertinoColors.destructiveRed,
                                    size: 20,
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Text(
                                      authState.error!,
                                      style: TextStyle(
                                        color: AppTheme.getForegroundColor(brightness),
                                        fontSize: 14,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 16),
                          ],

                          // Sign Up button
                          CupertinoButton.filled(
                            onPressed: authState.isLoading ? null : _handleSignUp,
                            child: authState.isLoading
                                ? const SizedBox(
                                    height: 20,
                                    width: 20,
                                    child: CupertinoActivityIndicator(
                                      color: CupertinoColors.white,
                                    ),
                                  )
                                : const Text(
                                    'Sign Up',
                                    style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                          ),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 24),

                  // Switch to login
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        'Already have an account? ',
                        style: TextStyle(
                          color: AppTheme.getMutedForegroundColor(brightness),
                        ),
                      ),
                      GestureDetector(
                        onTap: () => context.go('/login'),
                        child: Text(
                          'Sign in',
                          style: TextStyle(
                            color: AppTheme.getPrimaryColor(brightness),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Tab button widget for switching between Sign In / Sign Up
class _TabButton extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _TabButton({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final brightness = CupertinoTheme.brightnessOf(context);
    final isDark = brightness == Brightness.dark;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: isSelected 
            ? (isDark ? AppTheme.darkAuthTabSelectedBg : AppTheme.lightAuthTabSelectedBg)
            : (isDark ? AppTheme.darkAuthTabBg : AppTheme.lightAuthTabBg),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(
          label,
          textAlign: TextAlign.center,
          style: TextStyle(
            color: isSelected
              ? (isDark ? AppTheme.darkAuthTabSelectedText : AppTheme.lightAuthTabSelectedText)
              : (isDark ? AppTheme.darkAuthTabText : AppTheme.lightAuthTabText),
            fontWeight: FontWeight.w500,
          ),
        ),
      ),
    );
  }
}
