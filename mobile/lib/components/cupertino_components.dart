import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../theme/theme.dart';

/// Cupertino-styled back button for navigation bar
class CupertinoBackButton extends StatelessWidget {
  final String? label;
  final VoidCallback? onPressed;

  const CupertinoBackButton({
    super.key,
    this.label,
    this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return CupertinoButton(
      padding: EdgeInsets.zero,
      onPressed: onPressed ?? () => context.pop(),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(
            CupertinoIcons.back,
            size: 28,
          ),
          if (label != null) ...[
            const SizedBox(width: 4),
            Text(label!),
          ],
        ],
      ),
    );
  }
}

/// Cupertino-styled card container
class CupertinoCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final Color? backgroundColor;
  final Border? border;

  const CupertinoCard({
    super.key,
    required this.child,
    this.padding,
    this.margin,
    this.backgroundColor,
    this.border,
  });

  @override
  Widget build(BuildContext context) {
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;
    
    return Container(
      margin: margin ?? const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: padding ?? const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: backgroundColor ?? AppTheme.getCardColor(brightness),
        border: border ?? Border.all(
          color: AppTheme.getCardBorderColor(brightness),
          width: 1,
        ),
        borderRadius: BorderRadius.circular(12),
      ),
      child: child,
    );
  }
}

/// Cupertino-styled list tile
class CupertinoListTile extends StatelessWidget {
  final Widget? leading;
  final Widget title;
  final Widget? subtitle;
  final Widget? trailing;
  final VoidCallback? onTap;
  final Color? backgroundColor;
  final EdgeInsetsGeometry? padding;

  const CupertinoListTile({
    super.key,
    this.leading,
    required this.title,
    this.subtitle,
    this.trailing,
    this.onTap,
    this.backgroundColor,
    this.padding,
  });

  @override
  Widget build(BuildContext context) {
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;
    
    Widget content = Padding(
      padding: padding ?? const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          if (leading != null) ...[
            leading!,
            const SizedBox(width: 12),
          ],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                DefaultTextStyle(
                  style: AppTheme.bodyTextStyle(brightness),
                  child: title,
                ),
                if (subtitle != null) ...[
                  const SizedBox(height: 4),
                  DefaultTextStyle(
                    style: AppTheme.footnoteTextStyle(brightness),
                    child: subtitle!,
                  ),
                ],
              ],
            ),
          ),
          if (trailing != null) ...[
            const SizedBox(width: 12),
            trailing!,
          ],
        ],
      ),
    );

    if (onTap != null) {
      return GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: Container(
          color: backgroundColor,
          child: content,
        ),
      );
    }

    return Container(
      color: backgroundColor,
      child: content,
    );
  }
}

/// Cupertino-styled section header
class CupertinoSectionHeader extends StatelessWidget {
  final String title;
  final EdgeInsetsGeometry? padding;

  const CupertinoSectionHeader({
    super.key,
    required this.title,
    this.padding,
  });

  @override
  Widget build(BuildContext context) {
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;
    
    return Padding(
      padding: padding ?? const EdgeInsets.fromLTRB(16, 24, 16, 8),
      child: Text(
        title.toUpperCase(),
        style: AppTheme.caption1TextStyle(brightness).copyWith(
          fontWeight: FontWeight.w600,
          letterSpacing: 0.5,
        ),
      ),
    );
  }
}

/// Cupertino-styled divider
class CupertinoDivider extends StatelessWidget {
  final double height;
  final double thickness;
  final double indent;
  final double endIndent;

  const CupertinoDivider({
    super.key,
    this.height = 1,
    this.thickness = 0.5,
    this.indent = 0,
    this.endIndent = 0,
  });

  @override
  Widget build(BuildContext context) {
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;
    
    return Container(
      height: height,
      margin: EdgeInsets.only(left: indent, right: endIndent),
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(
            color: AppTheme.getBorderColor(brightness),
            width: thickness,
          ),
        ),
      ),
    );
  }
}

/// Cupertino-styled input field
class CupertinoInputField extends StatelessWidget {
  final TextEditingController? controller;
  final String? placeholder;
  final String? prefix;
  final Widget? prefixWidget;
  final Widget? suffix;
  final bool obscureText;
  final TextInputType? keyboardType;
  final int? maxLines;
  final bool enabled;
  final String? Function(String?)? validator;
  final void Function(String)? onChanged;
  final EdgeInsetsGeometry? padding;

  const CupertinoInputField({
    super.key,
    this.controller,
    this.placeholder,
    this.prefix,
    this.prefixWidget,
    this.suffix,
    this.obscureText = false,
    this.keyboardType,
    this.maxLines = 1,
    this.enabled = true,
    this.validator,
    this.onChanged,
    this.padding,
  });

  @override
  Widget build(BuildContext context) {
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;
    
    return Container(
      padding: padding ?? const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: AppTheme.getInputBackgroundColor(brightness),
        border: Border.all(
          color: AppTheme.getInputBorderColor(brightness),
          width: 1,
        ),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          if (prefix != null) ...[
            Text(
              prefix!,
              style: AppTheme.bodyTextStyle(brightness),
            ),
            const SizedBox(width: 8),
          ],
          if (prefixWidget != null) ...[
            prefixWidget!,
            const SizedBox(width: 8),
          ],
          Expanded(
            child: CupertinoTextField(
              controller: controller,
              placeholder: placeholder,
              obscureText: obscureText,
              keyboardType: keyboardType,
              maxLines: maxLines,
              enabled: enabled,
              onChanged: onChanged,
              decoration: const BoxDecoration(),
              padding: EdgeInsets.zero,
              style: AppTheme.bodyTextStyle(brightness),
              placeholderStyle: AppTheme.bodyTextStyle(brightness).copyWith(
                color: AppTheme.getMutedForegroundColor(brightness),
              ),
            ),
          ),
          if (suffix != null) ...[
            const SizedBox(width: 8),
            suffix!,
          ],
        ],
      ),
    );
  }
}
