import 'package:flutter/cupertino.dart';
import '../theme/app_theme.dart';

/// Reusable back button component for Layer 2+ screens.
/// Provides consistent styling and behavior across the app.
/// 
/// Usage:
/// ```dart
/// CupertinoNavigationBar(
///   leading: const BackButton(),
///   // or with custom label:
///   leading: const BackButton(label: 'Cancel'),
/// )
/// ```
class BackButton extends StatelessWidget {
  /// Optional label to display next to the back arrow.
  /// Defaults to 'Back'.
  final String label;
  
  /// Optional custom callback. If not provided, uses context.pop().
  final VoidCallback? onPressed;
  
  /// Whether to show the label text.
  /// Defaults to true.
  final bool showLabel;

  const BackButton({
    super.key,
    this.label = 'Back',
    this.onPressed,
    this.showLabel = true,
  });

  @override
  Widget build(BuildContext context) {
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;
    
    return CupertinoButton(
      padding: const EdgeInsets.only(left: 8),
      onPressed: onPressed ?? () => Navigator.of(context).pop(),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            CupertinoIcons.back,
            size: 20,
            color: AppTheme.getMutedForegroundColor(brightness),
          ),
          if (showLabel) ...[
            const SizedBox(width: 4),
            Text(
              label,
              style: TextStyle(color: AppTheme.getMutedForegroundColor(brightness)),
            ),
          ],
        ],
      ),
    );
  }
}

/// A scaffold wrapper for Layer 2+ screens that provides:
/// - Consistent back button in the app bar
/// - Proper safe area handling
/// 
/// For swipe-to-go-back functionality, use [SwipeablePageRoute] when navigating.
/// 
/// Usage:
/// ```dart
/// // Navigate with swipe support:
/// Navigator.of(context).push(
///   SwipeablePageRoute(
///     builder: (context) => LayerScaffold(
///       title: 'Details',
///       body: YourContent(),
///     ),
///   ),
/// );
/// ```
class LayerScaffold extends StatelessWidget {
  /// The title displayed in the app bar.
  final String? title;
  
  /// Optional widget for the title (overrides [title] string).
  final Widget? titleWidget;
  
  /// The main content of the screen.
  final Widget body;
  
  /// Optional actions to display in the app bar.
  final List<Widget>? actions;
  
  /// Optional custom back button label.
  final String backLabel;
  
  /// Whether to show the back button label.
  final bool showBackLabel;
  
  /// Optional floating action button.
  final Widget? floatingActionButton;
  
  /// Optional bottom navigation bar.
  final Widget? bottomNavigationBar;
  
  /// Whether the body should extend behind the app bar.
  final bool extendBodyBehindAppBar;
  
  /// Custom callback when back is pressed.
  /// If null, uses Navigator.pop().
  final VoidCallback? onBack;

  const LayerScaffold({
    super.key,
    this.title,
    this.titleWidget,
    required this.body,
    this.actions,
    this.backLabel = 'Back',
    this.showBackLabel = true,
    this.floatingActionButton,
    this.bottomNavigationBar,
    this.extendBodyBehindAppBar = false,
    this.onBack,
  });

  @override
  Widget build(BuildContext context) {
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;
    
    return CupertinoPageScaffold(
      backgroundColor: AppTheme.getBackgroundColor(brightness),
      navigationBar: CupertinoNavigationBar(
        backgroundColor: AppTheme.getBackgroundColor(brightness),
        border: null,
        leading: BackButton(
          label: backLabel,
          showLabel: showBackLabel,
          onPressed: onBack,
        ),
        middle: titleWidget ?? (title != null
            ? Text(
                title!,
                style: TextStyle(
                  color: AppTheme.getForegroundColor(brightness),
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                ),
              )
            : null),
        trailing: actions != null && actions!.isNotEmpty
            ? Row(
                mainAxisSize: MainAxisSize.min,
                children: actions!,
              )
            : null,
      ),
      child: SafeArea(
        top: false, // Navigation bar handles this
        child: Stack(
          children: [
            body,
            if (floatingActionButton != null)
              Positioned(
                right: 16,
                bottom: bottomNavigationBar != null ? 80 : 16,
                child: floatingActionButton!,
              ),
          ],
        ),
      ),
    );
  }
}

/// A page route that supports iOS-style swipe-to-go-back gesture.
/// 
/// Use this instead of [MaterialPageRoute] for all Layer 2+ screens
/// to enable swipe-right-to-dismiss functionality.
/// 
/// Usage:
/// ```dart
/// Navigator.of(context).push(
///   SwipeablePageRoute(
///     builder: (context) => YourScreen(),
///   ),
/// );
/// ```
class SwipeablePageRoute<T> extends CupertinoPageRoute<T> {
  SwipeablePageRoute({
    required super.builder,
    super.title,
    super.settings,
    super.maintainState,
    super.fullscreenDialog,
    super.allowSnapshotting,
    super.barrierDismissible,
  });

  @override
  bool get popGestureEnabled => true;

  // Use Material-style transitions but keep the swipe gesture
  @override
  Duration get transitionDuration => const Duration(milliseconds: 300);
  
  @override
  Duration get reverseTransitionDuration => const Duration(milliseconds: 300);
}
