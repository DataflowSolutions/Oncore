import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../components/components.dart';
import '../../../providers/auth_provider.dart';
import '../../../models/show_day.dart';
import '../../../theme/app_theme.dart';
import 'form_widgets.dart';

/// Layer 3: Edit schedule item form screen - prefilled with existing data
class EditScheduleItemScreen extends ConsumerStatefulWidget {
  final String showId;
  final String orgId;
  final ScheduleItem item;
  final VoidCallback? onItemUpdated;

  const EditScheduleItemScreen({
    super.key,
    required this.showId,
    required this.orgId,
    required this.item,
    this.onItemUpdated,
  });

  @override
  ConsumerState<EditScheduleItemScreen> createState() => _EditScheduleItemScreenState();
}

class _EditScheduleItemScreenState extends ConsumerState<EditScheduleItemScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _titleController;
  late final TextEditingController _locationController;
  late final TextEditingController _notesController;
  
  late String _itemType;
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
  void initState() {
    super.initState();
    // Initialize controllers with existing data
    _titleController = TextEditingController(text: widget.item.title);
    _locationController = TextEditingController(text: widget.item.location ?? '');
    _notesController = TextEditingController(text: widget.item.notes ?? '');
    _itemType = _itemTypes.contains(widget.item.type) ? widget.item.type : 'custom';
    
    // Parse existing dates
    try {
      final dt = DateTime.parse(widget.item.startTime);
      _startDate = DateTime(dt.year, dt.month, dt.day);
      _startTime = dt;
    } catch (_) {}
    
    if (widget.item.endTime != null) {
      try {
        final dt = DateTime.parse(widget.item.endTime!);
        _endDate = DateTime(dt.year, dt.month, dt.day);
        _endTime = dt;
      } catch (_) {}
    }
  }

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

  String _formatType(String type) {
    return type
        .split('_')
        .map((word) => word.isNotEmpty ? word[0].toUpperCase() + word.substring(1) : word)
        .join(' ');
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

      // Use RPC function to update
      await supabase.rpc('update_schedule_item', params: {
        'p_item_id': widget.item.id,
        'p_title': _titleController.text.trim(),
        'p_starts_at': startsAt.toIso8601String(),
        'p_ends_at': endsAt?.toIso8601String(),
        'p_location': _locationController.text.trim().isEmpty ? null : _locationController.text.trim(),
        'p_item_type': _itemType,
        'p_notes': _notesController.text.trim().isEmpty ? null : _notesController.text.trim(),
      });

      if (mounted) {
        widget.onItemUpdated?.call();
      }
    } catch (e) {
      if (mounted) {
        AppToast.error(context, 'Failed to update schedule item: $e');
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
      title: 'Edit Schedule Item',
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
                                      color: AppTheme.getBorderColor(brightness),
                                    ),
                                  ),
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      _formatType(_itemType),
                                      style: TextStyle(
                                        color: AppTheme.getForegroundColor(brightness),
                                        fontSize: 14,
                                      ),
                                    ),
                                    Icon(
                                      CupertinoIcons.chevron_down,
                                      color: AppTheme.getMutedForegroundColor(brightness),
                                      size: 16,
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    FormDateField(
                      label: 'Start',
                      value: _startDate,
                      onChanged: (date) => setState(() => _startDate = date),
                    ),
                    FormTimeField(
                      label: 'Start',
                      value: _startTime,
                      onChanged: (time) => setState(() => _startTime = time),
                    ),
                    FormDateField(
                      label: 'End',
                      value: _endDate,
                      onChanged: (date) => setState(() => _endDate = date),
                    ),
                    FormTimeField(
                      label: 'End',
                      value: _endTime,
                      onChanged: (time) => setState(() => _endTime = time),
                    ),
                    FormCupertinoTextField(
                      label: 'Location',
                      hint: 'Location',
                      controller: _locationController,
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
              onPressed: _saveItem,
              isLoading: _isLoading,
            ),
          ],
        ),
      ),
    );
  }
}
