/// Environment configuration for Supabase connection
/// 
/// This file contains hardcoded values for development.
/// In production, you'd use flutter_dotenv or environment variables.
class Env {
  // 🐳 LOCAL DOCKER SUPABASE (matches your Next.js client/.env.local)
  static const String supabaseUrl = 'http://127.0.0.1:54321';
  static const String supabaseAnonKey = 
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
  
  // ☁️ Production Supabase Cloud (uncomment for production)
  // static const String supabaseUrl = 'https://tabcxfaqqkfbchbxgogl.supabase.co';
  // static const String supabaseAnonKey = 
  //     'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhYmN4ZmFxcWtmYmNoYnhnb2dsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxOTc2ODIsImV4cCI6MjA3Mzc3MzY4Mn0.jhX1mo4SR9gWwjM0oJQxSdwgBejfTQetmLAQFIg94pY';
}
