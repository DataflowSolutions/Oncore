import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../components/components.dart';
import '../../../providers/auth_provider.dart';
import '../../../theme/app_theme.dart';
import 'form_widgets.dart';

/// Layer 3: Add schedule item form screen
class AddScheduleItemScreen extends ConsumerStatefulWidget {
  final String showId;
  final String orgId;
  final VoidCallback? onItemAdded;

  const AddScheduleItemScreen({
    super.key,
    required this.showId,
    required this.orgId,
    this.onItemAdded,
  });

  @override
  ConsumerState<AddScheduleItemScreen> createState() => _AddScheduleItemScreenState();
}

class _AddScheduleItemScreenState extends ConsumerState<AddScheduleItemScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _locationController = TextEditingController();
  final _notesController = TextEditingController();
  
  String _itemType = 'custom';
  DateTime? _startDate;
  DateTime? _startTime;
  DateTime? _endDate;
  DateTime? _endTime;
  
  bool _isLoading = false;

  // Valid schedule_item_type enum values from database
  static const List<String> _itemTypes = [
    'custom',
    'load_in',
    'soundcheck',
    'doors',
    'set_time',
    'load_out',
    'hotel',
    'transport',
    'catering',
    'meeting',
    'press',
    'technical',
  ];

  @override
  void dispose() {
    _titleController.dispose();
    _locationController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  DateTime? _combineDateTime(DateTime? date, DateTime? time) {
    if (date == null || time == null) return null;
    return DateTime(
      date.year,
      date.month,
      date.day,
      time.hour,
      time.minute,
    );
  }

  Future<void> _saveItem() async {
    if (!_formKey.currentState!.validate()) return;
    
    final startsAt = _combineDateTime(_startDate, _startTime);
    if (startsAt == null) {
      AppToast.error(context, 'Start date and time are required');
      return;
    }
    
    setState(() => _isLoading = true);

    try {
      final supabase = ref.read(supabaseClientProvider);
      
      final endsAt = _combineDateTime(_endDate, _endTime);

      // Use RPC function instead of direct insert
      await supabase.rpc('create_schedule_item', params: {
        'p_org_id': widget.orgId,
        'p_show_id': widget.showId,
        'p_title': _titleController.text.trim(),
        'p_starts_at': startsAt.toIso8601String(),
        'p_ends_at': endsAt?.toIso8601String(),
        'p_location': _locationController.text.trim().isEmpty ? null : _locationController.text.trim(),
        'p_item_type': _itemType,
        'p_notes': _notesController.text.trim().isEmpty ? null : _notesController.text.trim(),
        'p_auto_generated': false,
      });

      if (mounted) {
        widget.onItemAdded?.call();
      }
    } catch (e) {
      print('═══════════════════════════════════════');
      print('❌ ERROR saving schedule item: $e');
      print('═══════════════════════════════════════');
      if (mounted) {
        AppToast.error(context, 'Failed to save schedule item: $e');
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
      title: 'Add Schedule Item',
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
                      hint: 'Name',
                      controller: _titleController,
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'Name is required';
                        }
                        return null;
                      },
                    ),
                    // Item type dropdown
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Row(
                        children: [
                          SizedBox(
                            width: 80,
                            child: Text(
                              'Type',
                              style: TextStyle(
                                color: AppTheme.getMutedForegroundColor(brightness),
                                fontSize: 14,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                          Expanded(
                            child: GestureDetector(
                              onTap: () {
                                showCupertinoModalPopup(
                                  context: context,
                                  builder: (BuildContext context) => Container(
                                    height: 216,
                                    padding: const EdgeInsets.only(top: 6.0),
                                    margin: EdgeInsets.only(
                                      bottom: MediaQuery.of(context).viewInsets.bottom,
                                    ),
                                    color: CupertinoColors.systemBackground.resolveFrom(context),
                                    child: SafeArea(
                                      top: false,
                                      child: CupertinoPicker(
                                        itemExtent: 32.0,
                                        scrollController: FixedExtentScrollController(
                                          initialItem: _itemTypes.indexOf(_itemType),
                                        ),
                                        onSelectedItemChanged: (int index) {
                                          setState(() => _itemType = _itemTypes[index]);
                                        },
                                        children: _itemTypes.map((type) => Center(
                                          child: Text(
                                            _formatType(type),
                                            style: TextStyle(
                                              color: AppTheme.getForegroundColor(brightness),
                                              fontSize: 14,
                                            ),
                                          ),
                                        )).toList(),
                                      ),
                                    ),
                                  ),
                                );
                              },
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                decoration: BoxDecoration(
                                  border: Border(
                                    bottom: BorderSide(
                                      color: AppTheme.getBorderColor(brightness).withValues(alpha: 0.5),
                                    ),
                                  ),
                                ),
                                child: Text(
                                  _formatType(_itemType),
                                  style: TextStyle(
                                    color: AppTheme.getForegroundColor(brightness),
                                    fontSize: 14,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    FormCupertinoTextField(
                      label: 'Location',
                      hint: 'Location',
                      controller: _locationController,
                    ),
                    const SizedBox(height: 16),
                    // Start time section
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Align(
                        alignment: Alignment.centerLeft,
                        child: Text(
                          'START',
                          style: TextStyle(
                            color: AppTheme.getMutedForegroundColor(brightness),
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                    FormDateField(
                      label: 'Date',
                      value: _startDate,
                      onChanged: (date) => setState(() => _startDate = date),
                    ),
                    FormTimeField(
                      label: 'Time',
                      value: _startTime,
                      onChanged: (time) => setState(() => _startTime = time),
                    ),
                    const SizedBox(height: 16),
                    // End time section
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Align(
                        alignment: Alignment.centerLeft,
                        child: Text(
                          'END (Optional)',
                          style: TextStyle(
                            color: AppTheme.getMutedForegroundColor(brightness),
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                    FormDateField(
                      label: 'Date',
                      value: _endDate,
                      onChanged: (date) => setState(() => _endDate = date),
                    ),
                    FormTimeField(
                      label: 'Time',
                      value: _endTime,
                      onChanged: (time) => setState(() => _endTime = time),
                    ),
                    const SizedBox(height: 16),
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
              onPressed: _saveItem,
              isLoading: _isLoading,
            ),
          ],
        ),
      ),
    );
  }

  String _formatType(String type) {
    return type.split('_').map((word) => 
      word.isNotEmpty ? word[0].toUpperCase() + word.substring(1) : ''
    ).join(' ');
  }
}
