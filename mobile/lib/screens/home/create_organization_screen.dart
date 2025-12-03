import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../components/components.dart';
import '../../providers/auth_provider.dart';
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
        context.go('/org/$orgId/shows');
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
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Create Organization'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/'),
        ),
      ),
      body: SafeArea(
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
                  style: theme.textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Create a new organization to manage your shows and team.',
                  style: theme.textTheme.bodyLarge?.copyWith(
                    color: colorScheme.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 32),

                // Organization Name
                Text(
                  'Organization Name',
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _nameController,
                  decoration: InputDecoration(
                    hintText: 'Enter organization name',
                    filled: true,
                    fillColor: colorScheme.surfaceContainerHighest,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 16,
                    ),
                  ),
                  textInputAction: TextInputAction.next,
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Please enter an organization name';
                    }
                    if (value.trim().length < 2) {
                      return 'Name must be at least 2 characters';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 24),

                // Slug
                Text(
                  'URL Slug',
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'This will be used in your organization URL',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: colorScheme.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _slugController,
                  decoration: InputDecoration(
                    hintText: 'organization-slug',
                    filled: true,
                    fillColor: colorScheme.surfaceContainerHighest,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 16,
                    ),
                    suffixIcon: _isCheckingSlug
                        ? const Padding(
                            padding: EdgeInsets.all(12),
                            child: SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            ),
                          )
                        : _slugAvailable == true
                            ? const Icon(Icons.check_circle, color: Colors.green)
                            : _slugAvailable == false
                                ? const Icon(Icons.error, color: Colors.red)
                                : null,
                    errorText: _slugError,
                  ),
                  onChanged: (value) {
                    _checkSlugAvailability(value);
                  },
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Please enter a slug';
                    }
                    if (value.trim().length < 3) {
                      return 'Slug must be at least 3 characters';
                    }
                    if (!RegExp(r'^[a-z0-9-]+$').hasMatch(value)) {
                      return 'Slug can only contain lowercase letters, numbers, and hyphens';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: colorScheme.surfaceContainerHigh,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.link,
                        size: 16,
                        color: colorScheme.onSurfaceVariant,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'oncore.io/${_slugController.text.isEmpty ? 'your-slug' : _slugController.text}',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: colorScheme.onSurfaceVariant,
                            fontFamily: 'monospace',
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
                  child: FilledButton(
                    onPressed: _isSubmitting || _slugAvailable != true
                        ? null
                        : _createOrganization,
                    style: FilledButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: _isSubmitting
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
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
                const SizedBox(height: 16),

                // Cancel Button
                SizedBox(
                  width: double.infinity,
                  child: TextButton(
                    onPressed: _isSubmitting ? null : () => context.go('/'),
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                    child: const Text('Cancel'),
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
