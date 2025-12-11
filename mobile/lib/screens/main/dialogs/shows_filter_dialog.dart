import 'package:flutter/cupertino.dart';
import '../../../theme/app_theme.dart';

/// Shows a filter dialog for shows list
Future<void> showShowsFilterDialog({
  required BuildContext context,
  required bool showPastShows,
  required ValueChanged<bool> onShowPastShowsChanged,
}) {
  final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;

  return showCupertinoModalPopup(
    context: context,
    builder: (context) => _ShowsFilterDialogContent(
      brightness: brightness,
      showPastShows: showPastShows,
      onShowPastShowsChanged: onShowPastShowsChanged,
    ),
  );
}

class _ShowsFilterDialogContent extends StatefulWidget {
  final Brightness brightness;
  final bool showPastShows;
  final ValueChanged<bool> onShowPastShowsChanged;

  const _ShowsFilterDialogContent({
    required this.brightness,
    required this.showPastShows,
    required this.onShowPastShowsChanged,
  });

  @override
  State<_ShowsFilterDialogContent> createState() => _ShowsFilterDialogContentState();
}

class _ShowsFilterDialogContentState extends State<_ShowsFilterDialogContent> {
  late bool _showPastShows;

  @override
  void initState() {
    super.initState();
    _showPastShows = widget.showPastShows;
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.getCardColor(widget.brightness),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
      ),
      padding: const EdgeInsets.all(24),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Filter Shows',
              style: TextStyle(
                color: AppTheme.getForegroundColor(widget.brightness),
                fontSize: 18,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Show past shows',
                  style: TextStyle(color: AppTheme.getForegroundColor(widget.brightness)),
                ),
                CupertinoSwitch(
                  value: _showPastShows,
                  onChanged: (value) {
                    setState(() => _showPastShows = value);
                    widget.onShowPastShowsChanged(value);
                  },
                ),
              ],
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: CupertinoButton.filled(
                onPressed: () => Navigator.pop(context),
                child: const Text('Done'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
