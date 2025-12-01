import 'package:flutter/material.dart';

/// Network content widget - just the content, no shell/nav
/// Used inside MainShell for swipe navigation
class NetworkContent extends StatelessWidget {
  final String orgId;
  final String orgName;

  const NetworkContent({
    super.key,
    required this.orgId,
    required this.orgName,
  });

  @override
  Widget build(BuildContext context) {
    // Empty black content - will be filled in later
    return const SizedBox.shrink();
  }
}
