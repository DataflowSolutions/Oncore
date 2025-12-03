import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../models/show.dart';
import '../../components/profile_dropdown.dart';
import '../shows/shows_list_screen.dart';
import '../shows/create_show_modal.dart';

/// Calendar screen - month view with swipeable months
class CalendarScreen extends ConsumerStatefulWidget {
  final String orgId;
  final String orgName;

  const CalendarScreen({
    super.key,
    required this.orgId,
    required this.orgName,
  });

  @override
  ConsumerState<CalendarScreen> createState() => _CalendarScreenState();
}

class _CalendarScreenState extends ConsumerState<CalendarScreen> {
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

    return Scaffold(
      backgroundColor: colorScheme.surface,
      body: SafeArea(
        child: Column(
          children: [
            _buildTopBar(colorScheme),
            Expanded(
              child: showsAsync.when(
                loading: () => Center(
                  child: CircularProgressIndicator(color: colorScheme.onSurface),
                ),
                error: (error, stack) => _buildErrorState(colorScheme),
                data: (shows) => _buildCalendar(shows, colorScheme),
              ),
            ),
            _buildBottomSection(colorScheme),
          ],
        ),
      ),
    );
  }

  Widget _buildTopBar(ColorScheme colorScheme) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      child: Row(
        children: [
          // Left: Profile icon (tappable)
          GestureDetector(
            onTap: () => ProfileDropdown.show(context, ref),
            child: Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: colorScheme.onSurfaceVariant, width: 1.5),
              ),
              child: Icon(Icons.person_outline, color: colorScheme.onSurface, size: 20),
            ),
          ),
          // Center: View toggle (list/calendar)
          Expanded(
            child: Center(
              child: Container(
                decoration: BoxDecoration(
                  color: colorScheme.surfaceContainerHigh,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _buildToggle(Icons.format_list_bulleted, false, colorScheme, () {
                      context.go('/org/${widget.orgId}/shows', extra: widget.orgName);
                    }),
                    _buildToggle(Icons.calendar_today_outlined, true, colorScheme, () {
                      // Already on calendar
                    }),
                  ],
                ),
              ),
            ),
          ),
          // Right: Settings icon
          Icon(Icons.settings_outlined, color: colorScheme.onSurface, size: 22),
        ],
      ),
    );
  }

  Widget _buildToggle(IconData icon, bool isSelected, ColorScheme colorScheme, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 40,
        height: 32,
        decoration: BoxDecoration(
          color: isSelected ? colorScheme.onSurface : Colors.transparent,
          borderRadius: BorderRadius.circular(6),
        ),
        child: Icon(
          icon,
          color: isSelected ? colorScheme.surface : colorScheme.onSurfaceVariant,
          size: 18,
        ),
      ),
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

    return Container(
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
    );
  }

  Widget _buildShowBadge(Show show, ColorScheme colorScheme) {
    return Container(
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
    );
  }

  String _getMonthName(int month) {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1];
  }

  Widget _buildBottomSection(ColorScheme colorScheme) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Search row with filter and add button
          Row(
            children: [
              Expanded(
                child: Container(
                  height: 48,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  decoration: BoxDecoration(
                    color: colorScheme.surfaceContainerHigh,
                    borderRadius: BorderRadius.circular(24),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.search, color: colorScheme.onSurfaceVariant, size: 20),
                      const SizedBox(width: 12),
                      Text(
                        'Search',
                        style: TextStyle(color: colorScheme.onSurfaceVariant, fontSize: 15),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Icon(Icons.tune, color: colorScheme.onSurfaceVariant, size: 22),
              const SizedBox(width: 12),
              // Add button
              GestureDetector(
                onTap: () => showCreateShowModal(context, widget.orgId),
                child: Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: colorScheme.onSurface,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Icon(Icons.add, color: colorScheme.surface, size: 24),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          // Bottom navigation
          _buildBottomNav(colorScheme),
        ],
      ),
    );
  }

  Widget _buildBottomNav(ColorScheme colorScheme) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHigh,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          _buildNavItem(Icons.play_arrow_outlined, 'Day', false, () {
            context.go('/org/${widget.orgId}/shows', extra: widget.orgName);
          }, colorScheme),
          _buildNavItem(Icons.format_list_bulleted, 'Shows', true, () {
            context.go('/org/${widget.orgId}/shows', extra: widget.orgName);
          }, colorScheme),
          _buildNavItem(Icons.people_outline, 'Network', false, () {
            context.go('/org/${widget.orgId}/shows', extra: widget.orgName);
          }, colorScheme),
        ],
      ),
    );
  }

  Widget _buildNavItem(IconData icon, String label, bool isSelected, VoidCallback onTap, ColorScheme colorScheme) {
    final color = isSelected ? colorScheme.onSurface : colorScheme.onSurfaceVariant;

    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                color: color,
                fontSize: 14,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
              ),
            ),
          ],
        ),
      ),
    );
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
