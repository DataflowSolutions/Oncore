import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../day/day_screen.dart';
import '../shows/shows_list_screen.dart';
import '../shows/create_show_modal.dart';
import '../network/network_screen.dart';

/// Main shell that wraps Day, Shows, Network screens with swipe navigation
/// This allows horizontal swiping between the main tabs while keeping
/// nested navigation (like individual show pages) separate
class MainShell extends StatefulWidget {
  final String orgId;
  final String orgName;
  final int initialIndex;

  const MainShell({
    super.key,
    required this.orgId,
    required this.orgName,
    this.initialIndex = 1, // Default to Shows (middle)
  });

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  late PageController _pageController;
  late int _currentIndex;

  // Colors matching web dark theme
  static const _background = Color(0xFF000000);
  static const _foreground = Color(0xFFF0F0F0);
  static const _muted = Color(0xFFA3A3A3);
  static const _inputBg = Color(0xFF282828);

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex;
    _pageController = PageController(initialPage: _currentIndex);
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _onPageChanged(int index) {
    setState(() {
      _currentIndex = index;
    });
  }

  void _onNavTap(int index) {
    _pageController.animateToPage(
      index,
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOut,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _background,
      body: SafeArea(
        child: Column(
          children: [
            _buildTopBar(),
            Expanded(
              child: PageView(
                controller: _pageController,
                onPageChanged: _onPageChanged,
                children: [
                  DayContent(orgId: widget.orgId, orgName: widget.orgName),
                  ShowsContent(orgId: widget.orgId, orgName: widget.orgName),
                  NetworkContent(orgId: widget.orgId, orgName: widget.orgName),
                ],
              ),
            ),
            _buildBottomSection(),
          ],
        ),
      ),
    );
  }

  Widget _buildTopBar() {
    // Only show list/calendar toggle when on Shows tab
    final showToggle = _currentIndex == 1;

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
          // Center: View toggle (only on Shows tab)
          Expanded(
            child: Center(
              child: showToggle
                  ? Container(
                      decoration: BoxDecoration(
                        color: _inputBg,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          _buildToggle(Icons.format_list_bulleted, true, () {
                            // Already on list view
                          }),
                          _buildToggle(Icons.calendar_today_outlined, false, () {
                            context.go('/org/${widget.orgId}/calendar', extra: widget.orgName);
                          }),
                        ],
                      ),
                    )
                  : const SizedBox.shrink(),
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
          _buildNavItem(Icons.play_arrow_outlined, 'Day', 0),
          _buildNavItem(Icons.format_list_bulleted, 'Shows', 1),
          _buildNavItem(Icons.people_outline, 'Network', 2),
        ],
      ),
    );
  }

  Widget _buildNavItem(IconData icon, String label, int index) {
    final isSelected = _currentIndex == index;
    final color = isSelected ? _foreground : _muted;

    return GestureDetector(
      onTap: () => _onNavTap(index),
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
