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
class FormDateField extends StatelessWidget {
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
  Widget build(BuildContext context) {
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;
    
    final displayText = value != null
        ? '${value!.day}/${value!.month}/${value!.year}'
        : (hint ?? 'Date');

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          SizedBox(
            width: 80,
            child: Text(
              label,
              style: TextStyle(
                color: AppTheme.getMutedForegroundColor(brightness),
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Expanded(
            child: GestureDetector(
              onTap: enabled ? () async {
                DateTime tempDate = value ?? DateTime.now();
                await showCupertinoModalPopup(
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
                      child: CupertinoDatePicker(
                        initialDateTime: tempDate,
                        mode: CupertinoDatePickerMode.date,
                        onDateTimeChanged: (DateTime newDate) {
                          tempDate = newDate;
                        },
                      ),
                    ),
                  ),
                );
                onChanged?.call(tempDate);
              } : null,
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(
                  border: Border(
                    bottom: BorderSide(
                      color: AppTheme.getBorderColor(brightness).withOpacity(0.5),
                    ),
                  ),
                ),
                child: Text(
                  displayText,
                  style: TextStyle(
                    color: value != null 
                        ? AppTheme.getForegroundColor(brightness) 
                        : AppTheme.getMutedForegroundColor(brightness).withOpacity(0.5),
                    fontSize: 14,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Time picker field for forms
class FormTimeField extends StatelessWidget {
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
  Widget build(BuildContext context) {
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;
    
    final displayText = value != null
        ? '${value!.hour.toString().padLeft(2, '0')}:${value!.minute.toString().padLeft(2, '0')}'
        : (hint ?? 'Time');

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          SizedBox(
            width: 80,
            child: Text(
              label,
              style: TextStyle(
                color: AppTheme.getMutedForegroundColor(brightness),
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Expanded(
            child: GestureDetector(
              onTap: enabled ? () async {
                final now = DateTime.now();
                final initialTime = value ?? now;
                Duration tempDuration = Duration(
                  hours: initialTime.hour,
                  minutes: initialTime.minute,
                );
                await showCupertinoModalPopup(
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
                      child: CupertinoTimerPicker(
                        mode: CupertinoTimerPickerMode.hm,
                        initialTimerDuration: tempDuration,
                        onTimerDurationChanged: (Duration newDuration) {
                          tempDuration = newDuration;
                        },
                      ),
                    ),
                  ),
                );
                final newTime = DateTime(
                  now.year,
                  now.month,
                  now.day,
                  tempDuration.inHours,
                  tempDuration.inMinutes % 60,
                );
                onChanged?.call(newTime);
              } : null,
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(
                  border: Border(
                    bottom: BorderSide(
                      color: AppTheme.getBorderColor(brightness).withOpacity(0.5),
                    ),
                  ),
                ),
                child: Text(
                  displayText,
                  style: TextStyle(
                    color: value != null 
                        ? AppTheme.getForegroundColor(brightness) 
                        : AppTheme.getMutedForegroundColor(brightness).withOpacity(0.5),
                    fontSize: 14,
                  ),
                ),
              ),
            ),
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
