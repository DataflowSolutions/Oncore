import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../components/components.dart';
import '../../../models/show_day.dart';
import 'form_widgets.dart';
import 'add_contact_screen.dart';
import 'detail_screen.dart';

/// Layer 2: Contacts list screen showing all contacts for a show
class ContactsScreen extends ConsumerWidget {
  final List<ContactInfo> contacts;
  final String showId;
  final String orgId;
  final VoidCallback? onContactAdded;

  const ContactsScreen({
    super.key,
    required this.contacts,
    required this.showId,
    required this.orgId,
    this.onContactAdded,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colorScheme = Theme.of(context).colorScheme;

    return LayerScaffold(
      title: 'Contacts',
      body: Column(
        children: [
          Expanded(
            child: contacts.isEmpty
                ? _buildEmptyState(colorScheme)
                : ListView.builder(
                    padding: const EdgeInsets.all(24),
                    itemCount: contacts.length,
                    itemBuilder: (context, index) {
                      final contact = contacts[index];
                      return ContactCard(
                        name: contact.name,
                        role: contact.role,
                        phone: contact.phone,
                        email: contact.email,
                        onTap: () => _openContactDetail(context, contact),
                        onPhoneTap: contact.phone != null
                            ? () => _launchPhone(contact.phone!)
                            : null,
                        onEmailTap: contact.email != null
                            ? () => _launchEmail(contact.email!)
                            : null,
                      );
                    },
                  ),
          ),
          AddButton(
            onPressed: () => _openAddContact(context),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(ColorScheme colorScheme) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.people_outline,
            size: 64,
            color: colorScheme.onSurfaceVariant.withValues(alpha: 0.5),
          ),
          const SizedBox(height: 16),
          Text(
            'No contacts',
            style: TextStyle(
              color: colorScheme.onSurface,
              fontSize: 18,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Add a contact to get started',
            style: TextStyle(
              color: colorScheme.onSurfaceVariant,
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }

  void _openAddContact(BuildContext context) {
    Navigator.of(context).push(
      SwipeablePageRoute(
        builder: (context) => AddContactScreen(
          showId: showId,
          orgId: orgId,
          onContactAdded: () {
            onContactAdded?.call();
            Navigator.of(context).pop();
          },
        ),
      ),
    );
  }

  void _openContactDetail(BuildContext context, ContactInfo contact) {
    Navigator.of(context).push(
      SwipeablePageRoute(
        builder: (context) => DetailScreen(
          title: contact.name,
          items: [
            DetailItem(
              label: 'Name',
              value: contact.name,
              icon: Icons.person_outline,
            ),
            if (contact.role != null)
              DetailItem(
                label: 'Role',
                value: contact.role,
                icon: Icons.work_outline,
              ),
            if (contact.phone != null)
              DetailItem(
                label: 'Phone',
                value: contact.phone,
                icon: Icons.phone_outlined,
                type: DetailItemType.phone,
              ),
            if (contact.email != null)
              DetailItem(
                label: 'Email',
                value: contact.email,
                icon: Icons.email_outlined,
                type: DetailItemType.email,
              ),
            if (contact.isPromoter)
              const DetailItem(
                label: 'Type',
                value: 'Promoter',
                icon: Icons.star_outline,
              ),
          ],
        ),
      ),
    );
  }

  void _launchPhone(String phone) async {
    final uri = Uri.parse('tel:$phone');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  void _launchEmail(String email) async {
    final uri = Uri.parse('mailto:$email');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }
}
