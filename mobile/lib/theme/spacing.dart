/// Spacing constants for consistent layout throughout the app.
/// Based on an 4px grid system (similar to Tailwind's spacing scale).
abstract final class AppSpacing {
  // Base spacing values
  static const double xs = 4.0;    // 0.25rem
  static const double sm = 8.0;    // 0.5rem
  static const double md = 12.0;   // 0.75rem
  static const double lg = 16.0;   // 1rem
  static const double xl = 24.0;   // 1.5rem
  static const double xxl = 32.0;  // 2rem
  static const double xxxl = 48.0; // 3rem
  
  // Specific use cases
  static const double pagePadding = 16.0;
  static const double cardPadding = 16.0;
  static const double listItemPadding = 12.0;
  static const double buttonPadding = 12.0;
  static const double inputPadding = 14.0;
  static const double iconSize = 24.0;
  static const double iconSizeSmall = 20.0;
  static const double iconSizeLarge = 32.0;
}

/// Border radius constants for consistent shapes.
abstract final class AppRadius {
  static const double xs = 4.0;
  static const double sm = 8.0;
  static const double md = 12.0;
  static const double lg = 16.0;
  static const double xl = 24.0;
  static const double full = 9999.0;
  
  // Specific use cases
  static const double button = 8.0;
  static const double card = 12.0;
  static const double input = 8.0;
  static const double chip = 16.0;
  static const double avatar = 9999.0;
}
