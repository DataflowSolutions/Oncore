import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'config/env.dart';
import 'config/theme.dart';
import 'router/app_router.dart';

/// 🎯 Main Entry Point
/// 
/// This demonstrates how Flutter initializes Supabase connection
/// BEFORE the app starts - same pattern as Next.js initialization!
void main() async {
  // Required for async operations before runApp
  WidgetsFlutterBinding.ensureInitialized();

  // Load environment variables from .env file
  await Env.init();

  // Verify environment is configured
  if (!Env.isConfigured) {
    throw Exception(
      'Environment not configured! Please check your .env file.\n'
      'Copy .env.example to .env and fill in your Supabase credentials.',
    );
  }

  // 🚀 Initialize Supabase (connects DIRECTLY to your database)
  // This is equivalent to your Next.js getSupabaseServer() setup
  await Supabase.initialize(
    url: Env.supabaseUrl,
    anonKey: Env.supabaseAnonKey,
  );

  debugPrint('✅ Supabase initialized: ${Env.supabaseUrl}');
  
  runApp(
    const ProviderScope(
      child: OncoreApp(),
    ),
  );
}

/// 🎨 Main App Widget
/// 
/// This is equivalent to your Next.js app/layout.tsx
class OncoreApp extends ConsumerWidget {
  const OncoreApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(appRouterProvider);
    
    return MaterialApp.router(
      title: 'Oncore - Tour Management',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.system,
      routerConfig: router,
    );
  }
}
