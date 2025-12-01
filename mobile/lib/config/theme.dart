import 'package:flutter/material.dart';

/// App theme configuration matching the web client's color scheme
/// Based on client/app/globals.css
class AppTheme {
  // Prevent instantiation
  AppTheme._();

  // Font family matching web app (Arial, Helvetica, sans-serif)
  // Note: Special Gothic Expanded One (web header font) is not yet available in google_fonts,
  // so we use Arial consistently for now. When the font becomes available, we can add it.
  static const String _fontFamily = 'Arial';

  // ===========================================
  // LIGHT THEME COLORS (from :root in CSS)
  // ===========================================
  static const _lightBackground = Color(0xFFFFFFFF);         // #ffffff
  static const _lightForeground = Color(0xFF0A0A0A);         // #0a0a0a
  
  // Card colors
  static const _lightCard = Color(0xFFFFFFFF);               // #ffffff
  static const _lightCardCell = Color(0xFFF5F5F5);           // #f5f5f5
  
  // Sidebar
  static const _lightSidebarBg = Color(0xFFFAFAFA);          // #fafafa
  
  // Button
  static const _lightButtonBg = Color(0xFF171717);           // approximately lch(2.74% 0 296.81)
  static const _lightButtonBgHover = Color(0xFF262626);      // #262626
  
  // Search/Input
  static const _lightInputBg = Color(0xFFF5F5F5);            // #f5f5f5
  static const _lightBorder = Color(0xFFE5E5E5);             // #e5e5e5
  
  // Primary colors
  static const _lightPrimary = Color(0xFF171717);            // #171717
  static const _lightPrimaryForeground = Color(0xFFFAFAFA);  // #fafafa
  
  // Secondary colors
  static const _lightSecondary = Color(0xFFF5F5F5);          // #f5f5f5
  static const _lightSecondaryForeground = Color(0xFF171717); // #171717
  
  // Muted colors
  static const _lightMuted = Color(0xFFF5F5F5);              // #f5f5f5
  static const _lightMutedForeground = Color(0xFF737373);    // #737373
  
  // Destructive
  static const _lightDestructive = Color(0xFFDC2626);        // #dc2626

  // ===========================================
  // DARK THEME COLORS (from .dark in CSS)
  // ===========================================
  static const _darkBackground = Color(0xFF000000);          // rgb(0, 0, 0)
  static const _darkForeground = Color(0xFFF0F0F0);          // rgb(240, 240, 240)
  static const _darkDescriptionForeground = Color(0xFFAFAFAF); // rgb(175, 175, 175)
  
  // Card colors
  static const _darkCard = Color(0xFF1E1E1E);                // rgb(30, 30, 30)
  static const _darkCardHover = Color(0xFF282828);           // rgb(40, 40, 40)
  static const _darkCardCell = Color(0xFF323232);            // rgb(50, 50, 50)
  
  // Sidebar
  static const _darkSidebarBg = Color(0xFF0A0A0A);           // rgb(10, 10, 10)
  
  // Button
  static const _darkButtonBg = Color(0xFFF0F0F0);            // rgb(240, 240, 240)
  static const _darkButtonBgHover = Color(0xFFC8C8C8);       // rgb(200, 200, 200)
  
  // Search/Input
  static const _darkInputBg = Color(0xFF323232);             // rgb(50, 50, 50)
  static const _darkSearchBg = Color(0xFF282828);            // rgb(40, 40, 40)
  
  // Primary colors
  static const _darkPrimary = Color(0xFFF2F2F2);             // #f2f2f2
  static const _darkPrimaryForeground = Color(0xFF171717);   // #171717
  
  // Secondary colors  
  static const _darkSecondary = Color(0xFF262626);           // #262626
  static const _darkSecondaryForeground = Color(0xFFF2F2F2); // #f2f2f2
  
  // Muted colors
  static const _darkMuted = Color(0xFF262626);               // #262626
  static const _darkMutedForeground = Color(0xFFA3A3A3);     // #a3a3a3
  
  // Destructive
  static const _darkDestructive = Color(0xFFEF4444);         // #ef4444
  
  // Border
  static const _darkBorder = Color(0xFF262626);              // approximately rgba(255,255,255,0.1) on black

  // ===========================================
  // LIGHT THEME
  // ===========================================
  static ThemeData get lightTheme => ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    scaffoldBackgroundColor: _lightBackground,
    
