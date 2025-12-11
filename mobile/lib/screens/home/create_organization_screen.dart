import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../components/components.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_theme.dart';
import '../home/home_screen.dart';

/// Screen for creating a new organization
class CreateOrganizationScreen extends ConsumerStatefulWidget {
  const CreateOrganizationScreen({super.key});

  @override
  ConsumerState<CreateOrganizationScreen> createState() => _CreateOrganizationScreenState();
}

class _CreateOrganizationScreenState extends ConsumerState<CreateOrganizationScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _slugController = TextEditingController();
  
  bool _isSubmitting = false;
  bool _isCheckingSlug = false;
  bool? _slugAvailable;
  String? _slugError;

  @override
  void initState() {
    super.initState();
    _nameController.addListener(_onNameChanged);
  }

  @override
  void dispose() {
    _nameController.removeListener(_onNameChanged);
    _nameController.dispose();
    _slugController.dispose();
    super.dispose();
  }

  void _onNameChanged() {
    // Auto-generate slug from name
    final name = _nameController.text;
    final slug = _generateSlug(name);
    _slugController.text = slug;
    _checkSlugAvailability(slug);
  }

  String _generateSlug(String name) {
    return name
        .toLowerCase()
        .trim()
        .replaceAll(RegExp(r'[^a-z0-9\s-]'), '')
        .replaceAll(RegExp(r'\s+'), '-')
        .replaceAll(RegExp(r'-+'), '-');
  }

  Future<void> _checkSlugAvailability(String slug) async {
    if (slug.isEmpty) {
      setState(() {
        _slugAvailable = null;
        _slugError = null;
      });
      return;
    }

    if (slug.length < 3) {
      setState(() {
        _slugAvailable = false;
        _slugError = 'Slug must be at least 3 characters';
      });
      return;
    }

    setState(() {
      _isCheckingSlug = true;
      _slugError = null;
    });

    try {
      final supabase = ref.read(supabaseClientProvider);
      final available = await supabase.rpc(
        'check_slug_available',
        params: {'slug_to_check': slug},
      );

      if (mounted) {
        setState(() {
          _isCheckingSlug = false;
          _slugAvailable = available as bool;
          _slugError = available ? null : 'This slug is already taken';
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isCheckingSlug = false;
          _slugAvailable = null;
          _slugError = 'Failed to check slug availability';
        });
      }
    }
  }

  Future<void> _createOrganization() async {
    if (!_formKey.currentState!.validate()) return;
    
    if (_slugAvailable != true) {
      AppToast.error(context, 'Please choose a valid, available slug');
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final supabase = ref.read(supabaseClientProvider);
      
      final result = await supabase.rpc(
        'app_create_organization_with_owner',
        params: {
          'org_name': _nameController.text.trim(),
          'org_slug': _slugController.text.trim(),
        },
      );

      if (mounted) {
        // Invalidate the organizations provider to refresh the list
        ref.invalidate(userOrganizationsProvider);
        
        AppToast.success(context, 'Organization created successfully!');
        
        // Navigate to the new organization's shows page
        final orgId = result['id'] as String;
        final orgName = result['name'] as String? ?? 'Organization';
        context.go('/org/$orgId/shows', extra: orgName);
      }
    } catch (e) {
      if (mounted) {
        AppToast.error(context, 'Failed to create organization: $e');
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final brightness = CupertinoTheme.brightnessOf(context);

    return CupertinoPageScaffold(
      navigationBar: CupertinoNavigationBar(
        middle: const Text('Create Organization'),
        leading: const BackButton(),
      ),
      child: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header
                Text(
                  'New Organization',
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.getForegroundColor(brightness),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Create a new organization to manage your shows and team.',
                  style: TextStyle(
                    fontSize: 17,
                    color: AppTheme.getMutedForegroundColor(brightness),
                  ),
                ),
                const SizedBox(height: 32),

                // Organization Name
                Text(
                  'Organization Name',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.getForegroundColor(brightness),
                  ),
                ),
                const SizedBox(height: 8),
                CupertinoTextField(
                  controller: _nameController,
                  placeholder: 'Enter organization name',
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 16,
                  ),
                  decoration: BoxDecoration(
                    color: AppTheme.getCardColor(brightness),
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                const SizedBox(height: 24),

                // Slug
                Text(
                  'URL Slug',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.getForegroundColor(brightness),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'This will be used in your organization URL',
                  style: TextStyle(
                    fontSize: 13,
                    color: AppTheme.getMutedForegroundColor(brightness),
                  ),
                ),
                const SizedBox(height: 8),
                CupertinoTextField(
                  controller: _slugController,
                  placeholder: 'organization-slug',
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 16,
                  ),
                  decoration: BoxDecoration(
                    color: AppTheme.getCardColor(brightness),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  suffix: _isCheckingSlug
                      ? const Padding(
                          padding: EdgeInsets.all(12),
                          child: SizedBox(
                            width: 20,
                            height: 20,
                            child: CupertinoActivityIndicator(),
                          ),
                        )
                      : _slugAvailable == true
                          ? const Padding(
                              padding: EdgeInsets.only(right: 12),
                              child: Icon(CupertinoIcons.check_mark_circled, color: CupertinoColors.systemGreen),
                            )
                          : _slugAvailable == false
                              ? const Padding(
                                  padding: EdgeInsets.only(right: 12),
                                  child: Icon(CupertinoIcons.exclamationmark_circle, color: CupertinoColors.destructiveRed),
                                )
                              : null,
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: AppTheme.getCardColor(brightness),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        CupertinoIcons.link,
                        size: 16,
                        color: AppTheme.getMutedForegroundColor(brightness),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'oncore.io/${_slugController.text.isEmpty ? 'your-slug' : _slugController.text}',
                          style: TextStyle(
                            color: AppTheme.getMutedForegroundColor(brightness),
                            fontFamily: 'monospace',
                            fontSize: 13,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 40),

                // Create Button
                SizedBox(
                  width: double.infinity,
                  child: CupertinoButton.filled(
                    onPressed: _isSubmitting || _slugAvailable != true
                        ? null
                        : _createOrganization,
                    child: _isSubmitting
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CupertinoActivityIndicator(
                              color: CupertinoColors.white,
                            ),
                          )
                        : const Text(
                            'Create Organization',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
