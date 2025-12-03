import 'package:flutter/material.dart';
import '../../../components/components.dart';
import '../../../models/show_day.dart';
import 'detail_modal.dart';

/// Full schedule screen showing a timeline view of all schedule items
/// Similar to the desktop ScheduleTimeline component
class FullScheduleScreen extends StatefulWidget {
  final List<ScheduleItem> items;
  final String showTitle;
  final DateTime showDate;

  const FullScheduleScreen({
    super.key,
    required this.items,
    required this.showTitle,
    required this.showDate,
  });

  @override
  State<FullScheduleScreen> createState() => _FullScheduleScreenState();
}

class _FullScheduleScreenState extends State<FullScheduleScreen> {
  final ScrollController _scrollController = ScrollController();
  
  // Timeline configuration - matches desktop
  static const double pixelsPerHour = 60.0;
  static const double pixelsPerMinute = pixelsPerHour / 60;
  static const int startHour = 0;
  static const int endHour = 24;
  static const double timelineHeight = (endHour - startHour) * pixelsPerHour;
  static const double leftPadding = 56.0; // Space for time labels
  static const double rightPadding = 16.0;
  
  @override
  void initState() {
    super.initState();
    // Scroll to first event after build
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _scrollToFirstEvent();
    });
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToFirstEvent() {
    if (widget.items.isEmpty) return;
    
    // Find earliest event
    final sortedItems = List<ScheduleItem>.from(widget.items)
      ..sort((a, b) => a.startTime.compareTo(b.startTime));
    
    final firstItem = sortedItems.first;
    final minutes = _parseTimeToMinutes(firstItem.startTime);
    
    if (minutes != null) {
      final scrollPosition = (minutes - startHour * 60) * pixelsPerMinute;
      // Scroll with offset to show some context above
      final targetScroll = (scrollPosition - 80).clamp(0.0, double.infinity);
      _scrollController.animateTo(
        targetScroll,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    }
  }

  int? _parseTimeToMinutes(String timeStr) {
    try {
      final dt = DateTime.parse(timeStr);
      return dt.hour * 60 + dt.minute;
    } catch (_) {
      return null;
    }
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    
    // Format date for header
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    final dateStr = '${days[widget.showDate.weekday - 1]}, ${widget.showDate.day} ${months[widget.showDate.month - 1]}';
    
    return LayerScaffold(
      title: 'Schedule',
      body: Padding(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header with show info
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 8, 8, 16),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.showTitle,
                          style: TextStyle(
                            color: colorScheme.onSurface,
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          dateStr,
                          style: TextStyle(
                            color: colorScheme.onSurfaceVariant,
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
                  ),
                  // Item count badge
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: colorScheme.surfaceContainer,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Text(
                      '${widget.items.length} items',
                      style: TextStyle(
                        color: colorScheme.onSurfaceVariant,
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            
            // Timeline card - fills remaining space
            Expanded(
              child: Container(
                decoration: BoxDecoration(
                  color: colorScheme.surfaceContainer,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: colorScheme.outline.withValues(alpha: 0.3),
                    width: 1,
                  ),
                ),
                clipBehavior: Clip.antiAlias,
                child: widget.items.isEmpty
                    ? _buildEmptyState(colorScheme)
                    : _buildTimeline(colorScheme),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState(ColorScheme colorScheme) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.schedule_outlined,
            size: 48,
            color: colorScheme.onSurfaceVariant.withValues(alpha: 0.5),
          ),
          const SizedBox(height: 16),
          Text(
            'No schedule items',
            style: TextStyle(
              color: colorScheme.onSurfaceVariant,
              fontSize: 16,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTimeline(ColorScheme colorScheme) {
    return SingleChildScrollView(
      controller: _scrollController,
      padding: const EdgeInsets.only(top: 8, bottom: 24),
      child: SizedBox(
        height: timelineHeight,
        child: Stack(
          children: [
            // Time intervals (background)
            ..._buildTimeIntervals(colorScheme),
            
            // Schedule items
            ..._buildScheduleItems(colorScheme),
          ],
        ),
      ),
    );
  }

  List<Widget> _buildTimeIntervals(ColorScheme colorScheme) {
    final widgets = <Widget>[];
    
    for (int hour = startHour; hour < endHour; hour++) {
      final topPosition = (hour - startHour) * pixelsPerHour;
      final label = '${hour.toString().padLeft(2, '0')}:00';
      
      widgets.add(
        Positioned(
          left: 0,
          top: topPosition,
          right: 0,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Time label
              SizedBox(
                width: leftPadding,
                child: Padding(
                  padding: const EdgeInsets.only(left: 12, top: 0),
                  child: Text(
                    label,
                    style: TextStyle(
                      color: colorScheme.onSurfaceVariant.withValues(alpha: 0.6),
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ),
              // Horizontal line
              Expanded(
                child: Container(
                  height: 1,
                  margin: const EdgeInsets.only(top: 6, right: 12),
                  color: colorScheme.outline.withValues(alpha: 0.1),
                ),
              ),
            ],
          ),
        ),
      );
    }
    
    return widgets;
  }

  List<Widget> _buildScheduleItems(ColorScheme colorScheme) {
    final widgets = <Widget>[];
    
    for (final item in widget.items) {
      final startMinutes = _parseTimeToMinutes(item.startTime);
      if (startMinutes == null) continue;
      
      int endMinutes;
      if (item.endTime != null) {
        endMinutes = _parseTimeToMinutes(item.endTime!) ?? (startMinutes + 30);
      } else {
        endMinutes = startMinutes + 30;
      }
      
      final duration = endMinutes - startMinutes;
      final topPosition = (startMinutes - startHour * 60) * pixelsPerMinute;
      final height = (duration * pixelsPerMinute).clamp(28.0, double.infinity);
      
      widgets.add(
        Positioned(
          left: leftPadding,
          right: rightPadding,
          top: topPosition,
          height: height,
          child: _ScheduleEventCard(
            item: item,
            height: height,
            onTap: () => _showItemDetails(item),
          ),
        ),
      );
    }
    
    return widgets;
  }

  void _showItemDetails(ScheduleItem item) {
    Navigator.of(context).push(
      SwipeablePageRoute(
        builder: (context) => DetailModal(
          title: item.title,
          subtitle: item.type.toUpperCase(),
          address: item.location,
          content: [
            DetailSplitCard(
              label1: 'Start Time',
              value1: item.formattedStartTime,
              label2: 'End Time',
              value2: item.formattedEndTime ?? '-',
            ),
            if (item.notes != null && item.notes!.isNotEmpty)
              DetailValueCard(
                label: 'Notes',
                value: item.notes!,
              ),
          ],
        ),
      ),
    );
  }
}

/// Individual schedule event card on the timeline
class _ScheduleEventCard extends StatelessWidget {
  final ScheduleItem item;
  final double height;
  final VoidCallback onTap;

  const _ScheduleEventCard({
    required this.item,
    required this.height,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    
    // Determine color based on type
    final (backgroundColor, borderColor) = _getEventColors(colorScheme);
    
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: backgroundColor,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: borderColor, width: 1),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            // Title
            Text(
              item.title,
              style: TextStyle(
                color: colorScheme.onSurface,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
              maxLines: height > 50 ? 2 : 1,
              overflow: TextOverflow.ellipsis,
            ),
            // Time range (only if there's enough height)
            if (height > 40) ...[
              const SizedBox(height: 2),
              Text(
                item.timeRange,
                style: TextStyle(
                  color: colorScheme.onSurfaceVariant,
                  fontSize: 11,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
            // Location (only if there's enough height and location exists)
            if (height > 60 && item.location != null) ...[
              const SizedBox(height: 2),
              Row(
                children: [
                  Icon(
                    Icons.location_on_outlined,
                    size: 12,
                    color: colorScheme.onSurfaceVariant.withValues(alpha: 0.7),
                  ),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      item.location!,
                      style: TextStyle(
                        color: colorScheme.onSurfaceVariant.withValues(alpha: 0.8),
                        fontSize: 11,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  (Color, Color) _getEventColors(ColorScheme colorScheme) {
    switch (item.type.toLowerCase()) {
      case 'doors':
      case 'show':
        // Accent color for show-related events
        return (
          colorScheme.primaryContainer.withValues(alpha: 0.9),
          colorScheme.primary.withValues(alpha: 0.5),
        );
      case 'arrival':
      case 'departure':
        // Different color for travel
        return (
          colorScheme.tertiaryContainer.withValues(alpha: 0.9),
          colorScheme.tertiary.withValues(alpha: 0.5),
        );
      case 'hotel':
      case 'lodging':
        return (
          colorScheme.secondaryContainer.withValues(alpha: 0.9),
          colorScheme.secondary.withValues(alpha: 0.5),
        );
      default:
        // Default schedule item
        return (
          colorScheme.surface,
          colorScheme.outline.withValues(alpha: 0.4),
        );
    }
  }
}
