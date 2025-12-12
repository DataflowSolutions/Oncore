import 'package:flutter/cupertino.dart';
import '../../../theme/app_theme.dart';
import '../../../components/cupertino_components.dart' as oc;

class ShowsFilters {
  final Set<String> artists;
  final Set<String> shows;
  final Set<String> venues;
  final Set<String> cities;
  final Set<String> countries;
  final DateTime? fromDate;
  final DateTime? toDate;

  const ShowsFilters({
    this.artists = const {},
    this.shows = const {},
    this.venues = const {},
    this.cities = const {},
    this.countries = const {},
    this.fromDate,
    this.toDate,
  });

  factory ShowsFilters.defaults() => const ShowsFilters();

  bool get isActive {
    return artists.isNotEmpty ||
        shows.isNotEmpty ||
        venues.isNotEmpty ||
        cities.isNotEmpty ||
        countries.isNotEmpty ||
        fromDate != null ||
        toDate != null;
  }

  ShowsFilters copyWith({
    Set<String>? artists,
    Set<String>? shows,
    Set<String>? venues,
    Set<String>? cities,
    Set<String>? countries,
    DateTime? fromDate,
    DateTime? toDate,
    bool clearFromDate = false,
    bool clearToDate = false,
    bool clearAllValues = false,
  }) {
    return ShowsFilters(
      artists: clearAllValues ? const {} : (artists ?? this.artists),
      shows: clearAllValues ? const {} : (shows ?? this.shows),
      venues: clearAllValues ? const {} : (venues ?? this.venues),
      cities: clearAllValues ? const {} : (cities ?? this.cities),
      countries: clearAllValues ? const {} : (countries ?? this.countries),
      fromDate: clearFromDate ? null : (fromDate ?? this.fromDate),
      toDate: clearToDate ? null : (toDate ?? this.toDate),
    );
  }
}

/// Shows a filter dialog for shows list
Future<void> showShowsFilterDialog({
  required BuildContext context,
  required List<String> availableArtists,
  required List<String> availableShows,
  required List<String> availableVenues,
  required List<String> availableCities,
  required List<String> availableCountries,
  required ShowsFilters filters,
  required ValueChanged<ShowsFilters> onFiltersChanged,
}) {
  final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;

  return showCupertinoModalPopup(
    context: context,
    builder: (context) => _ShowsFilterDialogContent(
      brightness: brightness,
      availableArtists: availableArtists,
      availableShows: availableShows,
      availableVenues: availableVenues,
      availableCities: availableCities,
      availableCountries: availableCountries,
      initialFilters: filters,
      onFiltersChanged: onFiltersChanged,
    ),
  );
}

class _ShowsFilterDialogContent extends StatefulWidget {
  final Brightness brightness;
  final List<String> availableArtists;
  final List<String> availableShows;
  final List<String> availableVenues;
  final List<String> availableCities;
  final List<String> availableCountries;
  final ShowsFilters initialFilters;
  final ValueChanged<ShowsFilters> onFiltersChanged;

  const _ShowsFilterDialogContent({
    required this.brightness,
    required this.availableArtists,
    required this.availableShows,
    required this.availableVenues,
    required this.availableCities,
    required this.availableCountries,
    required this.initialFilters,
    required this.onFiltersChanged,
  });

  @override
  State<_ShowsFilterDialogContent> createState() => _ShowsFilterDialogContentState();
}

class _ShowsFilterDialogContentState extends State<_ShowsFilterDialogContent> {
  late ShowsFilters _filters;

  @override
  void initState() {
    super.initState();
    _filters = widget.initialFilters;
  }

