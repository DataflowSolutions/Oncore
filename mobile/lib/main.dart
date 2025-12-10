import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'config/env.dart';
import 'providers/theme_provider.dart';
import 'theme/theme.dart';
import 'router/app_router.dart';

/// 🎯 Main Entry Point
/// 
/// This demonstrates how Flutter initializes Supabase connection
/// BEFORE the app starts - same pattern as Next.js initialization!
void main() async {
  // Required for async operations before runApp
  WidgetsFlutterBinding.ensureInitialized();

  print('═══════════════════════════════════════');
  print('🚀 ONCORE APP INITIALIZATION STARTED');
  print('═══════════════════════════════════════');

  try {
    print('[DEBUG] Loading environment variables...');
    // Load environment variables from .env file
    await Env.init();
    print('✅ Environment loaded');
    print('[DEBUG] SUPABASE_URL: ${Env.supabaseUrl}');
    print('[DEBUG] SUPABASE_ANON_KEY: ${Env.supabaseAnonKey.substring(0, 10)}...');

    // Verify environment is configured
    if (!Env.isConfigured) {
      throw Exception(
        'Environment not configured! Please check your .env file.\n'
        'Copy .env.example to .env and fill in your Supabase credentials.',
      );
    }

    print('[DEBUG] Environment validation passed');
    print('[DEBUG] Initializing Supabase...');
    
    // 🚀 Initialize Supabase (connects DIRECTLY to your database)
    // This is equivalent to your Next.js getSupabaseServer() setup
    await Supabase.initialize(
      url: Env.supabaseUrl,
      anonKey: Env.supabaseAnonKey,
    );

    print('✅ Supabase initialized successfully');
    print('[DEBUG] URL: ${Env.supabaseUrl}');
    print('[DEBUG] Client instance: ${Supabase.instance.client}');
    
    print('═══════════════════════════════════════');
    print('✅ APP INITIALIZATION COMPLETE');
    print('═══════════════════════════════════════');
  } catch (e, stackTrace) {
    print('❌ FATAL ERROR DURING INITIALIZATION: $e');
    print('[ERROR] Exception type: ${e.runtimeType}');
    print('[ERROR] Stack trace: $stackTrace');
    print('═══════════════════════════════════════');
    rethrow;
  }
  
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
    print('[DEBUG] OncoreApp.build() called');
    final router = ref.watch(appRouterProvider);
    final brightness = ref.watch(brightnessProvider);
    
    return CupertinoApp.router(
      title: 'Oncore - Tour Management',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.getCupertinoTheme(brightness),
      routerConfig: router,
    );
  }
}
