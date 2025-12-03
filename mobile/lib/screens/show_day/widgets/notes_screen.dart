import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../components/components.dart';
import '../../../providers/auth_provider.dart';

/// Layer 2: Notes screen - just a big textarea
class NotesScreen extends ConsumerStatefulWidget {
  final String? initialNotes;
  final String showId;
  final String orgId;
  final VoidCallback? onNotesChanged;

  const NotesScreen({
    super.key,
    this.initialNotes,
    required this.showId,
    required this.orgId,
    this.onNotesChanged,
  });

  @override
  ConsumerState<NotesScreen> createState() => _NotesScreenState();
}

class _NotesScreenState extends ConsumerState<NotesScreen> {
  late TextEditingController _notesController;
  bool _hasChanges = false;
  bool _isSaving = false;
  String? _existingNoteId;

  @override
  void initState() {
    super.initState();
    _notesController = TextEditingController(text: widget.initialNotes ?? '');
    _notesController.addListener(_onTextChanged);
    _loadExistingNoteId();
  }

  @override
  void dispose() {
    _notesController.removeListener(_onTextChanged);
    _notesController.dispose();
    super.dispose();
  }

  void _onTextChanged() {
    if (!_hasChanges) {
      setState(() => _hasChanges = true);
    }
  }

  Future<void> _loadExistingNoteId() async {
    final supabase = ref.read(supabaseClientProvider);
    
    try {
      final response = await supabase
          .from('advancing_notes')
          .select('id')
          .eq('show_id', widget.showId)
          .eq('scope', 'general')
          .maybeSingle();
      
      if (response != null) {
        _existingNoteId = response['id'] as String?;
      }
    } catch (e) {
      // Ignore errors, we'll create a new note if needed
    }
  }

  Future<void> _saveNotes() async {
    if (!_hasChanges) return;
    
    setState(() => _isSaving = true);

    try {
      final supabase = ref.read(supabaseClientProvider);
      final body = _notesController.text.trim();

      if (_existingNoteId != null) {
        // Update existing note
        if (body.isEmpty) {
          // Delete if empty
          await supabase
              .from('advancing_notes')
              .delete()
              .eq('id', _existingNoteId!);
          _existingNoteId = null;
        } else {
          await supabase
              .from('advancing_notes')
              .update({'body': body})
              .eq('id', _existingNoteId!);
        }
      } else if (body.isNotEmpty) {
        // Create new note
        final response = await supabase
            .from('advancing_notes')
            .insert({
              'show_id': widget.showId,
              'scope': 'general',
              'body': body,
            })
            .select('id')
            .single();
        _existingNoteId = response['id'] as String?;
      }

      if (mounted) {
        setState(() => _hasChanges = false);
        widget.onNotesChanged?.call();
      }
    } catch (e) {
      if (mounted) {
        AppToast.error(context, 'Failed to save notes: $e');
      }
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return LayerScaffold(
      title: 'Notes',
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Notes textarea - takes up all available space
            Expanded(
              child: TextField(
                controller: _notesController,
                maxLines: null,
                expands: true,
                textAlignVertical: TextAlignVertical.top,
                cursorColor: colorScheme.onSurface,
                style: TextStyle(
                  color: colorScheme.onSurface,
                  fontSize: 16,
                  height: 1.5,
                ),
                decoration: InputDecoration(
                  hintText: 'Write your notes here...',
                  hintStyle: TextStyle(
                    color: colorScheme.onSurfaceVariant.withValues(alpha: 0.5),
                    fontSize: 16,
                  ),
                  border: InputBorder.none,
                  enabledBorder: InputBorder.none,
                  focusedBorder: InputBorder.none,
                  filled: false,
                  contentPadding: EdgeInsets.zero,
                ),
              ),
            ),
            // Auto-save indicator
            if (_hasChanges || _isSaving)
              Padding(
                padding: const EdgeInsets.only(top: 16),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    if (_isSaving) ...[
                      SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: colorScheme.onSurfaceVariant,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Saving...',
                        style: TextStyle(
                          color: colorScheme.onSurfaceVariant,
                          fontSize: 13,
                        ),
                      ),
                    ] else if (_hasChanges) ...[
                      TextButton(
                        onPressed: _saveNotes,
                        child: Text(
                          'Save',
                          style: TextStyle(
                            color: colorScheme.primary,
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}
