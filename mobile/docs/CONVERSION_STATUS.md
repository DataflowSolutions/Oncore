# Cupertino Conversion Status

## ✅ Completed Core Components

### Main Application Structure

1. **main.dart** - ✅ Converted

   - Changed from `MaterialApp.router` to `CupertinoApp.router`
   - Uses `AppTheme.getCupertinoTheme(brightness)`
   - Updated theme provider references

2. **providers/theme_provider.dart** - ✅ Converted

   - Changed from `ThemeMode` to `Brightness`
   - Updated `BrightnessNotifier` to replace `ThemeNotifier`
   - Provides `brightnessProvider` instead of `themeProvider`

3. **theme/app_theme.dart** - ✅ Converted

   - Complete Cupertino theme system with `CupertinoThemeData`
   - Helper methods for colors, text styles (following iOS typography)
   - Supports light and dark modes

4. **router/app_router.dart** - ✅ Converted

   - All routes now use `CupertinoPage` for iOS-style page transitions
   - Error page uses `CupertinoPageScaffold` and Cupertino widgets
   - Swipe-back navigation enabled automatically

5. **components/cupertino_components.dart** - ✅ Created

   - Reusable Cupertino widgets: `CupertinoCard`, `CupertinoListTile`, etc.
   - Consistent styling across the app

6. **screens/home/home_screen.dart** - ✅ Converted
   - Uses `CupertinoPageScaffold` with `CupertinoNavigationBar`
   - Replaced all Material widgets with Cupertino equivalents
   - Uses `CupertinoActivityIndicator`, `CupertinoButton.filled`, etc.

## ⚠️ Remaining Files to Convert

The following files still contain Material Design widgets and need conversion:

### Priority 1 - Authentication & Core Navigation

- `screens/auth/login_screen.dart` - Has Material widgets (Scaffold, TextField, etc.)
- `screens/auth/signup_screen.dart` - Has Material widgets
- `screens/main/main_shell.dart` - Main navigation shell with tabs
- `screens/settings/settings_screen.dart` - ERROR: Uses old theme provider API

### Priority 2 - Show Management Screens

- `screens/shows/shows_list_screen.dart`
- `screens/shows/create_show_modal.dart`
- `screens/calendar/calendar_screen.dart`
- `screens/calendar/calendar_content.dart`

### Priority 3 - Show Day Screens & Widgets

- `screens/show_day/show_day_screen.dart` - ERROR: Multiple undefined getters
- `screens/show_day/show_day_content.dart`
- `screens/show_day/widgets/*` - ~40+ widget files

### Priority 4 - Network & Other Screens

- `screens/network/network_screen.dart`
- `screens/home/create_organization_screen.dart`
- All remaining widget files in `screens/show_day/widgets/`

## 🔧 Known Issues to Fix

### Compilation Errors

1. **settings_screen.dart:416** - Using old `themeProvider.notifier`, should use `brightnessProvider.notifier`
2. **show_day_screen.dart** - Multiple `.state` getter errors on `AsyncValue` types
3. **shows_screen.dart:52** - Undefined getter `_supabase`
4. **supabase_service.dart:67** - AuthException doesn't have `details` getter

### Common Conversion Patterns Needed

#### Scaffold → CupertinoPageScaffold

```dart
// Before (Material)
Scaffold(
  appBar: AppBar(title: Text('Title')),
  body: YourWidget(),
)

// After (Cupertino)
CupertinoPageScaffold(
  navigationBar: CupertinoNavigationBar(
    middle: Text('Title'),
  ),
  child: SafeArea(child: YourWidget()),
)
```

#### Buttons

```dart
// Before
ElevatedButton / FilledButton(child: Text('Label'))

// After
CupertinoButton.filled(child: Text('Label'))

// Before
TextButton / IconButton

// After
CupertinoButton(padding: EdgeInsets.zero, child: ...)
```

#### Progress Indicators

```dart
// Before
CircularProgressIndicator()

// After
CupertinoActivityIndicator(radius: 14)
```

#### Theme Access

```dart
// Before
final colorScheme = Theme.of(context).colorScheme;
final textStyle = Theme.of(context).textTheme.bodyMedium;

// After
final brightness = ref.watch(brightnessProvider);
final textStyle = AppTheme.bodyTextStyle(brightness);
final primaryColor = AppTheme.getPrimaryColor(brightness);
```

## 📝 Next Steps

### Automated Conversion (Partial)

You can run the PowerShell script to do basic widget replacements:

```powershell
.\scripts\convert_to_cupertino.ps1
```

**Warning:** This will do simple text replacements. Manual review is required!

### Manual Conversion Required For:

1. **Forms** - TextField → CupertinoTextField with custom styling
2. **Dialogs** - AlertDialog → CupertinoAlertDialog
3. **Pickers** - showDatePicker → CupertinoDatePicker in modal
4. **Lists** - ListTile → CupertinoListTile (our custom component)
5. **Cards** - Card → CupertinoCard (our custom component)
6. **Navigation** - BottomNavigationBar → CupertinoTabBar
7. **Theme Access** - Replace all `Theme.of(context)` with `AppTheme.*` helpers

### Testing Checklist

After converting each screen:

- [ ] No compilation errors
- [ ] Screen displays correctly in light mode
- [ ] Screen displays correctly in dark mode
- [ ] All buttons are tappable
- [ ] Navigation works (including swipe-back)
- [ ] Forms submit properly
- [ ] Text is readable and properly styled

## 🎯 Quick Win Files (Easiest to Convert)

Start with these smaller files that will give you practice:

1. `components/back_button.dart` - Already uses some Cupertino
2. `components/profile_dropdown.dart`
3. `components/app_toast.dart`
4. `widgets/marquee_text.dart`

## 📚 Reference Documentation

See `CUPERTINO_CONVERSION.md` for detailed widget mapping and code examples.

### Key Cupertino Widgets

- `CupertinoPageScaffold` - Replaces Scaffold
- `CupertinoNavigationBar` - Replaces AppBar
- `CupertinoButton` - Replaces all button types
- `CupertinoTextField` - Replaces TextField
- `CupertinoSwitch` - Replaces Switch/Checkbox
- `CupertinoActivityIndicator` - Replaces CircularProgressIndicator
- `CupertinoAlertDialog` - Replaces AlertDialog
- `CupertinoActionSheet` - Replaces BottomSheet
- `CupertinoTabBar` - Replaces BottomNavigationBar
- `CupertinoIcons` - Replaces Icons

### iOS Design Guidelines

- Use iOS-style typography (Large Title, Title 1-3, Body, Footnote, Caption)
- Use subtle borders and shadows (iOS prefers flat design)
- Use system colors when appropriate (`CupertinoColors.system*`)
- Follow iOS spacing and padding conventions
- Use native iOS gestures (swipe-back, pull-to-refresh)

## 🏁 Final Goal

A fully native iOS-feeling app with:

- ✅ Cupertino widgets throughout
- ✅ iOS-style navigation and transitions
- ✅ Proper iOS typography and spacing
- ✅ Native iOS gestures
- ✅ iOS color system integration
- ✅ Smooth 60fps animations
- ✅ Consistent with iOS Human Interface Guidelines
