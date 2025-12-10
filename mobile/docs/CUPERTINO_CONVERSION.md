# Cupertino Conversion Guide

This document tracks the conversion of the Oncore mobile app from Material Design to Cupertino (iOS) design.

## Completed Conversions

### Core Files

- ✅ `main.dart` - Converted to CupertinoApp
- ✅ `providers/theme_provider.dart` - Updated to use Brightness instead of ThemeMode
- ✅ `theme/app_theme.dart` - Created Cupertino theme system
- ✅ `router/app_router.dart` - All routes use CupertinoPage
- ✅ `components/cupertino_components.dart` - Created reusable Cupertino widgets

### Screens

- ✅ `screens/home/home_screen.dart` - Partially converted
- ⏳ `screens/auth/login_screen.dart` - In progress
- ⏳ `screens/auth/signup_screen.dart` - In progress
- ⏳ `screens/main/main_shell.dart` - In progress
- ⏳ `screens/settings/settings_screen.dart` - Pending

## Widget Conversion Reference

### Navigation

- `Scaffold` → `CupertinoPageScaffold`
- `AppBar` → `CupertinoNavigationBar`
- `FloatingActionButton` → `CupertinoButton` with appropriate styling
- `Drawer` → `CupertinoNavigationBar` with trailing/leading buttons
- `BottomNavigationBar` → `CupertinoTabBar`
- `TabBar` → `CupertinoSlidingSegmentedControl` or `CupertinoTabBar`

### Buttons

- `ElevatedButton` / `FilledButton` → `CupertinoButton.filled`
- `OutlinedButton` → `CupertinoButton` with border
- `TextButton` → `CupertinoButton`
- `IconButton` → `CupertinoButton` with icon

### Input

- `TextField` / `TextFormField` → `CupertinoTextField`
- `DropdownButton` → `CupertinoPicker` or `CupertinoActionSheet`
- `Checkbox` → `CupertinoSwitch`
- `Radio` → Custom implementation or `CupertinoSlidingSegmentedControl`
- `Switch` → `CupertinoSwitch`
- `Slider` → `CupertinoSlider`

### Feedback

- `CircularProgressIndicator` → `CupertinoActivityIndicator`
- `SnackBar` → Custom toast or `CupertinoAlertDialog`
- `AlertDialog` → `CupertinoAlertDialog`
- `BottomSheet` → `CupertinoActionSheet` or `CupertinoModalPopup`

### Display

- `Card` → `CupertinoCard` (custom component)
- `ListTile` → `CupertinoListTile` (custom component)
- `Divider` → `CupertinoDivider` (custom component)
- `Chip` → Custom container with rounded corners
- `Badge` → Custom overlay widget

### Icons

- `Icons.*` → `CupertinoIcons.*`

### Dialogs & Popups

- `showDialog` → `showCupertinoDialog`
- `showModalBottomSheet` → `showCupertinoModalPopup`
- `showDatePicker` → `showCupertinoModalPopup` with `CupertinoDatePicker`
- `showTimePicker` → `showCupertinoModalPopup` with `CupertinoTimerPicker`

### Layout

- Most layout widgets remain the same (Column, Row, Stack, etc.)
- `Material` → Remove or replace with `Container`
- `InkWell` / `InkResponse` → `GestureDetector`

### Text & Styling

- Use `AppTheme` helper methods for consistent text styles
- Follow iOS typography scale (Large Title, Title 1-3, Headline, Body, etc.)
- Use `CupertinoTheme.of(context)` for theme-aware styling

## Color Mapping

Existing colors in `AppColors` are mapped to Cupertino equivalents:

- Background, foreground, card colors remain the same
- Border colors use iOS-style subtle dividers
- Primary colors match the web app
- Destructive red uses `CupertinoColors.systemRed`

## Theme Access

Instead of:

```dart
final colorScheme = Theme.of(context).colorScheme;
final textTheme = Theme.of(context).textTheme;
```

Use:

```dart
final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;
final textStyle = AppTheme.bodyTextStyle(brightness);
final primaryColor = AppTheme.getPrimaryColor(brightness);
```

## Common Patterns

### Scaffold with Navigation Bar

```dart
CupertinoPageScaffold(
  navigationBar: CupertinoNavigationBar(
    middle: const Text('Title'),
    leading: CupertinoBackButton(),
    trailing: CupertinoButton(...),
  ),
  child: SafeArea(
    child: YourContent(),
  ),
)
```

### Card-like Container

```dart
CupertinoCard(
  child: YourContent(),
)
```

### Form Input

```dart
CupertinoInputField(
  controller: controller,
  placeholder: 'Enter text',
  prefix: 'Label',
)
```

### Button

```dart
CupertinoButton.filled(
  onPressed: () {},
  child: const Text('Submit'),
)
```

### List Item

```dart
CupertinoListTile(
  leading: Icon(CupertinoIcons.person),
  title: const Text('Item Title'),
  subtitle: const Text('Subtitle'),
  trailing: const Icon(CupertinoIcons.forward),
  onTap: () {},
)
```

## Files Requiring Conversion

Total screens to convert: ~86 widget files

Priority order:

1. Auth screens (login, signup)
2. Main shell and navigation
3. Show day screens
4. Settings
5. All other screens
6. Smaller widget components

## Testing Checklist

- [ ] App launches without errors
- [ ] Navigation works correctly
- [ ] Dark mode toggles properly
- [ ] Forms submit correctly
- [ ] Lists scroll smoothly
- [ ] iOS-style swipe back gestures work
- [ ] Animations feel native to iOS
