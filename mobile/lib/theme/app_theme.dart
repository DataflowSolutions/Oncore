import 'package:flutter/cupertino.dart';
import 'colors.dart';
import 'spacing.dart';

/// App theme configuration matching the web client's color scheme.
/// Based on client/app/globals.css - now using Cupertino (iOS) design language
class AppTheme {
  // Prevent instantiation
  AppTheme._();

  // Font family matching web app (San Francisco is iOS default, fallback to system)
  static const String _fontFamily = '.SF Pro Text';

  // ============================================
  // CUPERTINO THEME DATA
  // ============================================
  
  /// Get Cupertino theme for given brightness
  static CupertinoThemeData getCupertinoTheme(Brightness brightness) {
    return CupertinoThemeData(
      brightness: brightness,
      primaryColor: brightness == Brightness.light 
        ? AppColors.lightPrimary 
        : AppColors.darkPrimary,
      primaryContrastingColor: brightness == Brightness.light 
        ? AppColors.lightPrimaryForeground 
        : AppColors.darkPrimaryForeground,
      scaffoldBackgroundColor: brightness == Brightness.light 
        ? AppColors.lightBackground 
        : AppColors.darkBackground,
      barBackgroundColor: brightness == Brightness.light 
        ? AppColors.lightBackground 
        : AppColors.darkBackground,
      textTheme: CupertinoTextThemeData(
        primaryColor: brightness == Brightness.light 
          ? AppColors.lightForeground 
          : AppColors.darkForeground,
        textStyle: TextStyle(
          color: brightness == Brightness.light 
            ? AppColors.lightForeground 
            : AppColors.darkForeground,
          fontFamily: _fontFamily,
        ),
        actionTextStyle: TextStyle(
          color: brightness == Brightness.light 
            ? AppColors.lightPrimary 
            : AppColors.darkPrimary,
          fontFamily: _fontFamily,
        ),
        navTitleTextStyle: TextStyle(
          color: brightness == Brightness.light 
            ? AppColors.lightForeground 
            : AppColors.darkForeground,
          fontSize: 17,
          fontWeight: FontWeight.w600,
          fontFamily: _fontFamily,
        ),
        navLargeTitleTextStyle: TextStyle(
          color: brightness == Brightness.light 
            ? AppColors.lightForeground 
            : AppColors.darkForeground,
          fontSize: 34,
          fontWeight: FontWeight.bold,
          fontFamily: _fontFamily,
        ),
        tabLabelTextStyle: TextStyle(
          color: brightness == Brightness.light 
            ? AppColors.lightMutedForeground 
            : AppColors.darkMutedForeground,
          fontSize: 10,
          fontFamily: _fontFamily,
        ),
      ),
    );
  }

  // ============================================
  // COLOR HELPERS
  // ============================================
  
  /// Get background color for brightness
  static Color getBackgroundColor(Brightness brightness) {
    return brightness == Brightness.light 
      ? AppColors.lightBackground 
      : AppColors.darkBackground;
  }

  /// Get foreground/text color for brightness
  static Color getForegroundColor(Brightness brightness) {
    return brightness == Brightness.light 
      ? AppColors.lightForeground 
      : AppColors.darkForeground;
  }

  /// Get card background color for brightness
  static Color getCardColor(Brightness brightness) {
    return brightness == Brightness.light 
      ? AppColors.lightCard 
      : AppColors.darkCard;
  }

  /// Get card border color for brightness
  static Color getCardBorderColor(Brightness brightness) {
    return brightness == Brightness.light 
      ? AppColors.lightCardBorder 
      : AppColors.darkCardBorder;
  }

  /// Get primary color for brightness
  static Color getPrimaryColor(Brightness brightness) {
    return brightness == Brightness.light 
      ? AppColors.lightPrimary 
      : AppColors.darkPrimary;
  }

  /// Get muted foreground color for brightness
  static Color getMutedForegroundColor(Brightness brightness) {
    return brightness == Brightness.light 
      ? AppColors.lightMutedForeground 
      : AppColors.darkMutedForeground;
  }

  /// Get border color for brightness
  static Color getBorderColor(Brightness brightness) {
    return brightness == Brightness.light 
      ? AppColors.lightBorder 
      : AppColors.darkBorder;
  }

  /// Get destructive color for brightness
  static Color getDestructiveColor(Brightness brightness) {
    return brightness == Brightness.light 
      ? AppColors.lightDestructive 
      : AppColors.darkDestructive;
  }

  /// Get input background color for brightness
  static Color getInputBackgroundColor(Brightness brightness) {
    return brightness == Brightness.light 
      ? AppColors.lightSearchBg 
      : AppColors.darkInputBg;
  }

  /// Get input border color for brightness
  static Color getInputBorderColor(Brightness brightness) {
    return brightness == Brightness.light 
      ? AppColors.lightInputBorder 
      : AppColors.darkInputBorder;
  }

