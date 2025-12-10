# Cupertino Conversion Progress Summary

## Completed Work

### ✅ Successfully Fixed Files

1. **hotels_screen.dart** - Complete Cupertino conversion with AppTheme helpers
2. **flights_screen.dart** - Complete Cupertino conversion with AppTheme helpers
3. **catering_screen.dart** - Partial conversion (color scheme fixed)
4. **marquee_text.dart** - Fixed Colors constants to use explicit Color values
5. **All files** - Automated color scheme replacements via PowerShell scripts
6. **All files** - Automated icon mapping to Cupertino equivalents
7. **All files** - Automated type fixes (ColorScheme → Brightness)

### 🛠️ PowerShell Scripts Created

- `fix_colors.ps1` - Replaces Material color scheme properties with AppTheme helpers
- `fix_icons.ps1` - Maps Material icons to Cupertino equivalents
- `fix_types.ps1` - Fixes type declarations (ColorScheme, TimeOfDay, etc.)
- `fix_complex.ps1` - Handles complex widget replacements

## Remaining Work

### 🔴 Critical Issues Requiring Manual Fixes

#### 1. Missing AppTheme Import

Many files reference `AppTheme` but don't import it. Add to each affected file:

```dart
import '../../../theme/app_theme.dart';
```

#### 2. Undefined `colorScheme` Variables

Files still using `colorScheme` instead of `brightness`. Need to replace:

```dart
final colorScheme = CupertinoTheme.of(context);
```

With:

```dart
final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;
```

#### 3. FormCupertinoTextField Undefined

The `FormCupertinoTextField` widget doesn't exist - it was created incorrectly by automation.
Need to properly create this custom widget in `form_widgets.dart` or replace with standard `CupertinoTextField`.

#### 4. Missing Cupertino Icons

These icons don't exist in CupertinoIcons and need alternatives:

- `help_outline` → `question_circle`
- `settings_outlined` → `settings`
- `error_outline` → `exclamationmark_circle`
- `hotel` → `bed_double`
- `restaurant` → `cart` or custom
- `people` → `person_3`
- `description` → `doc_text`
- `list_alt` → `list_bullet`
- `note` → `doc`
- `schedule` → `clock`
- `download_outlined` → `arrow_down_circle`
- `share_outlined` → `square_arrow_up`
- `open_in_new` → `arrow_up_right_square`
- `arrow_forward` → `chevron_forward`
- `close` → `xmark`
- `check` → `checkmark`
- `filter_list` → `line_horizontal_3_decrease`
- `search_off` → `search` (no direct equivalent)
- `work_outline` → `briefcase`
- `star_outline` → `star`
- `event_note_outlined` → `calendar`
- `event_busy` → `calendar_badge_minus`
- `schedule_outlined` → `clock`
- `location_on_outlined` → `location`
- `picture_as_pdf` → `doc`

#### 5. Material Widgets Need Replacement

These Material widgets still exist and need Cupertino alternatives:

- `TextField` → `CupertinoTextField`
- `TextFormField` → Custom form field with `CupertinoTextField`
- `Switch` → `CupertinoSwitch`
- `DropdownButton` → `CupertinoPicker` in modal
- `showDatePicker` → `showCupertinoModalPopup` with `CupertinoDatePicker`
- `showTimePicker` → `showCupertinoModalPopup` with `CupertinoTimerPicker`
- `showModalBottomSheet` → `showCupertinoModalPopup`
- `Divider` → Custom divider or remove
- `ListTile` → `CupertinoListTile` (custom component)
- `Material` widget → `Container`
- `InkWell` → `GestureDetector`
- `Scrollbar` → `CupertinoScrollbar`
- `Autocomplete` → Custom implementation
- `SwitchListTile` → Custom row with `CupertinoSwitch`
- `RefreshIndicator` → `CustomScrollView` with `CupertinoSliverRefreshControl`

#### 6. Theme Access Issues

Files trying to access `Theme.of(context)` which doesn't exist in Cupertino.
Replace with `CupertinoTheme.of(context)` or `AppTheme` helpers.

#### 7. Settings Screen Issues

- Uses old `themeProvider.notifier` - should use `brightnessProvider.notifier`
- Has `activeThumbColor` and `inactiveColor` params that don't exist on `CupertinoSwitch`
  - CupertinoSwitch only has `activeColor` parameter

#### 8. Show Day Screen Issues

- Uses `.state` getter on `AsyncValue` types - should handle AsyncValue properly with `.when()`
- Missing proper error handling patterns

#### 9. Form Widgets Issues (`form_widgets.dart`)

- `FormCupertinoTextField` is incorrectly defined as a const method
- Needs to be properly implemented as a StatelessWidget
- All InputDecoration parameters need to be removed or adapted
- Border configurations don't apply to CupertinoTextField

#### 10. Supabase Service Issue

- `AuthException` doesn't have `details` getter
- Use `message` instead

## Recommended Next Steps

### Phase 1: Fix Core Infrastructure (High Priority)

1. Create proper `FormCupertinoTextField` widget in `form_widgets.dart`
2. Add missing `AppTheme` imports to all affected files
3. Fix all `colorScheme` → `brightness` conversions
4. Replace all Material widgets with Cupertino equivalents

### Phase 2: Fix Icon Issues (Medium Priority)

1. Create icon mapping utility function
2. Replace all missing icons with Cupertino alternatives
3. Consider creating custom icons for missing cases

### Phase 3: Fix Type & API Issues (Medium Priority)

1. Fix all AsyncValue `.state` access patterns
2. Fix ThemeMode → Brightness in settings
3. Fix CupertinoSwitch parameters
4. Fix AuthException error handling

### Phase 4: Testing & Refinement (Low Priority)

1. Test each screen individually
2. Verify dark mode works correctly
3. Ensure navigation gestures work
4. Polish animations and transitions

## Files with Most Errors (Fix These First)

1. `form_widgets.dart` - 80+ errors (infrastructure file)
2. `create_show_modal.dart` - 60+ errors
3. `shows_list_screen.dart` - 40+ errors
4. `show_day_content.dart` - 40+ errors
5. `show_day_screen.dart` - 30+ errors
6. `settings_screen.dart` - 20+ errors
7. `documents_screen.dart` - 20+ errors
8. `add_schedule_item_screen.dart` - 20+ errors
9. `add_team_member_screen.dart` - 15+ errors

## Automation Limitations

The PowerShell scripts handled ~70% of mechanical replacements but couldn't handle:

- Complex widget restructuring
- API parameter changes
- Custom widget creation
- Context-specific icon choices
- Form handling patterns
- Navigation patterns

## Estimated Remaining Work

- **Manual fixes needed**: ~500-600 individual changes
- **New widgets to create**: ~5-10 custom Cupertino widgets
- **Testing**: Full app testing required
- **Time estimate**: 8-12 hours for experienced Flutter developer

## Key Learnings

1. Cupertino and Material have fundamentally different design philosophies
2. Many Material widgets have no direct Cupertino equivalent
3. Form handling is significantly different between the two
4. Theme system access is completely different
5. Icon sets are not 1:1 compatible

## Resources Created

All automation scripts are in `/mobile/scripts/`:

- `fix_colors.ps1`
- `fix_icons.ps1`
- `fix_types.ps1`
- `fix_complex.ps1`

These can be re-run safely and will only modify files that need changes.
