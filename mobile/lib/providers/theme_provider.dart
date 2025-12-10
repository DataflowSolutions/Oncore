import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Key for storing theme preference
const String _themeKey = 'oncore_theme_brightness';

/// Brightness state notifier that persists theme preference
class BrightnessNotifier extends StateNotifier<Brightness> {
  BrightnessNotifier() : super(Brightness.dark) {
    _loadBrightness();
  }

  /// Load brightness from SharedPreferences
  Future<void> _loadBrightness() async {
    final prefs = await SharedPreferences.getInstance();
    final brightnessString = prefs.getString(_themeKey);
    
    if (brightnessString != null) {
      state = brightnessString == 'light' ? Brightness.light : Brightness.dark;
    }
  }

  /// Set brightness and persist
  Future<void> setBrightness(Brightness brightness) async {
    state = brightness;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_themeKey, brightness == Brightness.light ? 'light' : 'dark');
  }

  /// Toggle between light and dark
  Future<void> toggleBrightness() async {
    await setBrightness(
      state == Brightness.light ? Brightness.dark : Brightness.light,
    );
  }

  /// Check if dark mode is enabled
  bool get isDarkMode => state == Brightness.dark;
}

/// Provider for theme brightness
final brightnessProvider = StateNotifierProvider<BrightnessNotifier, Brightness>((ref) {
  return BrightnessNotifier();
});

/// Provider to check if currently in dark mode
final isDarkModeProvider = Provider<bool>((ref) {
  return ref.watch(brightnessProvider) == Brightness.dark;
});

/// Legacy provider for backwards compatibility (deprecated)
@Deprecated('Use brightnessProvider instead')
final themeProvider = Provider<Brightness>((ref) => ref.watch(brightnessProvider));