  // ============================================
  // AUTH TAB COLORS
  // ============================================
  
  /// Get auth tab background color (unselected)
  static Color get lightAuthTabBg => AppColors.lightAuthTabBg;
  static Color get darkAuthTabBg => AppColors.darkAuthTabBg;
  
  /// Get auth tab text color (unselected)
  static Color get lightAuthTabText => AppColors.lightAuthTabText;
  static Color get darkAuthTabText => AppColors.darkAuthTabText;
  
  /// Get auth tab background color (selected)
  static Color get lightAuthTabSelectedBg => AppColors.lightAuthTabSelectedBg;
  static Color get darkAuthTabSelectedBg => AppColors.darkAuthTabSelectedBg;
  
  /// Get auth tab text color (selected)
  static Color get lightAuthTabSelectedText => AppColors.lightAuthTabSelectedText;
  static Color get darkAuthTabSelectedText => AppColors.darkAuthTabSelectedText;

  /// Get button background color for brightness
  static Color getButtonBackgroundColor(Brightness brightness) {
    return brightness == Brightness.light 
      ? AppColors.lightButtonBg 
      : AppColors.darkButtonBg;
  }

  /// Get button foreground color for brightness
  static Color getButtonForegroundColor(Brightness brightness) {
    return brightness == Brightness.light 
      ? AppColors.lightPrimaryForeground 
      : AppColors.darkPrimaryForeground;
  }

  // ============================================
  // TEXT STYLES
  // ============================================
  
  /// Large title text style (iOS 34pt)
  static TextStyle largeTitleTextStyle(Brightness brightness) {
    return TextStyle(
      fontSize: 34,
      fontWeight: FontWeight.bold,
      color: getForegroundColor(brightness),
      fontFamily: _fontFamily,
    );
  }

  /// Title 1 text style (iOS 28pt)
  static TextStyle title1TextStyle(Brightness brightness) {
    return TextStyle(
      fontSize: 28,
      fontWeight: FontWeight.bold,
      color: getForegroundColor(brightness),
      fontFamily: _fontFamily,
    );
  }

  /// Title 2 text style (iOS 22pt)
  static TextStyle title2TextStyle(Brightness brightness) {
    return TextStyle(
      fontSize: 22,
      fontWeight: FontWeight.bold,
      color: getForegroundColor(brightness),
      fontFamily: _fontFamily,
    );
  }

  /// Title 3 text style (iOS 20pt)
  static TextStyle title3TextStyle(Brightness brightness) {
    return TextStyle(
      fontSize: 20,
      fontWeight: FontWeight.w600,
      color: getForegroundColor(brightness),
      fontFamily: _fontFamily,
    );
  }

  /// Headline text style (iOS 17pt semibold)
  static TextStyle headlineTextStyle(Brightness brightness) {
    return TextStyle(
      fontSize: 17,
      fontWeight: FontWeight.w600,
      color: getForegroundColor(brightness),
      fontFamily: _fontFamily,
    );
  }

  /// Body text style (iOS 17pt regular)
  static TextStyle bodyTextStyle(Brightness brightness) {
    return TextStyle(
      fontSize: 17,
      fontWeight: FontWeight.w400,
      color: getForegroundColor(brightness),
      fontFamily: _fontFamily,
    );
  }

  /// Callout text style (iOS 16pt)
  static TextStyle calloutTextStyle(Brightness brightness) {
    return TextStyle(
      fontSize: 16,
      fontWeight: FontWeight.w400,
      color: getForegroundColor(brightness),
      fontFamily: _fontFamily,
    );
  }

  /// Subheadline text style (iOS 15pt)
  static TextStyle subheadlineTextStyle(Brightness brightness) {
    return TextStyle(
      fontSize: 15,
      fontWeight: FontWeight.w400,
      color: getForegroundColor(brightness),
      fontFamily: _fontFamily,
    );
  }

  /// Footnote text style (iOS 13pt)
  static TextStyle footnoteTextStyle(Brightness brightness) {
    return TextStyle(
      fontSize: 13,
      fontWeight: FontWeight.w400,
      color: getMutedForegroundColor(brightness),
      fontFamily: _fontFamily,
    );
  }

  /// Caption 1 text style (iOS 12pt)
  static TextStyle caption1TextStyle(Brightness brightness) {
    return TextStyle(
      fontSize: 12,
      fontWeight: FontWeight.w400,
      color: getMutedForegroundColor(brightness),
      fontFamily: _fontFamily,
    );
  }

  /// Caption 2 text style (iOS 11pt)
  static TextStyle caption2TextStyle(Brightness brightness) {
    return TextStyle(
      fontSize: 11,
      fontWeight: FontWeight.w400,
      color: getMutedForegroundColor(brightness),
      fontFamily: _fontFamily,
    );
  }
}
