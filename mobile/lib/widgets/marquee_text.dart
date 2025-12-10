import 'package:flutter/cupertino.dart';

/// A text widget that displays with a fade on the right when content overflows
class MarqueeText extends StatefulWidget {
  final String text;
  final TextStyle? style;
  final int maxLines;
  final TextAlign textAlign;

  const MarqueeText(
    this.text, {
    super.key,
    this.style,
    this.maxLines = 1,
    this.textAlign = TextAlign.start,
  });

  @override
  State<MarqueeText> createState() => _MarqueeTextState();
}

class _MarqueeTextState extends State<MarqueeText> {
  bool _isOverflowing = false;
  double _containerWidth = 0;
  double _textWidth = 0;

  void _checkOverflow(double containerWidth) {
    if (containerWidth == 0) return;

    final textPainter = TextPainter(
      text: TextSpan(text: widget.text, style: widget.style),
      maxLines: widget.maxLines,
      textDirection: TextDirection.ltr,
    )..layout(maxWidth: double.infinity);

    final textWidth = textPainter.width;
    final overflow = textWidth > containerWidth;

    if (_containerWidth != containerWidth || _textWidth != textWidth) {
      _containerWidth = containerWidth;
      _textWidth = textWidth;

      if (mounted) {
        setState(() {
          _isOverflowing = overflow;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final maxWidth = constraints.maxWidth;

        // Check for overflow after build
        WidgetsBinding.instance.addPostFrameCallback((_) {
          _checkOverflow(maxWidth);
        });

        if (!_isOverflowing || maxWidth == 0) {
          return Text(
            widget.text,
            style: widget.style,
            maxLines: widget.maxLines,
            overflow: TextOverflow.ellipsis,
            textAlign: widget.textAlign,
          );
        }

        // Show text with fade on the right edge
        return ClipRect(
          child: ShaderMask(
            shaderCallback: (Rect bounds) {
              return const LinearGradient(
                begin: Alignment.centerLeft,
                end: Alignment.centerRight,
                colors: [
                  Color(0xFF000000),
                  Color(0xFF000000),
                  Color(0x00000000),
                ],
                stops: [0.0, 0.85, 1.0],
              ).createShader(bounds);
            },
            blendMode: BlendMode.dstIn,
            child: Text(
              widget.text,
              style: widget.style,
              maxLines: widget.maxLines,
              overflow: TextOverflow.clip,
              softWrap: false,
              textAlign: widget.textAlign,
            ),
          ),
        );
      },
    );
  }
}
