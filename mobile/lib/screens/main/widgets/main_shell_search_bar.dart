import 'package:flutter/cupertino.dart';
import '../../../theme/app_theme.dart';

/// Reusable search bar widget for main shell tabs
class MainShellSearchBar extends StatelessWidget {
  final TextEditingController controller;
  final FocusNode focusNode;
  final String placeholder;
  final ValueChanged<String> onChanged;
  final VoidCallback onFilterTap;
  final VoidCallback onAddTap;
  final bool isFilterActive;
  final Brightness brightness;

  const MainShellSearchBar({
    super.key,
    required this.controller,
    required this.focusNode,
    required this.placeholder,
    required this.onChanged,
    required this.onFilterTap,
    required this.onAddTap,
    required this.isFilterActive,
    required this.brightness,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: SizedBox(
            height: 40,
            child: CupertinoSearchTextField(
              controller: controller,
              focusNode: focusNode,
              onChanged: onChanged,
              placeholder: placeholder,
              style: TextStyle(
                color: AppTheme.getForegroundColor(brightness),
                fontSize: 15,
              ),
              itemColor: AppTheme.getMutedForegroundColor(brightness),
              prefixInsets: const EdgeInsetsDirectional.fromSTEB(10, 0, 0, 0),
              decoration: BoxDecoration(
                color: AppTheme.getInputBackgroundColor(brightness),
                borderRadius: BorderRadius.circular(24),
              ),
            ),
          ),
        ),
        const SizedBox(width: 16),
        GestureDetector(
          onTap: onFilterTap,
          child: Icon(
            CupertinoIcons.slider_horizontal_3,
            color: isFilterActive
                ? AppTheme.getPrimaryColor(brightness)
                : AppTheme.getMutedForegroundColor(brightness),
            size: 28,
          ),
        ),
        const SizedBox(width: 16),
        GestureDetector(
          onTap: onAddTap,
          child: Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppTheme.getForegroundColor(brightness),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Icon(
              CupertinoIcons.add,
              color: AppTheme.getBackgroundColor(brightness),
              size: 24,
            ),
          ),
        ),
      ],
    );
  }
}
