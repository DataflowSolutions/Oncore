import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Calendar screen - separate from main swipe navigation
/// This is accessed via the list/calendar toggle, not swipe
class CalendarScreen extends StatelessWidget {
  final String orgId;
  final String orgName;

  const CalendarScreen({
    super.key,
    required this.orgId,
    required this.orgName,
  });

  // Colors matching web dark theme
  static const _background = Color(0xFF000000);
  static const _foreground = Color(0xFFF0F0F0);
  static const _muted = Color(0xFFA3A3A3);
  static const _inputBg = Color(0xFF282828);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _background,
      body: SafeArea(
        child: Column(
          children: [
            _buildTopBar(context),
            const Expanded(
              child: SizedBox.shrink(), // Empty calendar content
            ),
            _buildBottomSection(context),
          ],
        ),
      ),
    );
  }

  Widget _buildTopBar(BuildContext context) {
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
                    _buildToggle(context, Icons.format_list_bulleted, false, () {
                      context.go('/org/$orgId/shows', extra: orgName);
                    }),
                    _buildToggle(context, Icons.calendar_today_outlined, true, () {
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

  Widget _buildToggle(BuildContext context, IconData icon, bool isSelected, VoidCallback onTap) {
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

  Widget _buildBottomSection(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Search row
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
            ],
          ),
          const SizedBox(height: 16),
          // Add New button
          SizedBox(
            width: double.infinity,
            height: 50,
            child: ElevatedButton(
              onPressed: () {},
              style: ElevatedButton.styleFrom(
                backgroundColor: _foreground,
                foregroundColor: _background,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(25),
                ),
              ),
              child: const Text(
                'Add New',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
              ),
            ),
          ),
          const SizedBox(height: 16),
          // Bottom navigation
          _buildBottomNav(context),
        ],
      ),
    );
  }

  Widget _buildBottomNav(BuildContext context) {
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
            context.go('/org/$orgId/shows', extra: orgName);
          }),
          _buildNavItem(Icons.format_list_bulleted, 'Shows', true, () {
            context.go('/org/$orgId/shows', extra: orgName);
          }),
          _buildNavItem(Icons.people_outline, 'Network', false, () {
            context.go('/org/$orgId/shows', extra: orgName);
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
