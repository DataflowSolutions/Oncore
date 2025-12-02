import 'package:flutter/material.dart';
import 'colors.dart';
import 'spacing.dart';

/// App theme configuration matching the web client's color scheme.
/// Based on client/app/globals.css
class AppTheme {
  // Prevent instantiation
  AppTheme._();

  // Font family matching web app (Arial, Helvetica, sans-serif)
  static const String _fontFamily = 'Arial';

  // ============================================
  // LIGHT THEME
  // ============================================
  static ThemeData get lightTheme => ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    scaffoldBackgroundColor: AppColors.lightBackground,
    
    colorScheme: const ColorScheme.light(
      surface: AppColors.lightBackground,
      onSurface: AppColors.lightForeground,
      surfaceContainerHighest: AppColors.lightCardCell,
      surfaceContainerHigh: AppColors.lightSidebarBg,
      surfaceContainer: AppColors.lightCard,
      primary: AppColors.lightPrimary,
      onPrimary: AppColors.lightPrimaryForeground,
      primaryContainer: AppColors.lightCardCell,
      onPrimaryContainer: AppColors.lightPrimary,
      secondary: AppColors.lightSecondary,
      onSecondary: AppColors.lightSecondaryForeground,
      secondaryContainer: AppColors.lightMuted,
      onSecondaryContainer: AppColors.lightForeground,
      tertiary: AppColors.info,
      onTertiary: Colors.white,
      error: AppColors.lightDestructive,
      onError: AppColors.lightDestructiveForeground,
      errorContainer: AppColors.lightErrorContainer,
      onErrorContainer: AppColors.lightOnErrorContainer,
      outline: AppColors.lightBorder,
      outlineVariant: AppColors.lightCardBorder,
      onSurfaceVariant: AppColors.lightMutedForeground,
    ),
    
