// This is a basic Flutter widget test for Oncore app.

import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/main.dart';

void main() {
  testWidgets('App loads shows screen', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const OncoreApp());

    // Verify that the shows screen title appears
    expect(find.text('🎭 Oncore Shows'), findsOneWidget);
  });
}
