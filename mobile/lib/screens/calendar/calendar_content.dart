import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../models/show.dart';
import '../shows/shows_list_screen.dart';
import '../main/main_shell.dart' show saveLastShow;

/// Calendar content widget - just the calendar content, no shell/nav
/// Used inside MainShell for Layer 1 Shows calendar view
class CalendarContent extends ConsumerStatefulWidget {
  final String orgId;
  final String orgName;
  final void Function(String showId)? onShowSelected;

  const CalendarContent({
    super.key,
    required this.orgId,
    required this.orgName,
    this.onShowSelected,
  });

  @override
  ConsumerState<CalendarContent> createState() => _CalendarContentState();
}

class _CalendarContentState extends ConsumerState<CalendarContent> {
  late PageController _pageController;
  late DateTime _currentMonth;
  
  // We'll use a large number of pages with current month in the middle
  static const int _initialPage = 1200; // ~100 years in each direction

  @override
  void initState() {
    super.initState();
    _currentMonth = DateTime.now();
    _pageController = PageController(initialPage: _initialPage);
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  DateTime _getMonthFromPage(int page) {
    final difference = page - _initialPage;
    return DateTime(_currentMonth.year, _currentMonth.month + difference, 1);
  }

  void _onPageChanged(int page) {
    setState(() {
      // Update display month based on page
    });
  }

  @override
  Widget build(BuildContext context) {
    final showsAsync = ref.watch(showsByOrgProvider(widget.orgId));
    final colorScheme = Theme.of(context).colorScheme;

    return showsAsync.when(
      loading: () => Center(
        child: CircularProgressIndicator(color: colorScheme.onSurface),
      ),
      error: (error, stack) => _buildErrorState(colorScheme),
      data: (shows) => _buildCalendar(shows, colorScheme),
    );
  }

  Widget _buildErrorState(ColorScheme colorScheme) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error_outline, size: 48, color: colorScheme.onSurfaceVariant),
          const SizedBox(height: 16),
          Text('Failed to load shows', style: TextStyle(color: colorScheme.onSurfaceVariant)),
          const SizedBox(height: 12),
          TextButton(
            onPressed: () => ref.invalidate(showsByOrgProvider(widget.orgId)),
            child: Text('Retry', style: TextStyle(color: colorScheme.onSurface)),
          ),
        ],
      ),
    );
  }

  Widget _buildCalendar(List<Show> shows, ColorScheme colorScheme) {
    // Group shows by date string (YYYY-MM-DD)
    final showsByDate = <String, List<Show>>{};
    for (final show in shows) {
      final dateKey = '${show.date.year}-${show.date.month.toString().padLeft(2, '0')}-${show.date.day.toString().padLeft(2, '0')}';
      showsByDate.putIfAbsent(dateKey, () => []).add(show);
    }

    return PageView.builder(
      controller: _pageController,
      onPageChanged: _onPageChanged,
      itemBuilder: (context, page) {
        final monthDate = _getMonthFromPage(page);
        return _buildMonthView(monthDate, showsByDate, colorScheme);
      },
    );
  }

  Widget _buildMonthView(DateTime monthDate, Map<String, List<Show>> showsByDate, ColorScheme colorScheme) {
    final year = monthDate.year;
    final month = monthDate.month;
    
    // Get first day of month and days in month
    final firstDay = DateTime(year, month, 1);
    final lastDay = DateTime(year, month + 1, 0);
    final daysInMonth = lastDay.day;
    
    // Calculate Monday-based start (Monday = 0, Sunday = 6)
    final startingDayOfWeek = firstDay.weekday; // 1 = Monday, 7 = Sunday
    final mondayBasedStart = startingDayOfWeek - 1;
    
    // Previous month info
    final prevMonthLastDay = DateTime(year, month, 0).day;
    
    // Build calendar days
    final calendarDays = <_CalendarDay>[];
    
    // Add days from previous month
    for (int i = mondayBasedStart - 1; i >= 0; i--) {
      final day = prevMonthLastDay - i;
      final prevMonth = month == 1 ? 12 : month - 1;
      final prevYear = month == 1 ? year - 1 : year;
      calendarDays.add(_CalendarDay(
        day: day,
        isCurrentMonth: false,
        date: DateTime(prevYear, prevMonth, day),
      ));
    }
    
    // Add days of current month
    for (int day = 1; day <= daysInMonth; day++) {
      calendarDays.add(_CalendarDay(
        day: day,
        isCurrentMonth: true,
        date: DateTime(year, month, day),
      ));
    }
    
    // Add days from next month to complete grid (5 or 6 rows)
    final totalCells = calendarDays.length;
    final minRows = totalCells <= 35 ? 5 : 6;
    final targetCells = minRows * 7;
    final remainingCells = targetCells - totalCells;
    for (int day = 1; day <= remainingCells; day++) {
      final nextMonth = month == 12 ? 1 : month + 1;
      final nextYear = month == 12 ? year + 1 : year;
      calendarDays.add(_CalendarDay(
        day: day,
        isCurrentMonth: false,
        date: DateTime(nextYear, nextMonth, day),
      ));
    }
    
    final weekDays = ['Mon', 'Tues', 'Wedn', 'Thurs', 'Fri', 'Sat', 'Sun'];
    final monthName = _getMonthName(month);
    final rows = (calendarDays.length / 7).ceil();
    
    return Column(
      children: [
        // Month/Year header
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          child: Align(
            alignment: Alignment.centerLeft,
            child: Text(
              '$monthName $year',
              style: TextStyle(
                color: colorScheme.onSurface,
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ),
        // Week day headers
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8),
          child: Row(
            children: weekDays.map((day) => Expanded(
              child: Center(
                child: Text(
                  day,
                  style: TextStyle(
                    color: colorScheme.onSurfaceVariant,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            )).toList(),
          ),
        ),
        const SizedBox(height: 8),
        // Calendar grid
        Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: Column(
              children: List.generate(rows, (rowIndex) {
                final startIdx = rowIndex * 7;
                final rowDays = calendarDays.skip(startIdx).take(7).toList();
                return Expanded(
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: rowDays.map((dayInfo) {
                      final dateKey = '${dayInfo.date.year}-${dayInfo.date.month.toString().padLeft(2, '0')}-${dayInfo.date.day.toString().padLeft(2, '0')}';
                      final dayShows = showsByDate[dateKey] ?? [];
                      return Expanded(
                        child: _buildDayCell(dayInfo, dayShows, colorScheme),
                      );
                    }).toList(),
                  ),
                );
              }),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildDayCell(_CalendarDay dayInfo, List<Show> shows, ColorScheme colorScheme) {
    final now = DateTime.now();
    final isToday = dayInfo.date.year == now.year &&
        dayInfo.date.month == now.month &&
        dayInfo.date.day == now.day;

    return GestureDetector(
      onTap: shows.isNotEmpty ? () => _onDayTap(shows.first) : null,
      child: Container(
        decoration: BoxDecoration(
          border: Border(
            bottom: BorderSide(color: colorScheme.outline.withValues(alpha: 0.3), width: 0.5),
          ),
        ),
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Column(
          children: [
            // Day number
            Container(
              width: 28,
              height: 28,
              decoration: isToday
                  ? BoxDecoration(
                      color: colorScheme.onSurfaceVariant.withValues(alpha: 0.3),
                      borderRadius: BorderRadius.circular(14),
                    )
                  : null,
              child: Center(
                child: Text(
                  '${dayInfo.day}',
                  style: TextStyle(
                    color: dayInfo.isCurrentMonth
                        ? colorScheme.onSurface
                        : colorScheme.onSurfaceVariant.withValues(alpha: 0.4),
                    fontSize: 14,
                    fontWeight: dayInfo.isCurrentMonth ? FontWeight.w600 : FontWeight.normal,
                  ),
                ),
              ),
            ),
            // Shows for this day
            if (shows.isNotEmpty) ...[
              const SizedBox(height: 2),
              Expanded(
                child: ListView(
                  padding: EdgeInsets.zero,
                  physics: const NeverScrollableScrollPhysics(),
                  children: shows.take(3).map((show) => _buildShowBadge(show, colorScheme)).toList(),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  void _onDayTap(Show show) async {
    await saveLastShow(widget.orgId, show.id);
    if (widget.onShowSelected != null) {
      widget.onShowSelected!(show.id);
    } else if (mounted) {
      // Navigate to day view (Layer 2) - fallback if no callback
      context.push('/org/${widget.orgId}/shows/${show.id}/day');
    }
  }

  Widget _buildShowBadge(Show show, ColorScheme colorScheme) {
    return GestureDetector(
      onTap: () => _onDayTap(show),
      child: Container(
        margin: const EdgeInsets.only(bottom: 2, left: 2, right: 2),
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
        decoration: BoxDecoration(
          color: colorScheme.onSurfaceVariant.withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(4),
          border: Border.all(color: colorScheme.onSurfaceVariant.withValues(alpha: 0.3), width: 0.5),
        ),
        child: Text(
          show.venueCity ?? show.title,
          style: TextStyle(
            color: colorScheme.onSurface,
            fontSize: 8,
            fontWeight: FontWeight.w500,
          ),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
      ),
    );
  }

  String _getMonthName(int month) {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1];
  }
}

/// Helper class for calendar day data
class _CalendarDay {
  final int day;
  final bool isCurrentMonth;
  final DateTime date;

  _CalendarDay({
    required this.day,
    required this.isCurrentMonth,
    required this.date,
  });
}
