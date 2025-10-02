import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'config/env.dart';
import 'screens/shows_screen.dart';

/// 🎯 Main Entry Point
/// 
/// This demonstrates how Flutter initializes Supabase connection
/// BEFORE the app starts - same pattern as Next.js initialization!
void main() async {
  // Required for async operations before runApp
  WidgetsFlutterBinding.ensureInitialized();

  // 🚀 Initialize Supabase (connects DIRECTLY to your database)
  // This is equivalent to your Next.js getSupabaseServer() setup
  await Supabase.initialize(
    url: Env.supabaseUrl,
    anonKey: Env.supabaseAnonKey,
  );

  print('✅ Supabase initialized: ${Env.supabaseUrl}');
  
  runApp(const OncoreApp());
}

/// 🎨 Main App Widget
/// 
/// This is equivalent to your Next.js app/layout.tsx
class OncoreApp extends StatelessWidget {
  const OncoreApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Oncore - Tour Management',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.deepPurple,
          brightness: Brightness.light,
        ),
        useMaterial3: true,
      ),
      darkTheme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.deepPurple,
          brightness: Brightness.dark,
        ),
        useMaterial3: true,
      ),
      // Start with the shows list screen
      home: const ShowsScreen(),
    );
  }
}
