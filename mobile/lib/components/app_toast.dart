import 'package:flutter/cupertino.dart';

/// Toast notification types with distinct visual styling
enum ToastType {
  success,
  error,
  info,
  warning,
}

/// Configuration for toast display
class ToastConfig {
  final String message;
  final ToastType type;
  final Duration duration;
  final IconData? icon;

  const ToastConfig({
    required this.message,
    this.type = ToastType.info,
    this.duration = const Duration(seconds: 3),
    this.icon,
  });
}

/// A modern, non-intrusive toast notification system
/// Displays toasts at the top of the screen with smooth animations
class AppToast {
  static OverlayEntry? _currentEntry;
  static bool _isShowing = false;

  /// Show a toast notification
  static void show(
    BuildContext context,
    String message, {
    ToastType type = ToastType.info,
    Duration duration = const Duration(seconds: 3),
    IconData? icon,
  }) {
    _show(
      context,
      ToastConfig(
        message: message,
        type: type,
        duration: duration,
        icon: icon,
      ),
    );
  }

  /// Show a success toast
  static void success(BuildContext context, String message) {
    show(context, message, type: ToastType.success, icon: CupertinoIcons.check_mark_circled);
  }

  /// Show an error toast
  static void error(BuildContext context, String message) {
    show(context, message, type: ToastType.error, icon: CupertinoIcons.exclamationmark_circle);
  }

  /// Show an info toast
  static void info(BuildContext context, String message) {
    show(context, message, type: ToastType.info, icon: CupertinoIcons.info_circle);
  }

  /// Show a warning toast
  static void warning(BuildContext context, String message) {
    show(context, message, type: ToastType.warning, icon: CupertinoIcons.exclamationmark_triangle);
  }

  static void _show(BuildContext context, ToastConfig config) {
    // Remove any existing toast
    _dismiss();

    final overlay = Overlay.of(context);
    _isShowing = true;

    _currentEntry = OverlayEntry(
      builder: (context) => _ToastWidget(
        config: config,
        onDismiss: _dismiss,
      ),
    );

    overlay.insert(_currentEntry!);

    // Auto-dismiss after duration
    Future.delayed(config.duration, () {
      if (_isShowing) {
        _dismiss();
      }
    });
  }

  static void _dismiss() {
    _currentEntry?.remove();
    _currentEntry = null;
    _isShowing = false;
  }
}

class _ToastWidget extends StatefulWidget {
  final ToastConfig config;
  final VoidCallback onDismiss;

  const _ToastWidget({
    required this.config,
    required this.onDismiss,
  });

  @override
  State<_ToastWidget> createState() => _ToastWidgetState();
}

class _ToastWidgetState extends State<_ToastWidget>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );

    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOut),
    );

    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, -1),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic));

    _controller.forward();

    // Start dismiss animation before removal
    Future.delayed(widget.config.duration - const Duration(milliseconds: 300), () {
      if (mounted) {
        _controller.reverse();
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Color _getBackgroundColor(BuildContext context) {
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;
    
    switch (widget.config.type) {
      case ToastType.success:
        return brightness == Brightness.dark
            ? const Color(0xFF1B5E20).withValues(alpha: 0.95)
            : const Color(0xFF4CAF50).withValues(alpha: 0.95);
      case ToastType.error:
        return brightness == Brightness.dark
            ? const Color(0xFFB71C1C).withValues(alpha: 0.95)
            : const Color(0xFFEF5350).withValues(alpha: 0.95);
      case ToastType.warning:
        return brightness == Brightness.dark
            ? const Color(0xFFE65100).withValues(alpha: 0.95)
            : const Color(0xFFFF9800).withValues(alpha: 0.95);
      case ToastType.info:
        return brightness == Brightness.dark
            ? const Color(0xFF424242).withValues(alpha: 0.98)
            : const Color(0xFFF5F5F5).withValues(alpha: 0.98);
    }
  }

  Color _getIconColor(BuildContext context) {
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;
    
    switch (widget.config.type) {
      case ToastType.success:
        return brightness == Brightness.dark ? const Color(0xFF81C784) : CupertinoColors.white;
      case ToastType.error:
        return brightness == Brightness.dark ? const Color(0xFFE57373) : CupertinoColors.white;
      case ToastType.warning:
        return brightness == Brightness.dark ? const Color(0xFFFFB74D) : CupertinoColors.white;
      case ToastType.info:
        return CupertinoTheme.of(context).primaryColor;
    }
  }

  Color _getTextColor(BuildContext context) {
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;
    
    switch (widget.config.type) {
      case ToastType.success:
      case ToastType.error:
      case ToastType.warning:
        return CupertinoColors.white;
      case ToastType.info:
        return brightness == Brightness.dark ? CupertinoColors.white : CupertinoColors.black;
    }
  }

  IconData _getDefaultIcon() {
    switch (widget.config.type) {
      case ToastType.success:
        return CupertinoIcons.check_mark_circled;
      case ToastType.error:
        return CupertinoIcons.exclamationmark_circle;
      case ToastType.warning:
        return CupertinoIcons.exclamationmark_triangle;
      case ToastType.info:
        return CupertinoIcons.info_circle;
    }
  }

  @override
  Widget build(BuildContext context) {
    final mediaQuery = MediaQuery.of(context);
    final topPadding = mediaQuery.padding.top;

    return Positioned(
      top: topPadding + 8,
      left: 16,
      right: 16,
      child: SlideTransition(
        position: _slideAnimation,
        child: FadeTransition(
          opacity: _fadeAnimation,
          child: GestureDetector(
            onTap: widget.onDismiss,
            onHorizontalDragEnd: (details) {
              if (details.primaryVelocity != null &&
                  details.primaryVelocity!.abs() > 100) {
                widget.onDismiss();
              }
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              decoration: BoxDecoration(
                color: _getBackgroundColor(context),
                borderRadius: BorderRadius.circular(12),
                boxShadow: [
                  BoxShadow(
                    color: CupertinoColors.black.withValues(alpha: 0.15),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Icon(
                    widget.config.icon ?? _getDefaultIcon(),
                    color: _getIconColor(context),
                    size: 22,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      widget.config.message,
                      style: TextStyle(
                        color: _getTextColor(context),
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Icon(
                    CupertinoIcons.xmark,
                    color: _getTextColor(context).withValues(alpha: 0.6),
                    size: 18,
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
