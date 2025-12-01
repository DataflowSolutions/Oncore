import 'package:flutter_dotenv/flutter_dotenv.dart';

/// Environment configuration for Supabase connection
/// 
/// This file loads values from .env file using flutter_dotenv
/// Matches the same pattern as the Next.js client
class Env {
  /// Initialize dotenv - call this in main() before accessing any env vars
  static Future<void> init() async {
    await dotenv.load(fileName: '.env');
  }

  /// Supabase URL from environment
  static String get supabaseUrl => 
      dotenv.env['SUPABASE_URL'] ?? 'http://127.0.0.1:54321';
  
  /// Supabase Anonymous/Publishable Key from environment
  static String get supabaseAnonKey => 
      dotenv.env['SUPABASE_ANON_KEY'] ?? '';
  
  /// Check if environment is properly configured
  static bool get isConfigured => 
      supabaseUrl.isNotEmpty && supabaseAnonKey.isNotEmpty;
}
