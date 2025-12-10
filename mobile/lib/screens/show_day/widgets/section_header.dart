import 'package:flutter/cupertino.dart';
import '../../../theme/app_theme.dart';

/// Section header widget for day view sections
class SectionHeader extends StatelessWidget {
  final String title;
  final String? actionLabel;
  final VoidCallback? onAction;

  const SectionHeader({
    super.key,
    required this.title,
    this.actionLabel,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;
    
    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: 24,
        vertical: 8,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            title,
            style: TextStyle(
              color: AppTheme.getForegroundColor(brightness),
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
          if (actionLabel != null && onAction != null)
            GestureDetector(
              onTap: onAction,
              child: Text(
                actionLabel!,
                style: TextStyle(
                  color: AppTheme.getPrimaryColor(brightness),
                  fontSize: 12,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Horizontal scroll list for cards like flights
class HorizontalCardList extends StatefulWidget {
  final List<Widget> children;
  final double height;
  final EdgeInsets padding;

  const HorizontalCardList({
    super.key,
    required this.children,
    this.height = 120,
    this.padding = const EdgeInsets.symmetric(horizontal: 16),
  });

  @override
  State<HorizontalCardList> createState() => _HorizontalCardListState();
}

class _HorizontalCardListState extends State<HorizontalCardList> {
  final ScrollController _scrollController = ScrollController();

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;
    
    return SizedBox(
      height: widget.height,
      child: CupertinoScrollbar(
        controller: _scrollController,
        thumbVisibility: true,
        thickness: 3,
        radius: const Radius.circular(4),
        child: ListView.separated(
          controller: _scrollController,
          scrollDirection: Axis.horizontal,
          padding: widget.padding,
          itemCount: widget.children.length,
          separatorBuilder: (context, index) => const SizedBox(width: 16),
          itemBuilder: (context, index) => widget.children[index],
        ),
      ),
    );
  }
}
