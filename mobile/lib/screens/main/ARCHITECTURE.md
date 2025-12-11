# Main Shell Architecture

The main shell has been refactored from a ~1000 line monolithic file into a modular, service-based architecture.

## File Structure

```
mobile/lib/screens/main/
├── main_shell.dart                    # Main UI widget (~450 lines)
├── controllers/
│   ├── main_shell_controller.dart            # State management
│   ├── main_shell_navigation_service.dart    # Navigation logic
│   └── main_shell_ui_builder.dart            # UI building helpers
└── main_shell_old_backup.dart         # Original file (for reference)
```

## Architecture Overview

### 1. MainShellController (`main_shell_controller.dart`)
**Responsibility:** State management and controller logic

- Manages three `PageController` instances:
  - `pageController` - Main tab navigation (Day/Shows/Network)
  - `showsPageController` - Shows view navigation (List/Calendar)
  - `networkPageController` - Network tab navigation (Team/Promoters/Venues)
- Tracks current states for all tabs and views
- Provides clean interface for state updates
- Handles lifecycle (dispose)

**Key Methods:**
- `updateTabIndex(int)` - Update main tab
- `updateShowsViewMode(ShowsViewMode)` - Switch Shows view
- `updateNetworkTab(NetworkTab)` - Switch Network tab
- `dispose()` - Cleanup

### 2. MainShellNavigationService (`main_shell_navigation_service.dart`)
**Responsibility:** Navigation operations and transitions

- Coordinates navigation between different views
- Handles animated page transitions
- Manages callbacks and state changes together
- Provides a single point for all navigation logic

**Key Methods:**
- `navigateToMainTab(int)` - Navigate to main tab with animation
- `navigateToShowsView(ShowsViewMode)` - Switch between list/calendar
- `navigateToNetworkTab(NetworkTab)` - Switch between team/promoters/venues
- `selectShow(String, String)` - Handle show selection and navigation
- `onShowsPageChanged(int)` - Handle shows page swipe
- `onNetworkPageChanged(int)` - Handle network page swipe

### 3. MainShellUIBuilder (`main_shell_ui_builder.dart`)
**Responsibility:** UI component building and styling

- Builds reusable UI components
- Centralizes styling logic
- Reduces code duplication in main widget

**Key Methods:**
- `buildNetworkToggle()` - Network tab toggle buttons
- `buildViewModeToggle()` - Shows view mode toggle buttons
- `buildNavItem()` - Bottom navigation items
- `buildBrandHeader()` - Oncore header

### 4. MainShell State (`main_shell.dart`)
**Responsibility:** Main UI orchestration and screen assembly

- Orchestrates controllers and services
- Manages search/filter state
- Builds UI using separated methods
- Handles focus management
- ~450 lines (down from ~1000)

**Benefits of refactoring:**
- Clear separation of concerns
- Easier to test (controllers are separate)
- Better readability and maintainability
- Reusable components
- Easier to add new features
- Controllers can be reused in other screens

## Key Improvements

1. **Reduced Complexity** - Main state class focused on lifecycle and UI
2. **Testability** - Controllers can be unit tested independently
3. **Reusability** - Services can be used in other parts of the app
4. **Maintainability** - Each file has a single responsibility
5. **Scalability** - Easy to add new features without bloating main file

## Fixed Issues

- **LateInitializationError** - Controllers properly initialized in initState
- **Page controller state** - Separated into dedicated controller class
- **Navigation logic** - Centralized in NavigationService
- **UI building** - Organized into logical methods

## Usage Example

```dart
// Create controller
_controller = MainShellController(
  initialTabIndex: 1,
  initialShowsViewMode: SavedViewMode.list,
);

// Use navigation service
_navigationService.navigateToShowsView(ShowsViewMode.calendar);
_navigationService.navigateToNetworkTab(NetworkTab.promoters);

// Use UI builder
_uiBuilder.buildNetworkToggle(icon, tab, onTap);
```

## Future Enhancements

- Extract filter dialogs to separate service
- Create SearchService for search/filter logic
- Add analytics service for tracking navigation
- Consider Provider/Riverpod for state management
- Add deep linking support to controller