    cardTheme: CardThemeData(
      color: AppColors.lightCard,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.card),
        side: const BorderSide(
          color: AppColors.lightCardBorder,
          width: 1,
        ),
      ),
    ),
    
    appBarTheme: const AppBarTheme(
      backgroundColor: AppColors.lightBackground,
      foregroundColor: AppColors.lightForeground,
      elevation: 0,
      scrolledUnderElevation: 0,
      surfaceTintColor: Colors.transparent,
    ),
    
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.lightSearchBg,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadius.input),
        borderSide: const BorderSide(color: AppColors.lightInputBorder),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadius.input),
        borderSide: const BorderSide(color: AppColors.lightInputBorder),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadius.input),
        borderSide: const BorderSide(color: AppColors.lightPrimary, width: 2),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadius.input),
        borderSide: const BorderSide(color: AppColors.lightDestructive),
      ),
      contentPadding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.lg,
        vertical: AppSpacing.inputPadding,
      ),
      hintStyle: const TextStyle(color: AppColors.lightMutedForeground),
      labelStyle: const TextStyle(color: AppColors.lightForeground),
    ),
    
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: AppColors.lightButtonBg,
        foregroundColor: AppColors.lightPrimaryForeground,
        disabledBackgroundColor: AppColors.lightMuted,
        disabledForegroundColor: AppColors.lightMutedForeground,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.button),
        ),
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.xl,
          vertical: AppSpacing.buttonPadding,
        ),
      ),
    ),
    
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: AppColors.lightForeground,
        side: const BorderSide(color: AppColors.lightBorder),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.button),
        ),
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.xl,
          vertical: AppSpacing.buttonPadding,
        ),
      ),
    ),
    
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: AppColors.lightPrimary,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.button),
        ),
      ),
    ),
    
    dividerTheme: const DividerThemeData(
      color: AppColors.lightBorder,
      thickness: 1,
    ),
    
    iconTheme: const IconThemeData(
      color: AppColors.lightForeground,
    ),
    
    fontFamily: _fontFamily,
    
    textTheme: const TextTheme(
      displayLarge: TextStyle(color: AppColors.lightForeground, fontWeight: FontWeight.bold, fontFamily: _fontFamily),
      displayMedium: TextStyle(color: AppColors.lightForeground, fontWeight: FontWeight.bold, fontFamily: _fontFamily),
      displaySmall: TextStyle(color: AppColors.lightForeground, fontWeight: FontWeight.bold, fontFamily: _fontFamily),
      headlineLarge: TextStyle(color: AppColors.lightForeground, fontWeight: FontWeight.w600, fontFamily: _fontFamily),
      headlineMedium: TextStyle(color: AppColors.lightForeground, fontWeight: FontWeight.w600, fontFamily: _fontFamily),
      headlineSmall: TextStyle(color: AppColors.lightForeground, fontWeight: FontWeight.w600, fontFamily: _fontFamily),
      titleLarge: TextStyle(color: AppColors.lightForeground, fontWeight: FontWeight.w600, fontFamily: _fontFamily),
      titleMedium: TextStyle(color: AppColors.lightForeground, fontWeight: FontWeight.w500, fontFamily: _fontFamily),
      titleSmall: TextStyle(color: AppColors.lightForeground, fontWeight: FontWeight.w500, fontFamily: _fontFamily),
      bodyLarge: TextStyle(color: AppColors.lightForeground, fontFamily: _fontFamily),
      bodyMedium: TextStyle(color: AppColors.lightForeground, fontFamily: _fontFamily),
      bodySmall: TextStyle(color: AppColors.lightMutedForeground, fontFamily: _fontFamily),
      labelLarge: TextStyle(color: AppColors.lightForeground, fontWeight: FontWeight.w500, fontFamily: _fontFamily),
      labelMedium: TextStyle(color: AppColors.lightMutedForeground, fontFamily: _fontFamily),
      labelSmall: TextStyle(color: AppColors.lightMutedForeground, fontFamily: _fontFamily),
    ),
  );

  // ============================================
  // DARK THEME
  // ============================================
  static ThemeData get darkTheme => ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    scaffoldBackgroundColor: AppColors.darkBackground,
    
    colorScheme: const ColorScheme.dark(
      surface: AppColors.darkBackground,
      onSurface: AppColors.darkForeground,
      surfaceContainerHighest: AppColors.darkCardCell,
      surfaceContainerHigh: AppColors.darkSearchBg,
      surfaceContainer: AppColors.darkCard,
      primary: AppColors.darkPrimary,
      onPrimary: AppColors.darkPrimaryForeground,
      primaryContainer: AppColors.darkCardCell,
      onPrimaryContainer: AppColors.darkForeground,
      secondary: AppColors.darkSecondary,
      onSecondary: AppColors.darkSecondaryForeground,
      secondaryContainer: AppColors.darkMuted,
      onSecondaryContainer: AppColors.darkForeground,
      tertiary: AppColors.info,
      onTertiary: Colors.white,
      error: AppColors.darkDestructive,
      onError: AppColors.darkPrimaryForeground,
      errorContainer: AppColors.darkErrorContainer,
      onErrorContainer: AppColors.darkOnErrorContainer,
      outline: AppColors.darkBorder,
      outlineVariant: AppColors.darkCardBorder,
      onSurfaceVariant: AppColors.darkMutedForeground,
    ),
    
    cardTheme: CardThemeData(
      color: AppColors.darkCard,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.card),
        side: const BorderSide(
          color: AppColors.darkCardBorder,
          width: 1,
        ),
      ),
    ),
    
    appBarTheme: const AppBarTheme(
      backgroundColor: AppColors.darkBackground,
      foregroundColor: AppColors.darkForeground,
      elevation: 0,
      scrolledUnderElevation: 0,
      surfaceTintColor: Colors.transparent,
    ),
    
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.darkInputBg,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadius.input),
        borderSide: const BorderSide(color: AppColors.darkInputBorder),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadius.input),
        borderSide: const BorderSide(color: AppColors.darkInputBorder),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadius.input),
        borderSide: const BorderSide(color: AppColors.darkPrimary, width: 2),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadius.input),
        borderSide: const BorderSide(color: AppColors.darkDestructive),
      ),
      contentPadding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.lg,
        vertical: AppSpacing.inputPadding,
      ),
      hintStyle: const TextStyle(color: AppColors.darkMutedForeground),
      labelStyle: const TextStyle(color: AppColors.darkForeground),
    ),
    
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: AppColors.darkButtonBg,
        foregroundColor: AppColors.darkPrimaryForeground,
        disabledBackgroundColor: AppColors.darkMuted,
        disabledForegroundColor: AppColors.darkMutedForeground,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.button),
        ),
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.xl,
          vertical: AppSpacing.buttonPadding,
        ),
      ),
    ),
    
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: AppColors.darkForeground,
        side: const BorderSide(color: AppColors.darkBorder),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.button),
        ),
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.xl,
          vertical: AppSpacing.buttonPadding,
        ),
      ),
    ),
    
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: AppColors.darkPrimary,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.button),
        ),
      ),
    ),
    
    dividerTheme: const DividerThemeData(
      color: AppColors.darkBorder,
      thickness: 1,
    ),
    
    iconTheme: const IconThemeData(
      color: AppColors.darkForeground,
    ),
    
    fontFamily: _fontFamily,
    
    textTheme: const TextTheme(
      displayLarge: TextStyle(color: AppColors.darkForeground, fontWeight: FontWeight.bold, fontFamily: _fontFamily),
      displayMedium: TextStyle(color: AppColors.darkForeground, fontWeight: FontWeight.bold, fontFamily: _fontFamily),
      displaySmall: TextStyle(color: AppColors.darkForeground, fontWeight: FontWeight.bold, fontFamily: _fontFamily),
      headlineLarge: TextStyle(color: AppColors.darkForeground, fontWeight: FontWeight.w600, fontFamily: _fontFamily),
      headlineMedium: TextStyle(color: AppColors.darkForeground, fontWeight: FontWeight.w600, fontFamily: _fontFamily),
      headlineSmall: TextStyle(color: AppColors.darkForeground, fontWeight: FontWeight.w600, fontFamily: _fontFamily),
      titleLarge: TextStyle(color: AppColors.darkForeground, fontWeight: FontWeight.w600, fontFamily: _fontFamily),
      titleMedium: TextStyle(color: AppColors.darkForeground, fontWeight: FontWeight.w500, fontFamily: _fontFamily),
      titleSmall: TextStyle(color: AppColors.darkForeground, fontWeight: FontWeight.w500, fontFamily: _fontFamily),
      bodyLarge: TextStyle(color: AppColors.darkForeground, fontFamily: _fontFamily),
      bodyMedium: TextStyle(color: AppColors.darkForeground, fontFamily: _fontFamily),
      bodySmall: TextStyle(color: AppColors.darkMutedForeground, fontFamily: _fontFamily),
      labelLarge: TextStyle(color: AppColors.darkForeground, fontWeight: FontWeight.w500, fontFamily: _fontFamily),
      labelMedium: TextStyle(color: AppColors.darkMutedForeground, fontFamily: _fontFamily),
      labelSmall: TextStyle(color: AppColors.darkMutedForeground, fontFamily: _fontFamily),
    ),
  );
}