  String _formatDate(DateTime date) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return '${months[date.month - 1]} ${date.day}, ${date.year}';
  }

  Future<void> _pickDate({
    required DateTime? initial,
    required ValueChanged<DateTime> onPicked,
  }) async {
    DateTime temp = initial ?? DateTime.now();
    await showCupertinoModalPopup<void>(
      context: context,
      builder: (context) => Container(
        height: 300,
        color: AppTheme.getCardColor(widget.brightness),
        child: SafeArea(
          top: false,
          child: Column(
            children: [
              Align(
                alignment: Alignment.centerRight,
                child: CupertinoButton(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  onPressed: () {
                    onPicked(temp);
                    Navigator.pop(context);
                  },
                  child: const Text('Done'),
                ),
              ),
              Expanded(
                child: CupertinoDatePicker(
                  mode: CupertinoDatePickerMode.date,
                  initialDateTime: temp,
                  onDateTimeChanged: (d) => temp = d,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _updateFilters(ShowsFilters next) {
    setState(() => _filters = next);
    widget.onFiltersChanged(next);
  }

  Future<void> _openMultiSelect({
    required String title,
    required List<String> options,
    required Set<String> selected,
    required ValueChanged<Set<String>> onChanged,
  }) async {
    await Navigator.of(context).push(
      CupertinoPageRoute<void>(
        builder: (context) => _MultiSelectPickerScreen(
          title: title,
          options: options,
          selected: selected,
          brightness: widget.brightness,
          onChanged: onChanged,
        ),
      ),
    );
  }

  Set<String> _toggle(Set<String> current, String value) {
    final next = <String>{...current};
    if (next.contains(value)) {
      next.remove(value);
    } else {
      next.add(value);
    }
    return next;
  }

  @override
  Widget build(BuildContext context) {
    final background = AppTheme.getBackgroundColor(widget.brightness);
    final sheetColor = AppTheme.getCardColor(widget.brightness);

    return FractionallySizedBox(
      heightFactor: 0.92,
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
                  title: 'Filters',
                  showClear: _filters.isActive,
                  onClear: () => _updateFilters(
                    _filters.copyWith(clearAllValues: true, clearFromDate: true, clearToDate: true),
                  ),
                  onDone: () => Navigator.pop(context),
                ),
                Expanded(
                  child: CupertinoScrollbar(
                    child: ListView(
                      padding: const EdgeInsets.only(bottom: 24),
                      children: [
                        const SizedBox(height: 8),
                        oc.CupertinoSectionHeader(title: 'Date span', padding: const EdgeInsets.fromLTRB(16, 12, 16, 8)),
                        oc.CupertinoCard(
                          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 0),
                          padding: EdgeInsets.zero,
                          backgroundColor: sheetColor,
                          child: Column(
                            children: [
                              oc.CupertinoListTile(
                                title: const Text('From'),
                                trailing: _ValueChevron(
                                  brightness: widget.brightness,
                                  value: _filters.fromDate == null ? 'Any' : _formatDate(_filters.fromDate!),
                                ),
                                onTap: () => _pickDate(
                                  initial: _filters.fromDate,
                                  onPicked: (d) => _updateFilters(_filters.copyWith(fromDate: d)),
                                ),
                              ),
                              const oc.CupertinoDivider(indent: 16),
                              oc.CupertinoListTile(
                                title: const Text('To'),
                                trailing: _ValueChevron(
                                  brightness: widget.brightness,
                                  value: _filters.toDate == null ? 'Any' : _formatDate(_filters.toDate!),
                                ),
                                onTap: () => _pickDate(
                                  initial: _filters.toDate,
                                  onPicked: (d) => _updateFilters(_filters.copyWith(toDate: d)),
                                ),
                              ),
                              if (_filters.fromDate != null || _filters.toDate != null) ...[
                                const oc.CupertinoDivider(indent: 16),
                                oc.CupertinoListTile(
                                  title: Text(
                                    'Clear date span',
                                    style: TextStyle(color: AppTheme.getPrimaryColor(widget.brightness)),
                                  ),
                                  onTap: () => _updateFilters(
                                    _filters.copyWith(clearFromDate: true, clearToDate: true),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),

                        oc.CupertinoSectionHeader(title: 'Filters', padding: const EdgeInsets.fromLTRB(16, 18, 16, 8)),
                        oc.CupertinoCard(
                          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 0),
                          padding: EdgeInsets.zero,
                          backgroundColor: sheetColor,
                          child: Column(
                            children: [
                              if (widget.availableArtists.isNotEmpty) ...[
                                oc.CupertinoListTile(
                                  title: const Text('Artists'),
                                  trailing: _ValueChevron(
                                    brightness: widget.brightness,
                                    value: _filters.artists.isEmpty ? 'All' : '${_filters.artists.length} selected',
                                  ),
                                  onTap: () => _openMultiSelect(
                                    title: 'Artists',
                                    options: widget.availableArtists,
                                    selected: _filters.artists,
                                    onChanged: (next) => _updateFilters(_filters.copyWith(artists: next)),
                                  ),
                                ),
                                const oc.CupertinoDivider(indent: 16),
                              ],
                              if (widget.availableShows.isNotEmpty) ...[
                                oc.CupertinoListTile(
                                  title: const Text('Show name'),
                                  trailing: _ValueChevron(
                                    brightness: widget.brightness,
                                    value: _filters.shows.isEmpty ? 'All' : '${_filters.shows.length} selected',
                                  ),
                                  onTap: () => _openMultiSelect(
                                    title: 'Show name',
                                    options: widget.availableShows,
                                    selected: _filters.shows,
                                    onChanged: (next) => _updateFilters(_filters.copyWith(shows: next)),
                                  ),
                                ),
                                const oc.CupertinoDivider(indent: 16),
                              ],
                              if (widget.availableVenues.isNotEmpty) ...[
                                oc.CupertinoListTile(
                                  title: const Text('Venue name'),
                                  trailing: _ValueChevron(
                                    brightness: widget.brightness,
                                    value: _filters.venues.isEmpty ? 'All' : '${_filters.venues.length} selected',
                                  ),
                                  onTap: () => _openMultiSelect(
                                    title: 'Venue name',
                                    options: widget.availableVenues,
                                    selected: _filters.venues,
                                    onChanged: (next) => _updateFilters(_filters.copyWith(venues: next)),
                                  ),
                                ),
                                const oc.CupertinoDivider(indent: 16),
                              ],
                              if (widget.availableCities.isNotEmpty) ...[
                                oc.CupertinoListTile(
                                  title: const Text('City'),
                                  trailing: _ValueChevron(
                                    brightness: widget.brightness,
                                    value: _filters.cities.isEmpty ? 'All' : '${_filters.cities.length} selected',
                                  ),
                                  onTap: () => _openMultiSelect(
                                    title: 'City',
                                    options: widget.availableCities,
                                    selected: _filters.cities,
                                    onChanged: (next) => _updateFilters(_filters.copyWith(cities: next)),
                                  ),
                                ),
                                const oc.CupertinoDivider(indent: 16),
                              ],
                              if (widget.availableCountries.isNotEmpty) ...[
                                oc.CupertinoListTile(
                                  title: const Text('Country'),
                                  trailing: _ValueChevron(
                                    brightness: widget.brightness,
                                    value: _filters.countries.isEmpty ? 'All' : '${_filters.countries.length} selected',
                                  ),
                                  onTap: () => _openMultiSelect(
                                    title: 'Country',
                                    options: widget.availableCountries,
                                    selected: _filters.countries,
                                    onChanged: (next) => _updateFilters(_filters.copyWith(countries: next)),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                      ],
                    ),
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

class _MultiSelectPickerScreen extends StatefulWidget {
  final String title;
  final List<String> options;
  final Set<String> selected;
  final Brightness brightness;
  final ValueChanged<Set<String>> onChanged;

  const _MultiSelectPickerScreen({
    required this.title,
    required this.options,
    required this.selected,
    required this.brightness,
    required this.onChanged,
  });

  @override
  State<_MultiSelectPickerScreen> createState() => _MultiSelectPickerScreenState();
}

class _MultiSelectPickerScreenState extends State<_MultiSelectPickerScreen> {
  late Set<String> _selected;
  String _query = '';

  @override
  void initState() {
    super.initState();
    _selected = <String>{...widget.selected};
  }

  void _toggleValue(String value) {
    final next = <String>{..._selected};
    if (next.contains(value)) {
      next.remove(value);
    } else {
      next.add(value);
    }
    setState(() => _selected = next);
    widget.onChanged(next);
  }

  @override
  Widget build(BuildContext context) {
    final background = AppTheme.getBackgroundColor(widget.brightness);
    final sheetColor = AppTheme.getCardColor(widget.brightness);
    final filtered = _query.trim().isEmpty
        ? widget.options
        : widget.options
            .where((o) => o.toLowerCase().contains(_query.trim().toLowerCase()))
            .toList();

    return CupertinoPageScaffold(
      backgroundColor: background,
      navigationBar: CupertinoNavigationBar(
        middle: Text(widget.title),
        trailing: _selected.isEmpty
            ? null
            : CupertinoButton(
                padding: EdgeInsets.zero,
                onPressed: () {
                  setState(() => _selected = const {});
                  widget.onChanged(const {});
                },
                child: const Text('Clear'),
              ),
      ),
      child: SafeArea(
        bottom: false,
        child: ListView(
          padding: const EdgeInsets.only(top: 12, bottom: 24),
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: CupertinoSearchTextField(
                onChanged: (v) => setState(() => _query = v),
              ),
            ),
            const SizedBox(height: 12),
            oc.CupertinoCard(
              margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 0),
              padding: EdgeInsets.zero,
              backgroundColor: sheetColor,
              child: Column(
                children: [
                  for (int i = 0; i < filtered.length; i++) ...[
                    oc.CupertinoListTile(
                      title: Text(filtered[i]),
                      trailing: _selected.contains(filtered[i])
                          ? Icon(
                              CupertinoIcons.check_mark,
                              size: 18,
                              color: AppTheme.getForegroundColor(widget.brightness),
                            )
                          : const SizedBox.shrink(),
                      onTap: () => _toggleValue(filtered[i]),
                    ),
                    if (i != filtered.length - 1) const oc.CupertinoDivider(indent: 16),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
