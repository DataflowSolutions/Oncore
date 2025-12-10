import 'package:flutter/cupertino.dart';
import '../../../components/components.dart';
import '../../../models/show_day.dart';
import '../../../theme/app_theme.dart';
import 'detail_modal.dart';
import 'add_schedule_item_screen.dart';
import 'form_widgets.dart';

/// Full schedule screen showing a timeline view of all schedule items
/// Similar to the desktop ScheduleTimeline component
class FullScheduleScreen extends StatefulWidget {
  final List<ScheduleItem> items;
  final String showTitle;
  final DateTime showDate;
  final String? showId;
  final String? orgId;
  final VoidCallback? onItemAdded;

  const FullScheduleScreen({
    super.key,
    required this.items,
    required this.showTitle,
    required this.showDate,
    this.showId,
    this.orgId,
    this.onItemAdded,
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
  static const double leftPadding = 40.0; // Space for time labels
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
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;
    
    return LayerScaffold(
      title: 'Schedule',
      body: Column(
        children: [
          // Timeline - fills remaining space
          Expanded(
            child: _buildTimeline(brightness),
          ),
          // Add button at bottom
          if (widget.showId != null && widget.orgId != null)
            AddButton(
              onPressed: () => _openAddScheduleItem(context),
            ),
        ],
      ),
    );
  }

  void _openAddScheduleItem(BuildContext context) {
    Navigator.of(context).push(
      SwipeablePageRoute(
        builder: (context) => AddScheduleItemScreen(
          showId: widget.showId!,
          orgId: widget.orgId!,
          onItemAdded: () {
            widget.onItemAdded?.call();
            Navigator.of(context).pop();
          },
        ),
      ),
    );
  }

  Widget _buildEmptyState(Brightness brightness) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            CupertinoIcons.clock,
            size: 48,
            color: AppTheme.getMutedForegroundColor(brightness).withValues(alpha: 0.5),
          ),
          const SizedBox(height: 16),
          Text(
            'No schedule items',
            style: TextStyle(
              color: AppTheme.getMutedForegroundColor(brightness),
              fontSize: 16,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTimeline(Brightness brightness) {
    if (widget.items.isEmpty) {
      return _buildEmptyState(brightness);
    }
    
    return CupertinoScrollbar(
      controller: _scrollController,
      child: SingleChildScrollView(
        controller: _scrollController,
        padding: const EdgeInsets.only(top: 8, bottom: 24),
        child: SizedBox(
          height: timelineHeight,
          child: Stack(
            children: [
              // Time intervals (background) - 30 minute intervals
              ..._buildTimeIntervals(brightness),
              
              // Schedule items
              ..._buildScheduleItems(brightness),
            ],
          ),
        ),
      ),
    );
  }

  List<Widget> _buildTimeIntervals(Brightness brightness) {
    final widgets = <Widget>[];
    
    // Build 30-minute intervals
    for (int hour = startHour; hour < endHour; hour++) {
      final topPosition = (hour - startHour) * pixelsPerHour;
      // Just show the hour number like "08", "09", etc.
      final label = hour.toString().padLeft(2, '0');
      
      // Hour line with label
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
                  padding: const EdgeInsets.only(left: 16, top: 0),
                  child: Text(
                    label,
                    style: TextStyle(
                      color: AppTheme.getMutedForegroundColor(brightness).withValues(alpha: 0.6),
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ),
              // Horizontal line
              Expanded(
                child: Container(
                  height: 1,
                  margin: const EdgeInsets.only(top: 6, right: 16),
                  color: AppTheme.getBorderColor(brightness).withValues(alpha: 0.2),
                ),
              ),
            ],
          ),
        ),
      );
      
      // 30-minute line (no label, just line)
      final halfHourPosition = topPosition + (pixelsPerHour / 2);
      widgets.add(
        Positioned(
          left: leftPadding,
          top: halfHourPosition,
          right: 16,
          child: Container(
            height: 1,
            color: AppTheme.getBorderColor(brightness).withValues(alpha: 0.1),
          ),
        ),
      );
    }
    
    return widgets;
  }

  List<Widget> _buildScheduleItems(Brightness brightness) {
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
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;
    
    // Determine color based on type
    final (backgroundColor, borderColor) = _getEventColors(brightness);
    
    // Adjust padding based on height - smaller padding for small items
    final verticalPadding = height < 32 ? 2.0 : (height < 45 ? 4.0 : 6.0);
    final horizontalPadding = height < 32 ? 8.0 : 12.0;
    
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: backgroundColor,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: borderColor, width: 1),
        ),
        padding: EdgeInsets.symmetric(horizontal: horizontalPadding, vertical: verticalPadding),
        clipBehavior: Clip.hardEdge,
        child: height < 32
            // Very small items - single line with overflow hidden
            ? Row(
                children: [
                  Expanded(
                    child: Text(
                      item.title,
                      style: TextStyle(
                        color: AppTheme.getForegroundColor(brightness),
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  Text(
                    item.formattedStartTime,
                    style: TextStyle(
                      color: AppTheme.getMutedForegroundColor(brightness),
                      fontSize: 10,
                    ),
                  ),
                ],
              )
            : Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Title
                  Flexible(
                    child: Text(
                      item.title,
                      style: TextStyle(
                        color: AppTheme.getForegroundColor(brightness),
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                      maxLines: height > 50 ? 2 : 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  // Time range (only if there's enough height)
                  if (height > 45) ...[
                    const SizedBox(height: 2),
                    Text(
                      item.timeRange,
                      style: TextStyle(
                        color: AppTheme.getMutedForegroundColor(brightness),
                        fontSize: 11,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                  // Location (only if there's enough height and location exists)
                  if (height > 65 && item.location != null) ...[
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        Icon(
                          CupertinoIcons.location,
                          size: 12,
                          color: AppTheme.getMutedForegroundColor(brightness).withValues(alpha: 0.7),
                        ),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            item.location!,
                            style: TextStyle(
                              color: AppTheme.getMutedForegroundColor(brightness).withValues(alpha: 0.8),
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

  (Color, Color) _getEventColors(Brightness brightness) {
    final primary = AppTheme.getPrimaryColor(brightness);
    final card = AppTheme.getCardColor(brightness);
    final border = AppTheme.getBorderColor(brightness);
    
    switch (item.type.toLowerCase()) {
      case 'doors':
      case 'show':
        // Accent color for show-related events
        return (
          primary.withValues(alpha: 0.2),
          primary.withValues(alpha: 0.5),
        );
      case 'arrival':
      case 'departure':
        // Different color for travel
        return (
          primary.withValues(alpha: 0.15),
          primary.withValues(alpha: 0.4),
        );
      case 'hotel':
      case 'lodging':
        return (
          primary.withValues(alpha: 0.1),
          primary.withValues(alpha: 0.3),
        );
      default:
        // Default schedule item
        return (
          card,
          border.withValues(alpha: 0.4),
        );
    }
  }
}
