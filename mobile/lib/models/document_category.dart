/// Document categories matching the web app implementation.
/// Categories are stored in the document label as: [category:value] filename
enum DocumentCategory { contract, rider, boardingPass, visa, other }

/// Extension to provide display labels and values for document categories
extension DocumentCategoryExtension on DocumentCategory {
  /// The value used in the category tag (e.g., [category:contract])
  String get value {
    switch (this) {
      case DocumentCategory.contract:
        return 'contract';
      case DocumentCategory.rider:
        return 'rider';
      case DocumentCategory.boardingPass:
        return 'boarding_pass';
      case DocumentCategory.visa:
        return 'visa';
      case DocumentCategory.other:
        return 'other';
    }
  }

  /// The display label shown in the UI
  String get label {
    switch (this) {
      case DocumentCategory.contract:
        return 'Contracts';
      case DocumentCategory.rider:
        return 'Riders';
      case DocumentCategory.boardingPass:
        return 'Boarding Passes';
      case DocumentCategory.visa:
        return 'Visas';
      case DocumentCategory.other:
        return 'Other';
    }
  }

  /// The party type to use when creating documents of this category
  /// Contract and Rider go to 'artist', others go to 'promoter'
  String get partyType {
    switch (this) {
      case DocumentCategory.contract:
      case DocumentCategory.rider:
        return 'artist';
      case DocumentCategory.boardingPass:
      case DocumentCategory.visa:
      case DocumentCategory.other:
        return 'promoter';
    }
  }
}

/// Helper to create a document label with category tag
/// Format: [category:value] filename
String createDocumentLabelWithCategory(
  DocumentCategory category,
  String fileName,
) {
  return '[category:${category.value}] $fileName';
}

/// Extract category from a document label
/// Returns DocumentCategory.other if no category tag found
DocumentCategory extractCategoryFromLabel(String? label) {
  if (label == null || label.isEmpty) return DocumentCategory.other;

  // Match [category:value] at start of label
  final regex = RegExp(r'^\[category:([^\]]+)\]\s*');
  final match = regex.firstMatch(label);

  if (match != null) {
    final value = match.group(1);
    for (final category in DocumentCategory.values) {
      if (category.value == value) {
        return category;
      }
    }
  }

  // Fallback: try to infer from label text (for legacy documents)
  final lower = label.toLowerCase();
  if (lower.contains('contract')) return DocumentCategory.contract;
  if (lower.contains('rider') || lower.contains('tech'))
    return DocumentCategory.rider;
  if (lower.contains('boarding') || lower.contains('pass'))
    return DocumentCategory.boardingPass;
  if (lower.contains('visa')) return DocumentCategory.visa;

  return DocumentCategory.other;
}

/// All document categories in display order
const List<DocumentCategory> allDocumentCategories = DocumentCategory.values;
