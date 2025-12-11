import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../theme/app_theme.dart';
import '../../../components/profile_dropdown.dart';

/// Brand header showing app name
class BrandHeader extends StatelessWidget {
  final Brightness brightness;

  const BrandHeader({super.key, required this.brightness});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      child: Center(
        child: Text(
          'Oncore',
          style: TextStyle(
            color: AppTheme.getForegroundColor(brightness),
            fontSize: 24,
            fontWeight: FontWeight.w900,
            letterSpacing: -0.5,
          ),
        ),
      ),
    );
  }
}

/// Top bar with profile, toggle, and settings
class MainShellTopBar extends ConsumerWidget {
  final String orgId;
  final Brightness brightness;
  final Widget? centerWidget;

  const MainShellTopBar({
    super.key,
    required this.orgId,
    required this.brightness,
    this.centerWidget,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      child: Row(
        children: [
          GestureDetector(
            onTap: () => ProfileDropdown.show(context, ref),
            child: Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: AppTheme.getMutedForegroundColor(brightness),
                  width: 1.5,
                ),
              ),
              child: Icon(
                CupertinoIcons.person,
                color: AppTheme.getForegroundColor(brightness),
                size: 20,
              ),
            ),
          ),
          Expanded(
            child: Center(child: centerWidget ?? const SizedBox.shrink()),
          ),
          GestureDetector(
            onTap: () => context.push('/org/$orgId/settings'),
            child: Icon(
              CupertinoIcons.settings,
              color: AppTheme.getForegroundColor(brightness),
              size: 28,
            ),
          ),
        ],
      ),
    );
  }
}
