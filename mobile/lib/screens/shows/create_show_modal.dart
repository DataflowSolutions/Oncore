import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../components/components.dart';
import '../../providers/auth_provider.dart';
import '../main/main_shell.dart' show saveLastShow;
import 'shows_list_screen.dart';

/// Modal for creating a new show - matches web client functionality
class CreateShowModal extends ConsumerStatefulWidget {
  final String orgId;

  const CreateShowModal({super.key, required this.orgId});

  @override
  ConsumerState<CreateShowModal> createState() => _CreateShowModalState();
}

class _CreateShowModalState extends ConsumerState<CreateShowModal> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _cityController = TextEditingController();
  final _artistController = TextEditingController();
  DateTime _selectedDate = DateTime.now();
  
  // Artist selection
  String? _selectedArtistId;
  String? _selectedArtistName;
  List<Map<String, dynamic>> _artists = [];
  bool _loadingArtists = true;
  bool _isSubmitting = false;
  bool _isCreatingArtist = false;

  // Colors matching web dark theme
  static const _background = Color(0xFF1A1A1A);
  static const _foreground = Color(0xFFF0F0F0);
  static const _muted = Color(0xFFA3A3A3);
  static const _inputBg = Color(0xFF282828);
  static const _border = Color(0xFF3A3A3A);

  @override
  void initState() {
    super.initState();
    _loadArtists();
  }

  @override
  void dispose() {
    _titleController.dispose();
    _cityController.dispose();
    _artistController.dispose();
    super.dispose();
  }

  Future<void> _loadArtists() async {
    final supabase = ref.read(supabaseClientProvider);
    
    try {
      final response = await supabase.rpc(
        'get_org_people',
        params: {'p_org_id': widget.orgId},
      );
      
      if (response != null) {
        final List<dynamic> people = response as List<dynamic>;
        final artistsList = people
            .where((p) => (p as Map<String, dynamic>)['member_type'] == 'artist')
            .map((p) => p as Map<String, dynamic>)
            .toList();
        setState(() {
          _artists = artistsList;
          _loadingArtists = false;
        });
      }
    } catch (e) {
      setState(() => _loadingArtists = false);
    }
  }

  Future<void> _selectDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now().add(const Duration(days: 365 * 3)),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.dark(
              primary: _foreground,
              onPrimary: Colors.black,
              surface: _background,
              onSurface: _foreground,
            ),
          ),
          child: child!,
        );
      },
    );
    
    if (picked != null) {
      setState(() => _selectedDate = picked);
    }
  }

  Future<void> _createShow() async {
    if (!_formKey.currentState!.validate()) return;
    
    setState(() => _isSubmitting = true);
    
    final supabase = ref.read(supabaseClientProvider);
    
    try {
      // If artist text is entered but no artist selected, create the artist first
      String? artistIdToAssign = _selectedArtistId;
      final artistText = _artistController.text.trim();
      
      if (artistText.isNotEmpty && _selectedArtistId == null) {
        // Check if exact match exists
        final existingArtist = _artists.firstWhere(
          (a) => (a['name'] as String?)?.toLowerCase() == artistText.toLowerCase(),
          orElse: () => <String, dynamic>{},
        );
        
        if (existingArtist.isNotEmpty) {
          artistIdToAssign = existingArtist['id'] as String;
        } else {
          // Create new artist
          setState(() => _isCreatingArtist = true);
          final newArtist = await supabase.rpc(
            'create_person',
            params: {
              'p_org_id': widget.orgId,
              'p_name': artistText,
              'p_member_type': 'artist',
            },
          );
          if (newArtist != null) {
            artistIdToAssign = newArtist['id'] as String;
          }
          setState(() => _isCreatingArtist = false);
        }
      }
      
      // Create the show using RPC
      final response = await supabase.rpc(
        'app_create_show',
        params: {
          'p_org_id': widget.orgId,
          'p_title': _titleController.text.trim(),
          'p_date': _selectedDate.toIso8601String().split('T')[0],
          'p_venue_city': _cityController.text.trim().isNotEmpty 
              ? _cityController.text.trim() 
              : null,
          'p_venue_name': _cityController.text.trim().isNotEmpty 
              ? _cityController.text.trim() 
              : null,
        },
      );
      
      if (response != null) {
        final showId = response['id'] as String;
        
        // If an artist was selected or created, assign them to the show
        if (artistIdToAssign != null) {
          await supabase.rpc(
            'assign_person_to_show',
            params: {
              'p_show_id': showId,
              'p_person_id': artistIdToAssign,
            },
          );
        }
        
        // Invalidate the shows list to refresh
        ref.invalidate(showsByOrgProvider(widget.orgId));
        
        if (mounted) {
          // Save as last show and navigate to it
          saveLastShow(widget.orgId, showId);
          // Close modal and navigate to the new show
          Navigator.of(context).pop();
          context.push('/org/${widget.orgId}/shows/$showId/day');
        }
      }
    } catch (e) {
      if (mounted) {
        AppToast.error(context, 'Failed to create show: ${e.toString()}');
      }
    } finally {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
          _isCreatingArtist = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: _background,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Handle bar
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: _muted,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                
                // Title
                const Text(
                  'Create New Show',
                  style: TextStyle(
                    color: _foreground,
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Add a new show to your schedule',
                  style: TextStyle(color: _muted, fontSize: 14),
                ),
                const SizedBox(height: 24),
                
                // Show Name
                _buildLabel('Show Name *'),
                const SizedBox(height: 8),
                _buildTextField(
                  controller: _titleController,
                  hint: 'Enter show name',
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Show name is required';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 20),
                
                // City
                _buildLabel('City'),
                const SizedBox(height: 8),
                _buildTextField(
                  controller: _cityController,
                  hint: 'Enter city',
                ),
                const SizedBox(height: 20),
                
                // Date
                _buildLabel('Performance Date *'),
                const SizedBox(height: 8),
                _buildDatePicker(),
                const SizedBox(height: 20),
                
                // Artist
                _buildLabel('Artist'),
                const SizedBox(height: 8),
                _buildArtistSelector(),
                const SizedBox(height: 32),
                
                // Buttons
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: _isSubmitting ? null : () => Navigator.pop(context),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: _foreground,
                          side: const BorderSide(color: _border),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: const Text('Cancel'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: _isSubmitting ? null : _createShow,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: _foreground,
                          foregroundColor: Colors.black,
                          padding: const EdgeInsets.symmetric(vertical: 14),
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
                                  color: Colors.black,
                                ),
                              )
                            : const Text(
                                'Create Show',
                                style: TextStyle(fontWeight: FontWeight.w600),
                              ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildLabel(String text) {
    return Text(
      text,
      style: const TextStyle(
        color: _foreground,
        fontSize: 14,
        fontWeight: FontWeight.w500,
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String hint,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      validator: validator,
      style: const TextStyle(color: _foreground),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: _muted),
        filled: true,
        fillColor: _inputBg,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: _border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: _foreground),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Colors.red),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
    );
  }

  Widget _buildDatePicker() {
    final formattedDate = '${_selectedDate.year}-${_selectedDate.month.toString().padLeft(2, '0')}-${_selectedDate.day.toString().padLeft(2, '0')}';
    
    return GestureDetector(
      onTap: _selectDate,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: _inputBg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: _border),
        ),
        child: Row(
          children: [
            Text(
              formattedDate,
              style: const TextStyle(color: _foreground, fontSize: 16),
            ),
            const Spacer(),
            const Icon(Icons.calendar_today, color: _muted, size: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildArtistSelector() {
    if (_loadingArtists) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: _inputBg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: _border),
        ),
        child: const Row(
          children: [
            SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(strokeWidth: 2, color: _muted),
            ),
            SizedBox(width: 12),
            Text('Loading artists...', style: TextStyle(color: _muted)),
          ],
        ),
      );
    }

    return Autocomplete<Map<String, dynamic>>(
      optionsBuilder: (TextEditingValue textEditingValue) {
        if (textEditingValue.text.isEmpty) {
          return _artists;
        }
        final query = textEditingValue.text.toLowerCase();
        return _artists.where((artist) {
          final name = (artist['name'] as String?)?.toLowerCase() ?? '';
          return name.contains(query);
        });
      },
      displayStringForOption: (artist) => artist['name'] as String? ?? '',
      fieldViewBuilder: (context, controller, focusNode, onFieldSubmitted) {
        // Sync our controller with autocomplete's controller
        if (_artistController.text != controller.text && _selectedArtistName != null) {
          controller.text = _selectedArtistName!;
        }
        
        return TextFormField(
          controller: controller,
          focusNode: focusNode,
          style: const TextStyle(color: _foreground),
          decoration: InputDecoration(
            hintText: 'Search or create an artist...',
            hintStyle: const TextStyle(color: _muted),
            filled: true,
            fillColor: _inputBg,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: _border),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: _foreground),
            ),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            suffixIcon: controller.text.isNotEmpty
                ? IconButton(
                    icon: const Icon(Icons.clear, color: _muted, size: 20),
                    onPressed: () {
                      controller.clear();
                      _artistController.clear();
                      setState(() {
                        _selectedArtistId = null;
                        _selectedArtistName = null;
                      });
                    },
                  )
                : const Icon(Icons.search, color: _muted, size: 20),
          ),
          onChanged: (value) {
            _artistController.text = value;
            // If the user is typing, clear the selected artist ID
            // (will create new artist if no match found)
            if (_selectedArtistName != value) {
              setState(() {
                _selectedArtistId = null;
                _selectedArtistName = null;
              });
            }
          },
        );
      },
      optionsViewBuilder: (context, onSelected, options) {
        final optionsList = options.toList();
        final query = _artistController.text.trim();
        final exactMatchExists = _artists.any(
          (a) => (a['name'] as String?)?.toLowerCase() == query.toLowerCase(),
        );
        
        return Align(
          alignment: Alignment.topLeft,
          child: Material(
            color: _inputBg,
            elevation: 4,
            borderRadius: BorderRadius.circular(12),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 250),
              child: ListView(
                shrinkWrap: true,
                padding: EdgeInsets.zero,
                children: [
                  ...optionsList.map((artist) {
                    final isSelected = _selectedArtistId == artist['id'];
                    return ListTile(
                      dense: true,
                      leading: isSelected 
                          ? const Icon(Icons.check, color: _foreground, size: 18)
                          : const SizedBox(width: 18),
                      title: Text(
                        artist['name'] as String? ?? '',
                        style: const TextStyle(color: _foreground),
                      ),
                      onTap: () => onSelected(artist),
                    );
                  }),
                  // Show "Create new artist" option if query doesn't match exactly
                  if (query.isNotEmpty && !exactMatchExists) ...[
                    const Divider(color: _border, height: 1),
                    ListTile(
                      dense: true,
                      leading: const Icon(Icons.add, color: _foreground, size: 18),
                      title: Text(
                        'Create "$query" as new artist',
                        style: const TextStyle(color: _foreground),
                      ),
                      onTap: () {
                        // Keep the text but clear selected ID so it will be created
                        setState(() {
                          _selectedArtistId = null;
                          _selectedArtistName = query;
                        });
                        FocusScope.of(context).unfocus();
                      },
                    ),
                  ],
                ],
              ),
            ),
          ),
        );
      },
      onSelected: (artist) {
        setState(() {
          _selectedArtistId = artist['id'] as String;
          _selectedArtistName = artist['name'] as String?;
          _artistController.text = _selectedArtistName ?? '';
        });
      },
    );
  }
}

/// Show the create show modal as a bottom sheet
Future<void> showCreateShowModal(BuildContext context, String orgId) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (context) => CreateShowModal(orgId: orgId),
  );
}
