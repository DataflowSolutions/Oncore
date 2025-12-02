import 'package:flutter/material.dart';

/// Single source of truth for all colors in the Oncore mobile app.
/// Matches the web client's color scheme from globals.css.
/// 
/// Usage:
///   - Use `Theme.of(context).colorScheme` for Material theme colors
///   - Use `AppColors` for custom semantic colors not in ColorScheme
abstract final class AppColors {
  // ============================================
  // LIGHT THEME COLORS (from :root in CSS)
  // ============================================
  
  // Core
  static const lightBackground = Color(0xFFFFFFFF);         // #ffffff
  static const lightForeground = Color(0xFF0A0A0A);         // #0a0a0a
  static const lightDescriptionForeground = Color(0xFF737373); // #737373
  
  // Card
  static const lightCard = Color(0xFFFFFFFF);               // #ffffff
  static const lightCardCell = Color(0xFFF5F5F5);           // #f5f5f5
  static const lightCardForeground = Color(0xFF0A0A0A);     // #0a0a0a
  static const lightCardBorder = Color(0x12000000);         // rgba(0,0,0,0.07)
  static const lightCardCellBorder = Color(0x0D000000);     // rgba(0,0,0,0.05)
  
  // Sidebar
  static const lightSidebarBg = Color(0xFFFAFAFA);          // #fafafa
  static const lightSidebarBorder = Color(0x1A000000);      // rgba(0,0,0,0.1)
  
  // Button
  static const lightButtonBg = Color(0xFF171717);           // lch(2.74% 0 296.81) ≈ #171717
  static const lightButtonBgHover = Color(0xFF262626);      // #262626
  static const lightButtonBorder = Color(0xBFC8C8C8);       // rgba(200,200,200,0.75)
  
  // Search/Input
  static const lightSearchBg = Color(0xFFF5F5F5);           // #f5f5f5
  static const lightSearchBorder = Color(0x1A000000);       // rgba(0,0,0,0.1)
  static const lightSearchPlaceholder = Color(0xFF737373);  // #737373
  static const lightInputBorder = Color(0xFFE5E5E5);        // #e5e5e5
  
  // Tabs
  static const lightTabBg = Color(0xFFF5F5F5);              // #f5f5f5
  static const lightTabBgActive = Color(0xFFE5E5E5);        // #e5e5e5
  static const lightTabBorder = Color(0x1A000000);          // rgba(0,0,0,0.1)
  static const lightTabText = Color(0xFF0A0A0A);            // #0a0a0a
  
  // Schedule
  static const lightScheduleEventBg = Color(0xFF262626);    // #262626
  static const lightScheduleEventForeground = Color(0xFFFAFAFA); // #fafafa
  static const lightTimestamp = Color(0xFF737373);          // #737373
  static const lightTimestampDivider = Color(0xFFD4D4D4);   // #d4d4d4
  
  // Semantic
  static const lightPrimary = Color(0xFF171717);            // #171717
  static const lightPrimaryForeground = Color(0xFFFAFAFA);  // #fafafa
  static const lightSecondary = Color(0xFFF5F5F5);          // #f5f5f5
  static const lightSecondaryForeground = Color(0xFF171717); // #171717
  static const lightMuted = Color(0xFFF5F5F5);              // #f5f5f5
  static const lightMutedForeground = Color(0xFF737373);    // #737373
  static const lightAccent = Color(0xFFF5F5F5);             // #f5f5f5
  static const lightAccentForeground = Color(0xFF171717);   // #171717
  static const lightDestructive = Color(0xFFDC2626);        // #dc2626
  static const lightDestructiveForeground = Color(0xFFFAFAFA); // #fafafa
  static const lightBorder = Color(0xFFE5E5E5);             // #e5e5e5
  static const lightRing = Color(0xFF171717);               // #171717
  
  // Popover
  static const lightPopover = Color(0xFFFFFFFF);            // #ffffff
  static const lightPopoverForeground = Color(0xFF0A0A0A);  // #0a0a0a

  // ============================================
  // DARK THEME COLORS (from .dark in CSS)
  // ============================================
  
  // Core
  static const darkBackground = Color(0xFF0C0C0C);          // rgba(12, 12, 12, 1)
  static const darkForeground = Color(0xFFF0F0F0);          // rgb(240,240,240)
  static const darkDescriptionForeground = Color(0xFFAFAFAF); // rgb(175,175,175)
  
  // Card
  static const darkCard = Color(0xFF1E1E1E);                // rgb(30,30,30)
  static const darkCardHover = Color(0xFF282828);           // rgb(40,40,40)
  static const darkCardCell = Color(0xFF323232);            // rgb(50,50,50)
  static const darkCardCellHover = Color(0xFF3C3C3C);       // rgb(60,60,60)
  static const darkCardForeground = Color(0xFFF2F2F2);      // #f2f2f2
  static const darkCardBorder = Color(0x0DFFFFFF);          // rgba(255,255,255,0.05)
  static const darkCardCellBorder = Color(0x12FFFFFF);      // rgba(255,255,255,0.07)
  
