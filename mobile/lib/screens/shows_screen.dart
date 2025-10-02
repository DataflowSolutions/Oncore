import 'package:flutter/material.dart';
import '../models/show.dart';
import '../services/supabase_service.dart';

/// 📱 Shows List Screen
/// 
/// This demonstrates how Flutter fetches data from Supabase DIRECTLY,
/// without any REST API! This is the exact same pattern as your Next.js app.
/// 
/// Matches styling from: client/app/(app)/[org]/shows/components/ShowsTable.tsx
class ShowsScreen extends StatefulWidget {
  const ShowsScreen({super.key});

  @override
  State<ShowsScreen> createState() => _ShowsScreenState();
}

class _ShowsScreenState extends State<ShowsScreen> {
  final _supabaseService = SupabaseService();
  List<Show> _shows = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _initializeAndFetchShows();
  }

  /// Initialize by signing in as test user, then fetch shows
  Future<void> _initializeAndFetchShows() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      // Step 1: Sign in as test user (matches your seed data)
      await _supabaseService.signInAsTestUser();
      
      // Step 2: Fetch shows
      await _fetchShows();
    } catch (e) {
      setState(() {
        _error = 'Failed to initialize: $e';
        _isLoading = false;
      });
    }
  }

  /// 🚀 Fetch shows from Supabase
  /// 
  /// This function demonstrates:
  /// 1. Direct Supabase query (NO REST API)
  /// 2. Automatic RLS security (just like web)
  /// 3. JSON to Dart object mapping
  Future<void> _fetchShows() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      // 🎯 This is the key line! Direct Supabase query
      // Same as your Next.js: supabase.from('shows').select('*')
      final shows = await _supabaseService.getShows();
      
      setState(() {
        _shows = shows;
        _isLoading = false;
      });

      print('📊 Loaded ${shows.length} shows from Supabase');
    } catch (e) {
      setState(() {
        _error = 'Failed to load shows: $e';
        _isLoading = false;
      });
      print('❌ Error: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('🎭 Oncore Shows'),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchShows,
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: _buildBody(),
    );
  }

  /// Build the main body content based on loading state
  Widget _buildBody() {
    // Loading state
    if (_isLoading) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 16),
            Text('Fetching shows from Supabase...'),
            SizedBox(height: 8),
            Text(
              'Direct database connection - NO REST API!',
              style: TextStyle(fontSize: 12, color: Colors.grey),
            ),
          ],
        ),
      );
    }

    // Error state
    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 64, color: Colors.red),
            const SizedBox(height: 16),
            Text(
              _error!,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.red),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _fetchShows,
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    // Empty state
    if (_shows.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.music_note, size: 64, color: Colors.grey),
            const SizedBox(height: 16),
            const Text(
              'No shows found',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            const Text(
              'Shows will appear here once created',
              style: TextStyle(color: Colors.grey),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _fetchShows,
              icon: const Icon(Icons.refresh),
              label: const Text('Refresh'),
            ),
          ],
        ),
      );
    }

    // Success state - show list grouped by month (matches Next.js)
    final showsByMonth = _groupShowsByMonth(_shows);
    
    return RefreshIndicator(
      onRefresh: _initializeAndFetchShows,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: showsByMonth.length,
        itemBuilder: (context, index) {
          final entry = showsByMonth.entries.elementAt(index);
          final monthYear = entry.key;
          final shows = entry.value;
          
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Month header with count (matches Next.js)
              Padding(
                padding: EdgeInsets.only(bottom: 8, top: index == 0 ? 0 : 24),
                child: Row(
                  children: [
                    Text(
                      monthYear,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
                      decoration: BoxDecoration(
                        border: Border.all(
                          color: Theme.of(context).brightness == Brightness.dark
                              ? const Color(0xFF333333)
                              : const Color(0xFFE5E5E5),
                        ),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        '${shows.length} ${shows.length == 1 ? "show" : "shows"}',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: Theme.of(context).brightness == Brightness.dark
                              ? Colors.white
                              : Colors.black,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              // Shows list
              ...shows.map((show) => _buildShowCard(show)),
            ],
          );
        },
      ),
    );
  }

  /// Group shows by month (matches Next.js getShowsByMonth function)
  Map<String, List<Show>> _groupShowsByMonth(List<Show> shows) {
    final Map<String, List<Show>> grouped = {};
    
    for (final show in shows) {
      final monthYear = show.monthYear;
      if (!grouped.containsKey(monthYear)) {
        grouped[monthYear] = [];
      }
      grouped[monthYear]!.add(show);
    }
    
    // Sort shows within each month
    for (final monthShows in grouped.values) {
      monthShows.sort((a, b) => a.date.compareTo(b.date));
    }
    
    // Return as ordered map (chronologically)
    final sortedEntries = grouped.entries.toList()
      ..sort((a, b) {
        final firstDateA = a.value.first.date;
        final firstDateB = b.value.first.date;
        return firstDateA.compareTo(firstDateB);
      });
    
    return Map.fromEntries(sortedEntries);
  }

  /// Build a card for each show (matches Next.js ShowsTable.tsx styling)
  Widget _buildShowCard(Show show) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1F1F1F) : Colors.white,
        border: Border.all(
          color: isDark ? const Color(0xFF333333) : const Color(0xFFE5E5E5),
          width: 1,
        ),
        borderRadius: BorderRadius.circular(8),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 2,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(8),
          onTap: () => _showDetailsDialog(show),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                // Left side: Show title and venue
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Show title
                      Text(
                        show.title,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: isDark ? Colors.white : const Color(0xFF1F1F1F),
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 6),
                      // Venue name
                      Text(
                        show.venueName ?? 'No venue set',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: isDark 
                              ? Colors.white.withOpacity(0.5)
                              : Colors.black.withOpacity(0.5),
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                // Right side: City and date
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    // City
                    Text(
                      show.venueCity ?? 'Location TBD',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color: isDark 
                            ? Colors.white.withOpacity(0.5)
                            : Colors.black.withOpacity(0.5),
                      ),
                    ),
                    const SizedBox(height: 6),
                    // Date
                    Text(
                      show.formattedDate,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color: isDark 
                            ? Colors.white.withOpacity(0.5)
                            : Colors.black.withOpacity(0.5),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  /// Show details dialog
  void _showDetailsDialog(Show show) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(show.title),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildDetailRow('Date', show.formattedDate),
            _buildDetailRow('Venue', show.venueName ?? 'Not set'),
            _buildDetailRow('City', show.venueCity ?? 'TBD'),
            const SizedBox(height: 16),
            const Divider(),
            const SizedBox(height: 8),
            const Text(
              '✅ Fetched directly from Supabase',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: Colors.green,
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              'Same database as your Next.js web app!',
              style: TextStyle(fontSize: 12, color: Colors.grey),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 80,
            child: Text(
              '$label:',
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                color: Colors.grey,
              ),
            ),
          ),
          Expanded(
            child: Text(value),
          ),
        ],
      ),
    );
  }
}
