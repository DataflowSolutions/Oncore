import 'package:flutter/material.dart';

/// Shared theme constants for the Oncore mobile app
/// Matches the web client's dark theme
class AppTheme {
  AppTheme._();

  // Core colors
  static const Color background = Color(0xFF000000);
  static const Color foreground = Color(0xFFF0F0F0);
  static const Color muted = Color(0xFFA3A3A3);
  static const Color border = Color(0xFF262626);
  static const Color inputBg = Color(0xFF282828);
  static const Color card = Color(0xFF1E1E1E);
  static const Color cardCell = Color(0xFF1A1A1A);
  
  // Semantic colors
  static const Color primary = Color(0xFFFFD700); // Amber/gold
  static const Color success = Color(0xFF22C55E);
  static const Color error = Color(0xFFEF4444);
  static const Color warning = Color(0xFFF59E0B);

  // Text styles
  static const TextStyle headingLarge = TextStyle(
    color: foreground,
    fontSize: 24,
    fontWeight: FontWeight.bold,
  );

  static const TextStyle headingMedium = TextStyle(
    color: foreground,
    fontSize: 18,
    fontWeight: FontWeight.w600,
  );

  static const TextStyle headingSmall = TextStyle(
    color: foreground,
    fontSize: 16,
    fontWeight: FontWeight.w600,
  );

  static const TextStyle bodyLarge = TextStyle(
    color: foreground,
    fontSize: 15,
  );

  static const TextStyle bodyMedium = TextStyle(
    color: foreground,
    fontSize: 14,
  );

  static const TextStyle bodySmall = TextStyle(
    color: muted,
    fontSize: 13,
  );

  static const TextStyle caption = TextStyle(
    color: muted,
    fontSize: 12,
  );

  // Border radius
  static const double radiusSmall = 8.0;
  static const double radiusMedium = 12.0;
  static const double radiusLarge = 16.0;
  static const double radiusXLarge = 24.0;

  // Spacing
  static const double spacingXs = 4.0;
  static const double spacingSm = 8.0;
  static const double spacingMd = 12.0;
  static const double spacingLg = 16.0;
  static const double spacingXl = 24.0;
}
