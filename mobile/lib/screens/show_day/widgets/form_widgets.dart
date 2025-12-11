import 'package:flutter/cupertino.dart';
import '../../../theme/app_theme.dart';

/// A consistent text field for forms matching the dark theme style
class FormCupertinoTextField extends StatelessWidget {
  final String label;
  final String? hint;
  final TextEditingController? controller;
  final TextInputType? keyboardType;
  final int maxLines;
  final bool enabled;
  final String? Function(String?)? validator;
  final void Function(String)? onChanged;

  const FormCupertinoTextField({
    super.key,
    required this.label,
    this.hint,
    this.controller,
    this.keyboardType,
    this.maxLines = 1,
    this.enabled = true,
    this.validator,
    this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: maxLines > 1 ? CrossAxisAlignment.start : CrossAxisAlignment.center,
        children: [
          SizedBox(
            width: 80,
            child: Padding(
              padding: EdgeInsets.only(top: maxLines > 1 ? 12 : 0),
              child: Text(
                label,
                style: TextStyle(
                  color: AppTheme.getMutedForegroundColor(brightness),
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ),
          Expanded(
            child: CupertinoTextField(
              controller: controller,
              keyboardType: keyboardType,
              maxLines: maxLines,
              enabled: enabled,
              onChanged: onChanged,
              style: TextStyle(
                color: AppTheme.getForegroundColor(brightness),
                fontSize: 14,
              ),
              placeholder: hint ?? label,
              placeholderStyle: TextStyle(
                color: AppTheme.getMutedForegroundColor(brightness).withOpacity(0.5),
                fontSize: 14,
              ),
              decoration: BoxDecoration(
                border: Border(
                  bottom: BorderSide(
                    color: AppTheme.getBorderColor(brightness).withOpacity(0.5),
                  ),
                ),
              ),
              padding: const EdgeInsets.symmetric(vertical: 12),
            ),
          ),
        ],
      ),
    );
  }
}

/// Date picker field for forms
class FormDateField extends StatefulWidget {
  final String label;
  final String? hint;
  final DateTime? value;
  final void Function(DateTime?)? onChanged;
  final bool enabled;

  const FormDateField({
    super.key,
    required this.label,
    this.hint,
    this.value,
    this.onChanged,
    this.enabled = true,
  });

  @override
  State<FormDateField> createState() => _FormDateFieldState();
}

class _FormDateFieldState extends State<FormDateField> with SingleTickerProviderStateMixin {
  bool _isExpanded = false;
  bool _isAutoScrolling = false;
  final GlobalKey _pickerKey = GlobalKey();
  final Object _tapRegionGroupId = Object();
  ScrollPosition? _scrollPosition;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _scrollPosition?.removeListener(_onParentScroll);
    _scrollPosition = Scrollable.maybeOf(context)?.position;
    _scrollPosition?.addListener(_onParentScroll);
  }

  @override
  void dispose() {
    _scrollPosition?.removeListener(_onParentScroll);
    super.dispose();
  }

  void _onParentScroll() {
    if (_isExpanded && !_isAutoScrolling) {
      setState(() => _isExpanded = false);
    }
  }

  void _togglePicker() async {
    setState(() {
      _isExpanded = !_isExpanded;
    });
    
    if (_isExpanded) {
      // Disable scroll-to-close during auto-scroll
      _isAutoScrolling = true;
      
      // Wait for the animation to start, then scroll
      await Future.delayed(const Duration(milliseconds: 50));
      if (_pickerKey.currentContext != null) {
        await Scrollable.ensureVisible(
          _pickerKey.currentContext!,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeInOut,
          alignment: 0.5, // Center it
        );
      }
      
      // Re-enable scroll-to-close after auto-scroll completes
      await Future.delayed(const Duration(milliseconds: 100));
      _isAutoScrolling = false;
    }
  }

  void _closePicker() {
    if (_isExpanded) {
      setState(() => _isExpanded = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;
    
    final displayText = widget.value != null
        ? '${widget.value!.day}/${widget.value!.month}/${widget.value!.year}'
        : (widget.hint ?? 'Date');

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        children: [
          TapRegion(
            groupId: _tapRegionGroupId,
            child: Row(
              children: [
                SizedBox(
                  width: 80,
                  child: Text(
                    widget.label,
                    style: TextStyle(
                      color: AppTheme.getMutedForegroundColor(brightness),
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
                Expanded(
                  child: GestureDetector(
                    onTap: widget.enabled ? _togglePicker : null,
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      decoration: BoxDecoration(
                        border: Border(
                          bottom: BorderSide(
                            color: AppTheme.getBorderColor(brightness).withOpacity(0.5),
                          ),
                        ),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            displayText,
                            style: TextStyle(
                              color: widget.value != null 
                                  ? AppTheme.getForegroundColor(brightness) 
                                  : AppTheme.getMutedForegroundColor(brightness).withOpacity(0.5),
                              fontSize: 14,
                            ),
                          ),
                          Icon(
                            _isExpanded ? CupertinoIcons.chevron_up : CupertinoIcons.chevron_down,
                            size: 16,
                            color: AppTheme.getMutedForegroundColor(brightness),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          AnimatedSize(
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeInOut,
            child: _isExpanded
                ? TapRegion(
                    groupId: _tapRegionGroupId,
                    onTapOutside: (_) => _closePicker(),
                    child: Container(
                      key: _pickerKey,
                      height: 216,
                      margin: const EdgeInsets.only(top: 8, bottom: 8),
                      child: CupertinoDatePicker(
                        initialDateTime: widget.value ?? DateTime.now(),
                        mode: CupertinoDatePickerMode.date,
                        onDateTimeChanged: (DateTime newDate) {
                          widget.onChanged?.call(newDate);
                        },
                      ),
                    ),
                  )
                : const SizedBox.shrink(),
          ),
        ],
      ),
    );
  }
}

/// Time picker field for forms
class FormTimeField extends StatefulWidget {
  final String label;
  final String? hint;
  final DateTime? value;
  final void Function(DateTime?)? onChanged;
  final bool enabled;

  const FormTimeField({
    super.key,
    required this.label,
    this.hint,
    this.value,
    this.onChanged,
    this.enabled = true,
  });

  @override
  State<FormTimeField> createState() => _FormTimeFieldState();
}

class _FormTimeFieldState extends State<FormTimeField> with SingleTickerProviderStateMixin {
  bool _isExpanded = false;
  bool _isAutoScrolling = false;
  final GlobalKey _pickerKey = GlobalKey();
  final Object _tapRegionGroupId = Object();
  ScrollPosition? _scrollPosition;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _scrollPosition?.removeListener(_onParentScroll);
    _scrollPosition = Scrollable.maybeOf(context)?.position;
    _scrollPosition?.addListener(_onParentScroll);
  }

  @override
  void dispose() {
    _scrollPosition?.removeListener(_onParentScroll);
    super.dispose();
  }

  void _onParentScroll() {
    if (_isExpanded && !_isAutoScrolling) {
      setState(() => _isExpanded = false);
    }
  }

  void _togglePicker() async {
    setState(() {
      _isExpanded = !_isExpanded;
    });
    
    if (_isExpanded) {
      // Disable scroll-to-close during auto-scroll
      _isAutoScrolling = true;
      
      // Wait for the animation to start, then scroll
      await Future.delayed(const Duration(milliseconds: 50));
      if (_pickerKey.currentContext != null) {
        await Scrollable.ensureVisible(
          _pickerKey.currentContext!,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeInOut,
          alignment: 0.5, // Center it
        );
      }
      
      // Re-enable scroll-to-close after auto-scroll completes
      await Future.delayed(const Duration(milliseconds: 100));
      _isAutoScrolling = false;
    }
  }

  void _closePicker() {
    if (_isExpanded) {
      setState(() => _isExpanded = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;
    
    final displayText = widget.value != null
        ? '${widget.value!.hour.toString().padLeft(2, '0')}:${widget.value!.minute.toString().padLeft(2, '0')}'
        : (widget.hint ?? 'Time');

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        children: [
          TapRegion(
            groupId: _tapRegionGroupId,
            child: Row(
              children: [
                SizedBox(
                  width: 80,
                  child: Text(
                    widget.label,
                    style: TextStyle(
                      color: AppTheme.getMutedForegroundColor(brightness),
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
                Expanded(
                  child: GestureDetector(
                    onTap: widget.enabled ? _togglePicker : null,
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      decoration: BoxDecoration(
                        border: Border(
                          bottom: BorderSide(
                            color: AppTheme.getBorderColor(brightness).withOpacity(0.5),
                          ),
                        ),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            displayText,
                            style: TextStyle(
                              color: widget.value != null 
                                  ? AppTheme.getForegroundColor(brightness) 
                                  : AppTheme.getMutedForegroundColor(brightness).withOpacity(0.5),
                              fontSize: 14,
                            ),
                          ),
                          Icon(
                            _isExpanded ? CupertinoIcons.chevron_up : CupertinoIcons.chevron_down,
                            size: 16,
                            color: AppTheme.getMutedForegroundColor(brightness),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          AnimatedSize(
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeInOut,
            child: _isExpanded
                ? TapRegion(
                    groupId: _tapRegionGroupId,
                    onTapOutside: (_) => _closePicker(),
                    child: Container(
                      key: _pickerKey,
                      height: 216,
                      margin: const EdgeInsets.only(top: 8, bottom: 8),
                      child: CupertinoTimerPicker(
                        mode: CupertinoTimerPickerMode.hm,
                        initialTimerDuration: Duration(
                          hours: widget.value?.hour ?? DateTime.now().hour,
                          minutes: widget.value?.minute ?? DateTime.now().minute,
                        ),
                        onTimerDurationChanged: (Duration newDuration) {
                          final now = DateTime.now();
                          final newTime = DateTime(
                            now.year,
                            now.month,
                            now.day,
                            newDuration.inHours,
                            newDuration.inMinutes % 60,
                          );
                          widget.onChanged?.call(newTime);
                        },
                      ),
                    ),
                  )
                : const SizedBox.shrink(),
          ),
        ],
      ),
    );
  }
}

/// Primary button for form submissions
class FormSubmitButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final bool isLoading;

  const FormSubmitButton({
    super.key,
    required this.label,
    this.onPressed,
    this.isLoading = false,
  });

  @override
  Widget build(BuildContext context) {
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 24),
      child: SizedBox(
        width: double.infinity,
        child: CupertinoButton.filled(
          onPressed: isLoading ? null : onPressed,
          borderRadius: BorderRadius.circular(32),
          child: isLoading
              ? const SizedBox(
                  height: 20,
                  width: 20,
                  child: CupertinoActivityIndicator(
                    color: CupertinoColors.white,
                  ),
                )
              : Text(
                  label,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
        ),
      ),
    );
  }
}

/// Add button for list pages - navigates to layer 3 form
class AddButton extends StatelessWidget {
  final VoidCallback? onPressed;

  const AddButton({super.key, this.onPressed});

  @override
  Widget build(BuildContext context) {
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 24),
      child: SizedBox(
        width: double.infinity,
        child: CupertinoButton.filled(
          onPressed: onPressed,
          borderRadius: BorderRadius.circular(32),
          child: const Text(
            'Add',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ),
    );
  }
}

/// Contact card for the contacts list
class ContactCard extends StatelessWidget {
  final String name;
  final String? role;
  final String? phone;
  final String? email;
  final VoidCallback? onTap;
  final VoidCallback? onPhoneTap;
  final VoidCallback? onEmailTap;

  const ContactCard({
    super.key,
    required this.name,
    this.role,
    this.phone,
    this.email,
    this.onTap,
    this.onPhoneTap,
    this.onEmailTap,
  });

  @override
  Widget build(BuildContext context) {
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: AppTheme.getCardColor(brightness),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Name and role
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    name,
                    style: TextStyle(
                      color: AppTheme.getForegroundColor(brightness),
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                if (role != null)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppTheme.getCardColor(brightness),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      role!,
                      style: TextStyle(
                        color: AppTheme.getMutedForegroundColor(brightness),
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                // Chevron to indicate clickable
                const SizedBox(width: 8),
                Icon(
                  CupertinoIcons.chevron_right,
                  color: AppTheme.getMutedForegroundColor(brightness),
                  size: 20,
                ),
              ],
            ),
            const SizedBox(height: 16),
            // Phone
            if (phone != null && phone!.isNotEmpty)
              _ActionRow(
                value: phone!,
                icon: CupertinoIcons.phone,
                onTap: onPhoneTap,
              ),
            // Email
            if (email != null && email!.isNotEmpty)
              _ActionRow(
                value: email!,
                icon: CupertinoIcons.mail,
                onTap: onEmailTap,
              ),
          ],
        ),
      ),
    );
  }
}

class _ActionRow extends StatelessWidget {
  final String value;
  final IconData icon;
  final VoidCallback? onTap;

  const _ActionRow({
    required this.value,
    required this.icon,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;

    return Container(
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: AppTheme.getCardColor(brightness),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Text(
              value,
              style: TextStyle(
                color: AppTheme.getMutedForegroundColor(brightness),
                fontSize: 14,
              ),
            ),
          ),
          GestureDetector(
            onTap: onTap,
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppTheme.getCardColor(brightness),
                shape: BoxShape.circle,
                border: Border.all(color: AppTheme.getBorderColor(brightness)),
              ),
              child: Icon(
                icon,
                size: 16,
                color: AppTheme.getForegroundColor(brightness),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Generic item card for list pages (hotels, flights, schedule items, catering)
class ItemCard extends StatelessWidget {
  final String title;
  final String? subtitle;
  final List<ItemCardRow> rows;
  final VoidCallback? onTap;

  const ItemCard({
    super.key,
    required this.title,
    this.subtitle,
    this.rows = const [],
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: AppTheme.getCardColor(brightness),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: TextStyle(
                color: AppTheme.getForegroundColor(brightness),
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            if (subtitle != null) ...[
              const SizedBox(height: 4),
              Text(
                subtitle!,
                style: TextStyle(
                  color: AppTheme.getMutedForegroundColor(brightness),
                  fontSize: 14,
                ),
              ),
            ],
            if (rows.isNotEmpty) ...[
              const SizedBox(height: 16),
              ...rows.map((row) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      row.label,
                      style: TextStyle(
                        color: AppTheme.getMutedForegroundColor(brightness),
                        fontSize: 13,
                      ),
                    ),
                    Text(
                      row.value,
                      style: TextStyle(
                        color: AppTheme.getForegroundColor(brightness),
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              )),
            ],
          ],
        ),
      ),
    );
  }
}

class ItemCardRow {
  final String label;
  final String value;

  const ItemCardRow({required this.label, required this.value});
}
