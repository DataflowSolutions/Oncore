import 'package:flutter/cupertino.dart';
import '../../../theme/app_theme.dart';
import '../../../components/cupertino_components.dart' as oc;

/// Shows a filter dialog for network team (role)
Future<void> showNetworkTeamRoleFilterDialog({
  required BuildContext context,
  required String? currentFilter,
  required ValueChanged<String?> onFilterChanged,
}) {
  return showCupertinoModalPopup<void>(
    context: context,
    builder: (BuildContext context) => CupertinoActionSheet(
      title: const Text('Filter by Role'),
      actions: [
        _buildFilterOption(
          context: context,
          label: 'All Roles',
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
          label: 'Owner',
          filterValue: 'owner',
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

/// Country/city filter dialog for promoters/venues.
Future<void> showNetworkLocationFilterDialog({
  required BuildContext context,
  required String title,
  required List<String> availableCountries,
  required List<String> availableCities,
  required String? currentCountry,
  required String? currentCity,
  required void Function({String? country, String? city}) onChanged,
}) {
  final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;

  return showCupertinoModalPopup<void>(
    context: context,
    builder: (context) => _NetworkLocationFilterContent(
      brightness: brightness,
      title: title,
      availableCountries: availableCountries,
      availableCities: availableCities,
      currentCountry: currentCountry,
      currentCity: currentCity,
      onChanged: onChanged,
    ),
  );
}

class _NetworkLocationFilterContent extends StatefulWidget {
  final Brightness brightness;
  final String title;
  final List<String> availableCountries;
  final List<String> availableCities;
  final String? currentCountry;
  final String? currentCity;
  final void Function({String? country, String? city}) onChanged;

  const _NetworkLocationFilterContent({
    required this.brightness,
    required this.title,
    required this.availableCountries,
    required this.availableCities,
    required this.currentCountry,
    required this.currentCity,
    required this.onChanged,
  });

  @override
  State<_NetworkLocationFilterContent> createState() => _NetworkLocationFilterContentState();
}

class _NetworkLocationFilterContentState extends State<_NetworkLocationFilterContent> {
  String? _country;
  String? _city;

  @override
  void initState() {
    super.initState();
    _country = widget.currentCountry;
    _city = widget.currentCity;
  }

  void _emit() {
    widget.onChanged(country: _country, city: _city);
  }

  Future<void> _pickFromActionSheet({
    required String title,
    required List<String> options,
    required String? selected,
    required ValueChanged<String?> onSelected,
  }) async {
    await showCupertinoModalPopup<void>(
      context: context,
      builder: (context) => CupertinoActionSheet(
        title: Text(title),
        actions: [
          CupertinoActionSheetAction(
            onPressed: () {
              onSelected(null);
              Navigator.pop(context);
            },
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text('All'),
                if (selected == null) ...[
                  const SizedBox(width: 8),
                  const Icon(CupertinoIcons.check_mark, size: 18),
                ],
              ],
            ),
          ),
          ...options.map(
            (o) => CupertinoActionSheetAction(
              onPressed: () {
                onSelected(o);
                Navigator.pop(context);
              },
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(o),
                  if (selected?.toLowerCase() == o.toLowerCase()) ...[
                    const SizedBox(width: 8),
                    const Icon(CupertinoIcons.check_mark, size: 18),
                  ],
                ],
              ),
            ),
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

  @override
  Widget build(BuildContext context) {
    final background = AppTheme.getBackgroundColor(widget.brightness);
    final sheetColor = AppTheme.getCardColor(widget.brightness);

    return FractionallySizedBox(
      heightFactor: 0.55,
      child: ClipRRect(
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        child: Container(
          color: background,
          child: SafeArea(
            top: false,
            child: Column(
              children: [
                _SheetHeader(
                  brightness: widget.brightness,
                  title: widget.title,
                  showClear: _country != null || _city != null,
                  onClear: () {
                    setState(() {
                      _country = null;
                      _city = null;
                    });
                    _emit();
                  },
                  onDone: () => Navigator.pop(context),
                ),
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.only(bottom: 24),
                    children: [
                      const SizedBox(height: 8),
                      oc.CupertinoSectionHeader(title: 'Location', padding: const EdgeInsets.fromLTRB(16, 12, 16, 8)),
                      oc.CupertinoCard(
                        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 0),
                        padding: EdgeInsets.zero,
                        backgroundColor: sheetColor,
                        child: Column(
                          children: [
                            oc.CupertinoListTile(
                              title: const Text('Country'),
                              trailing: _ValueChevron(
                                brightness: widget.brightness,
                                value: _country ?? 'All',
                              ),
                              onTap: () => _pickFromActionSheet(
                                title: 'Country',
                                options: widget.availableCountries,
                                selected: _country,
                                onSelected: (v) {
                                  setState(() => _country = v);
                                  _emit();
                                },
                              ),
                            ),
                            const oc.CupertinoDivider(indent: 16),
                            oc.CupertinoListTile(
                              title: const Text('City'),
                              trailing: _ValueChevron(
                                brightness: widget.brightness,
                                value: _city ?? 'All',
                              ),
                              onTap: () => _pickFromActionSheet(
                                title: 'City',
                                options: widget.availableCities,
                                selected: _city,
                                onSelected: (v) {
                                  setState(() => _city = v);
                                  _emit();
                                },
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _SheetHeader extends StatelessWidget {
  final Brightness brightness;
  final String title;
  final bool showClear;
  final VoidCallback onClear;
  final VoidCallback onDone;

  const _SheetHeader({
    required this.brightness,
    required this.title,
    required this.showClear,
    required this.onClear,
    required this.onDone,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppTheme.getCardColor(brightness),
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 10),
      child: Row(
        children: [
          SizedBox(
            width: 80,
            child: showClear
                ? Align(
                    alignment: Alignment.centerLeft,
                    child: CupertinoButton(
                      padding: EdgeInsets.zero,
                      onPressed: onClear,
                      child: Text(
                        'Clear',
                        style: TextStyle(color: AppTheme.getPrimaryColor(brightness)),
                      ),
                    ),
                  )
                : null,
          ),
          Expanded(
            child: Center(
              child: Text(
                title,
                style: TextStyle(
                  color: AppTheme.getForegroundColor(brightness),
                  fontSize: 17,
                  fontWeight: FontWeight.w600,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ),
          SizedBox(
            width: 80,
            child: Align(
              alignment: Alignment.centerRight,
              child: CupertinoButton(
                padding: EdgeInsets.zero,
                onPressed: onDone,
                child: Text(
                  'Done',
                  style: TextStyle(color: AppTheme.getPrimaryColor(brightness)),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ValueChevron extends StatelessWidget {
  final Brightness brightness;
  final String value;

  const _ValueChevron({
    required this.brightness,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          value,
          style: TextStyle(color: AppTheme.getMutedForegroundColor(brightness)),
        ),
        const SizedBox(width: 6),
        Icon(
          CupertinoIcons.chevron_forward,
          size: 16,
          color: AppTheme.getMutedForegroundColor(brightness),
        ),
      ],
    );
  }
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
