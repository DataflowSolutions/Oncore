import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Key for storing theme preference
const String _themeKey = 'oncore_theme_mode';

/// Theme mode state
enum AppThemeMode {
  light,
  dark,
  system,
}

/// Theme state notifier that persists theme preference
class ThemeNotifier extends StateNotifier<ThemeMode> {
  ThemeNotifier() : super(ThemeMode.dark) {
    _loadTheme();
  }

  /// Load theme from SharedPreferences
  Future<void> _loadTheme() async {
    final prefs = await SharedPreferences.getInstance();
    final themeString = prefs.getString(_themeKey);
    
    if (themeString != null) {
      switch (themeString) {
        case 'light':
          state = ThemeMode.light;
          break;
        case 'dark':
          state = ThemeMode.dark;
          break;
        case 'system':
          state = ThemeMode.system;
          break;
      }
    }
  }

  /// Set theme mode and persist
  Future<void> setThemeMode(ThemeMode mode) async {
    state = mode;
    final prefs = await SharedPreferences.getInstance();
    
    final themeString = switch (mode) {
      ThemeMode.light => 'light',
      ThemeMode.dark => 'dark',
      ThemeMode.system => 'system',
    };
    
    await prefs.setString(_themeKey, themeString);
  }

  /// Toggle between light and dark mode
  Future<void> toggleTheme() async {
    if (state == ThemeMode.dark) {
      await setThemeMode(ThemeMode.light);
    } else {
      await setThemeMode(ThemeMode.dark);
    }
  }

  /// Check if dark mode is enabled
  bool get isDarkMode => state == ThemeMode.dark;
}

/// Provider for theme state
final themeProvider = StateNotifierProvider<ThemeNotifier, ThemeMode>((ref) {
  return ThemeNotifier();
});

/// Provider to check if currently in dark mode (considers system theme)
final isDarkModeProvider = Provider<bool>((ref) {
  final themeMode = ref.watch(themeProvider);
  
  // For system mode, we'd need to check the platform brightness
  // For simplicity, we'll treat system as dark mode
  return themeMode == ThemeMode.dark || themeMode == ThemeMode.system;
});
