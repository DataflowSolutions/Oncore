import 'package:flutter/cupertino.dart';
import '../../../theme/app_theme.dart';

/// Shows an import dialog for importing show data
Future<void> showImportDialog({
  required BuildContext context,
}) {
  final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;

  return showCupertinoModalPopup(
    context: context,
    builder: (context) => Container(
      decoration: BoxDecoration(
        color: AppTheme.getCardColor(brightness),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
      ),
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Import',
            style: TextStyle(
              color: AppTheme.getForegroundColor(brightness),
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Import advancing documents, itineraries, or show data files to quickly populate your show details.',
            style: TextStyle(
              color: AppTheme.getMutedForegroundColor(brightness),
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: CupertinoButton.filled(
              onPressed: () {
                Navigator.pop(context);
              },
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(CupertinoIcons.arrow_up_doc, color: CupertinoColors.white),
                  SizedBox(width: 8),
                  Text('Select File'),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: CupertinoButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
          ),
        ],
      ),
    ),
  );
}
