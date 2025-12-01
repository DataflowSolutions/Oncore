import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../models/show.dart';
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
  
  // Colors matching web dark theme
  static const _background = Color(0xFF000000);
  static const _foreground = Color(0xFFF0F0F0);
  static const _muted = Color(0xFFA3A3A3);
  static const _inputBg = Color(0xFF282828);
  static const _border = Color(0xFF262626);

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

    return Scaffold(
      backgroundColor: _background,
      body: SafeArea(
        child: Column(
          children: [
            _buildTopBar(),
            Expanded(
              child: showsAsync.when(
                loading: () => const Center(
                  child: CircularProgressIndicator(color: _foreground),
                ),
                error: (error, stack) => _buildErrorState(),
                data: (shows) => _buildCalendar(shows),
              ),
            ),
            _buildBottomSection(),
          ],
        ),
      ),
    );
  }

  Widget _buildTopBar() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      child: Row(
        children: [
          // Left: Profile icon
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: _muted, width: 1.5),
            ),
            child: const Icon(Icons.person_outline, color: _foreground, size: 20),
          ),
          // Center: View toggle (list/calendar)
          Expanded(
            child: Center(
              child: Container(
                decoration: BoxDecoration(
                  color: _inputBg,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _buildToggle(Icons.format_list_bulleted, false, () {
                      context.go('/org/${widget.orgId}/shows', extra: widget.orgName);
                    }),
                    _buildToggle(Icons.calendar_today_outlined, true, () {
                      // Already on calendar
                    }),
                  ],
                ),
              ),
            ),
          ),
          // Right: Settings icon
          const Icon(Icons.settings_outlined, color: _foreground, size: 22),
        ],
      ),
    );
  }

  Widget _buildToggle(IconData icon, bool isSelected, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 40,
        height: 32,
        decoration: BoxDecoration(
          color: isSelected ? _foreground : Colors.transparent,
          borderRadius: BorderRadius.circular(6),
        ),
        child: Icon(
          icon,
          color: isSelected ? _background : _muted,
          size: 18,
        ),
      ),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, size: 48, color: _muted),
          const SizedBox(height: 16),
          const Text('Failed to load shows', style: TextStyle(color: _muted)),
          const SizedBox(height: 12),
          TextButton(
            onPressed: () => ref.invalidate(showsByOrgProvider(widget.orgId)),
            child: const Text('Retry', style: TextStyle(color: _foreground)),
          ),
        ],
      ),
    );
  }

  Widget _buildCalendar(List<Show> shows) {
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
        return _buildMonthView(monthDate, showsByDate);
      },
    );
  }

  Widget _buildMonthView(DateTime monthDate, Map<String, List<Show>> showsByDate) {
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
              style: const TextStyle(
                color: _foreground,
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
                  style: const TextStyle(
                    color: _muted,
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
                        child: _buildDayCell(dayInfo, dayShows),
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

  Widget _buildDayCell(_CalendarDay dayInfo, List<Show> shows) {
    final now = DateTime.now();
    final isToday = dayInfo.date.year == now.year &&
        dayInfo.date.month == now.month &&
        dayInfo.date.day == now.day;

    return Container(
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(color: _border.withOpacity(0.3), width: 0.5),
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
                    color: _muted.withOpacity(0.3),
                    borderRadius: BorderRadius.circular(14),
                  )
                : null,
            child: Center(
              child: Text(
                '${dayInfo.day}',
                style: TextStyle(
                  color: dayInfo.isCurrentMonth
                      ? (isToday ? _foreground : _foreground)
                      : _muted.withOpacity(0.4),
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
                children: shows.take(3).map((show) => _buildShowBadge(show)).toList(),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildShowBadge(Show show) {
    return Container(
      margin: const EdgeInsets.only(bottom: 2, left: 2, right: 2),
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
      decoration: BoxDecoration(
        color: _muted.withOpacity(0.15),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: _muted.withOpacity(0.3), width: 0.5),
      ),
      child: Text(
        show.venueCity ?? show.title,
        style: const TextStyle(
          color: _foreground,
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

  Widget _buildBottomSection() {
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
                    color: _inputBg,
                    borderRadius: BorderRadius.circular(24),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.search, color: _muted, size: 20),
                      SizedBox(width: 12),
                      Text(
                        'Search',
                        style: TextStyle(color: _muted, fontSize: 15),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 12),
              const Icon(Icons.tune, color: _muted, size: 22),
              const SizedBox(width: 12),
              // Add button
              GestureDetector(
                onTap: () => showCreateShowModal(context, widget.orgId),
                child: Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: _foreground,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Icon(Icons.add, color: _background, size: 24),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          // Bottom navigation
          _buildBottomNav(),
        ],
      ),
    );
  }

  Widget _buildBottomNav() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        color: _inputBg,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          _buildNavItem(Icons.play_arrow_outlined, 'Day', false, () {
            context.go('/org/${widget.orgId}/shows', extra: widget.orgName);
          }),
          _buildNavItem(Icons.format_list_bulleted, 'Shows', true, () {
            context.go('/org/${widget.orgId}/shows', extra: widget.orgName);
          }),
          _buildNavItem(Icons.people_outline, 'Network', false, () {
            context.go('/org/${widget.orgId}/shows', extra: widget.orgName);
          }),
        ],
      ),
    );
  }

  Widget _buildNavItem(IconData icon, String label, bool isSelected, VoidCallback onTap) {
    final color = isSelected ? _foreground : _muted;

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