    colorScheme: const ColorScheme.light(
      surface: _lightBackground,
      onSurface: _lightForeground,
      surfaceContainerHighest: _lightCardCell,
      surfaceContainerHigh: _lightSidebarBg,
      primary: _lightPrimary,
      onPrimary: _lightPrimaryForeground,
      primaryContainer: _lightCardCell,
      onPrimaryContainer: _lightPrimary,
      secondary: _lightSecondary,
      onSecondary: _lightSecondaryForeground,
      secondaryContainer: _lightMuted,
      onSecondaryContainer: _lightForeground,
      error: _lightDestructive,
      onError: _lightPrimaryForeground,
      errorContainer: Color(0xFFFEE2E2),
      onErrorContainer: _lightDestructive,
      outline: _lightBorder,
      outlineVariant: Color(0xFFE5E5E5),
      onSurfaceVariant: _lightMutedForeground,
    ),
    
    cardTheme: CardThemeData(
      color: _lightCard,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: Colors.black.withOpacity(0.07),
          width: 1,
        ),
      ),
    ),
    
    appBarTheme: const AppBarTheme(
      backgroundColor: _lightBackground,
      foregroundColor: _lightForeground,
      elevation: 0,
      scrolledUnderElevation: 0,
      surfaceTintColor: Colors.transparent,
    ),
    
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: _lightInputBg,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide(color: _lightBorder),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide(color: _lightBorder),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: _lightPrimary, width: 2),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: _lightDestructive),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      hintStyle: const TextStyle(color: _lightMutedForeground),
      labelStyle: const TextStyle(color: _lightForeground),
    ),
    
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: _lightButtonBg,
        foregroundColor: _lightPrimaryForeground,
        disabledBackgroundColor: _lightMuted,
        disabledForegroundColor: _lightMutedForeground,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
      ),
    ),
    
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: _lightForeground,
        side: BorderSide(color: _lightBorder),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
      ),
    ),
    
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: _lightPrimary,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
      ),
    ),
    
    dividerTheme: DividerThemeData(
      color: _lightBorder,
      thickness: 1,
    ),
    
    iconTheme: const IconThemeData(
      color: _lightForeground,
    ),
    
    // Use Arial font to match web app (body: Arial, Helvetica, sans-serif)
    fontFamily: _fontFamily,
    
    textTheme: const TextTheme(
      // Display styles - headers (Arial for now, web uses Special Gothic Expanded One which isn't in google_fonts yet)
      displayLarge: TextStyle(color: _lightForeground, fontWeight: FontWeight.bold, fontFamily: _fontFamily),
      displayMedium: TextStyle(color: _lightForeground, fontWeight: FontWeight.bold, fontFamily: _fontFamily),
      displaySmall: TextStyle(color: _lightForeground, fontWeight: FontWeight.bold, fontFamily: _fontFamily),
      // Headline styles
      headlineLarge: TextStyle(color: _lightForeground, fontWeight: FontWeight.w600, fontFamily: _fontFamily),
      headlineMedium: TextStyle(color: _lightForeground, fontWeight: FontWeight.w600, fontFamily: _fontFamily),
      headlineSmall: TextStyle(color: _lightForeground, fontWeight: FontWeight.w600, fontFamily: _fontFamily),
      // Title styles
      titleLarge: TextStyle(color: _lightForeground, fontWeight: FontWeight.w600, fontFamily: _fontFamily),
      titleMedium: TextStyle(color: _lightForeground, fontWeight: FontWeight.w500, fontFamily: _fontFamily),
      titleSmall: TextStyle(color: _lightForeground, fontWeight: FontWeight.w500, fontFamily: _fontFamily),
      // Body styles
      bodyLarge: TextStyle(color: _lightForeground, fontFamily: _fontFamily),
      bodyMedium: TextStyle(color: _lightForeground, fontFamily: _fontFamily),
      bodySmall: TextStyle(color: _lightMutedForeground, fontFamily: _fontFamily),
      // Label styles
      labelLarge: TextStyle(color: _lightForeground, fontWeight: FontWeight.w500, fontFamily: _fontFamily),
      labelMedium: TextStyle(color: _lightMutedForeground, fontFamily: _fontFamily),
      labelSmall: TextStyle(color: _lightMutedForeground, fontFamily: _fontFamily),
    ),
  );

  // ===========================================
  // DARK THEME
  // ===========================================
  static ThemeData get darkTheme => ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    scaffoldBackgroundColor: _darkBackground,
    
    colorScheme: const ColorScheme.dark(
      surface: _darkBackground,
      onSurface: _darkForeground,
      surfaceContainerHighest: _darkCardCell,
      surfaceContainerHigh: _darkSearchBg,
      surfaceContainer: _darkCard,
      primary: _darkPrimary,
      onPrimary: _darkPrimaryForeground,
      primaryContainer: _darkCardCell,
      onPrimaryContainer: _darkForeground,
      secondary: _darkSecondary,
      onSecondary: _darkSecondaryForeground,
      secondaryContainer: _darkMuted,
      onSecondaryContainer: _darkForeground,
      error: _darkDestructive,
      onError: _darkPrimaryForeground,
      errorContainer: Color(0xFF7F1D1D),
      onErrorContainer: Color(0xFFFECACA),
      outline: _darkBorder,
      outlineVariant: Color(0xFF404040),
      onSurfaceVariant: _darkMutedForeground,
    ),
    
    cardTheme: CardThemeData(
      color: _darkCard,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: Colors.white.withOpacity(0.05),
          width: 1,
        ),
      ),
    ),
    
    appBarTheme: const AppBarTheme(
      backgroundColor: _darkBackground,
      foregroundColor: _darkForeground,
      elevation: 0,
      scrolledUnderElevation: 0,
      surfaceTintColor: Colors.transparent,
    ),
    
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: _darkInputBg,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide(color: Colors.white.withOpacity(0.1)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide(color: Colors.white.withOpacity(0.1)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: _darkPrimary, width: 2),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: _darkDestructive),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      hintStyle: const TextStyle(color: _darkMutedForeground),
      labelStyle: const TextStyle(color: _darkForeground),
    ),
    
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: _darkButtonBg,
        foregroundColor: _darkPrimaryForeground,
        disabledBackgroundColor: _darkMuted,
        disabledForegroundColor: _darkMutedForeground,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
      ),
    ),
    
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: _darkForeground,
        side: BorderSide(color: Colors.white.withOpacity(0.1)),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
      ),
    ),
    
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: _darkPrimary,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
      ),
    ),
    
    dividerTheme: DividerThemeData(
      color: Colors.white.withOpacity(0.1),
      thickness: 1,
    ),
    
    iconTheme: const IconThemeData(
      color: _darkForeground,
    ),
    
    // Use Arial font to match web app (body: Arial, Helvetica, sans-serif)
    fontFamily: _fontFamily,
    
    textTheme: const TextTheme(
      // Display styles - headers (Arial for now, web uses Special Gothic Expanded One which isn't in google_fonts yet)
      displayLarge: TextStyle(color: _darkForeground, fontWeight: FontWeight.bold, fontFamily: _fontFamily),
      displayMedium: TextStyle(color: _darkForeground, fontWeight: FontWeight.bold, fontFamily: _fontFamily),
      displaySmall: TextStyle(color: _darkForeground, fontWeight: FontWeight.bold, fontFamily: _fontFamily),
      // Headline styles
      headlineLarge: TextStyle(color: _darkForeground, fontWeight: FontWeight.w600, fontFamily: _fontFamily),
      headlineMedium: TextStyle(color: _darkForeground, fontWeight: FontWeight.w600, fontFamily: _fontFamily),
      headlineSmall: TextStyle(color: _darkForeground, fontWeight: FontWeight.w600, fontFamily: _fontFamily),
      // Title styles
      titleLarge: TextStyle(color: _darkForeground, fontWeight: FontWeight.w600, fontFamily: _fontFamily),
      titleMedium: TextStyle(color: _darkForeground, fontWeight: FontWeight.w500, fontFamily: _fontFamily),
      titleSmall: TextStyle(color: _darkForeground, fontWeight: FontWeight.w500, fontFamily: _fontFamily),
      // Body styles
      bodyLarge: TextStyle(color: _darkForeground, fontFamily: _fontFamily),
      bodyMedium: TextStyle(color: _darkForeground, fontFamily: _fontFamily),
      bodySmall: TextStyle(color: _darkMutedForeground, fontFamily: _fontFamily),
      // Label styles
      labelLarge: TextStyle(color: _darkForeground, fontWeight: FontWeight.w500, fontFamily: _fontFamily),
      labelMedium: TextStyle(color: _darkMutedForeground, fontFamily: _fontFamily),
      labelSmall: TextStyle(color: _darkMutedForeground, fontFamily: _fontFamily),
    ),
  );
}
