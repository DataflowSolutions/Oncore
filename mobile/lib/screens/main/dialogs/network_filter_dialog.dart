import 'package:flutter/cupertino.dart';

/// Shows a filter dialog for network members
Future<void> showNetworkFilterDialog({
  required BuildContext context,
  required String? currentFilter,
  required ValueChanged<String?> onFilterChanged,
}) {
  return showCupertinoModalPopup<void>(
    context: context,
    builder: (BuildContext context) => CupertinoActionSheet(
      title: const Text('Filter by Member Type'),
      actions: [
        _buildFilterOption(
          context: context,
          label: 'All Members',
          filterValue: null,
          currentFilter: currentFilter,
          onFilterChanged: onFilterChanged,
        ),
        _buildFilterOption(
          context: context,
          label: 'Artists',
          filterValue: 'artist',
          currentFilter: currentFilter,
          onFilterChanged: onFilterChanged,
        ),
        _buildFilterOption(
          context: context,
          label: 'Agents',
          filterValue: 'agent',
          currentFilter: currentFilter,
          onFilterChanged: onFilterChanged,
        ),
        _buildFilterOption(
          context: context,
          label: 'Managers',
          filterValue: 'manager',
          currentFilter: currentFilter,
          onFilterChanged: onFilterChanged,
        ),
        _buildFilterOption(
          context: context,
          label: 'Crew',
          filterValue: 'crew',
          currentFilter: currentFilter,
          onFilterChanged: onFilterChanged,
        ),
      ],
      cancelButton: CupertinoActionSheetAction(
        isDefaultAction: true,
        onPressed: () => Navigator.pop(context),
        child: const Text('Cancel'),
      ),
    ),
  );
}

CupertinoActionSheetAction _buildFilterOption({
  required BuildContext context,
  required String label,
  required String? filterValue,
  required String? currentFilter,
  required ValueChanged<String?> onFilterChanged,
}) {
  final isSelected = currentFilter == filterValue;

  return CupertinoActionSheetAction(
    onPressed: () {
      onFilterChanged(filterValue);
      Navigator.pop(context);
    },
    child: Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(label),
        if (isSelected) ...[
          const SizedBox(width: 8),
          const Icon(CupertinoIcons.check_mark, size: 18),
        ],
      ],
    ),
  );
}