  // Current org (special)
  static const darkCurrentOrgBg = Color(0xFF0400FF);        // #0400ff
  static const darkCurrentOrgBgHover = Color(0xFF211EFF);   // #211eff
  
  // Sidebar
  static const darkSidebarBg = Color(0xFF0A0A0A);           // rgb(10,10,10)
  static const darkSidebarBorder = Color(0x1AFFFFFF);       // rgba(255,255,255,0.1)
  
  // Button
  static const darkButtonBg = Color(0xFFF0F0F0);            // rgb(240,240,240)
  static const darkButtonBgHover = Color(0xFFC8C8C8);       // rgb(200,200,200)
  static const darkButtonBorder = Color(0xBF4B4B4B);        // rgba(75,75,75,0.75)
  static const darkButtonContactBg = Color(0xFF4B4B4B);     // rgb(75,75,75)
  static const darkButtonContactBorder = Color(0x12FFFFFF); // rgba(255,255,255,0.07)
  
  // Search/Input
  static const darkSearchBg = Color(0xFF282828);            // rgb(40,40,40)
  static const darkSearchBorder = Color(0x1AFFFFFF);        // rgba(255,255,255,0.1)
  static const darkSearchPlaceholder = Color(0xFFAFAFAF);   // rgb(175,175,175)
  static const darkInputBg = Color(0xFF323232);             // rgb(50,50,50)
  static const darkInputBorder = Color(0x1AFFFFFF);         // rgba(255,255,255,0.1)
  
  // Tabs
  static const darkTabBg = Color(0xFF282828);               // rgb(40,40,40)
  static const darkTabBgActive = Color(0xFF4B4B4B);         // rgb(75,75,75)
  static const darkTabBorder = Color(0x1AFFFFFF);           // rgba(255,255,255,0.1)
  static const darkTabText = Color(0xFFF0F0F0);             // rgb(240,240,240)
  
  // Schedule
  static const darkScheduleEventBg = Color(0xFFD2D2D2);     // rgb(210,210,210)
  static const darkScheduleEventBgHover = Color(0xFF9C9C9C); // rgb(156,156,156)
  static const darkScheduleEventForeground = Color(0xFF141414); // rgb(20,20,20)
  static const darkTimestamp = Color(0xFFAFAFAF);           // rgb(175,175,175)
  static const darkTimestampDivider = Color(0xFF4B4B4B);    // rgb(75,75,75)
  
  // Badges
  static const darkBadgePendingBg = Color(0x80FFFFFF);      // rgba(255,255,255,0.5)
  static const darkBadgePendingText = Color(0xFF171717);    // #171717
  static const darkBadgeSecondaryBg = Color(0xFFF0F0F0);    // #f0f0f0
  static const darkBadgeSecondaryText = Color(0xFF141414);  // #141414
  
  // Semantic
  static const darkPrimary = Color(0xFFF2F2F2);             // #f2f2f2
  static const darkPrimaryForeground = Color(0xFF171717);   // #171717
  static const darkSecondary = Color(0xFF262626);           // #262626
  static const darkSecondaryForeground = Color(0xFFF2F2F2); // #f2f2f2
  static const darkMuted = Color(0xFF262626);               // #262626
  static const darkMutedForeground = Color(0xFFA3A3A3);     // #a3a3a3
  static const darkAccent = Color(0xFF262626);              // #262626
  static const darkAccentForeground = Color(0xFFF2F2F2);    // #f2f2f2
  static const darkDestructive = Color(0xFFEF4444);         // #ef4444
  static const darkDestructiveForeground = Color(0xFFF2F2F2); // #f2f2f2
  static const darkBorder = Color(0xFF262626);              // ~rgba(255,255,255,0.1) on black
  static const darkRing = Color(0xFF525252);                // #525252
  
  // Popover
  static const darkPopover = Color(0xFF141414);             // #141414
  static const darkPopoverForeground = Color(0xFFF2F2F2);   // #f2f2f2

  // ============================================
  // SHARED SEMANTIC COLORS (same in both themes)
  // ============================================
  
  /// Success green - for positive actions/states
  static const success = Color(0xFF22C55E);                 // Tailwind green-500
  
  /// Warning amber - for caution states
  static const warning = Color(0xFFF59E0B);                 // Tailwind amber-500
  
  /// Info blue - for informational elements
  static const info = Color(0xFF3B82F6);                    // Tailwind blue-500
  
  /// Error container backgrounds
  static const lightErrorContainer = Color(0xFFFEE2E2);     // Tailwind red-100
  static const darkErrorContainer = Color(0xFF7F1D1D);      // Tailwind red-900
  static const lightOnErrorContainer = Color(0xFFDC2626);   // Tailwind red-600
  static const darkOnErrorContainer = Color(0xFFFECACA);    // Tailwind red-200
}
