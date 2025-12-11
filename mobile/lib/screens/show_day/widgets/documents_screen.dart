import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:file_picker/file_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:syncfusion_flutter_pdfviewer/pdfviewer.dart';
import '../../../components/components.dart';
import '../../../theme/app_theme.dart';
import '../../../models/show_day.dart';
import '../../../providers/auth_provider.dart';
import '../../../services/document_share_service.dart';

/// Layer 2: Documents list screen - shows list of documents
class DocumentsScreen extends ConsumerStatefulWidget {
  final List<DocumentInfo> documents;
  final String showId;
  final String orgId;
  final VoidCallback? onDocumentAdded;

  const DocumentsScreen({
    super.key,
    required this.documents,
    required this.showId,
    required this.orgId,
    this.onDocumentAdded,
  });

  @override
  ConsumerState<DocumentsScreen> createState() => _DocumentsScreenState();
}

class _DocumentsScreenState extends ConsumerState<DocumentsScreen> {
  List<DocumentInfo> _files = [];
  bool _isLoading = true;
  bool _isUploading = false;

  @override
  void initState() {
    super.initState();
    _loadFiles();
  }

  Future<void> _loadFiles() async {
    setState(() => _isLoading = true);
    
    try {
      final supabase = ref.read(supabaseClientProvider);
      
      // Step 1: Get or create show_advancing session using RPC (same as web client)
      print('[DEBUG] Getting advancing session for show: ${widget.showId}');
      final advancing = await supabase.rpc('get_or_create_show_advancing', params: {
        'p_show_id': widget.showId,
        'p_status': 'draft',
      });
      
      if (advancing == null) {
        print('[DEBUG] No advancing session found');
        setState(() {
          _files = [];
          _isLoading = false;
        });
        return;
      }
      
      final sessionId = advancing['id'] as String;
      print('[DEBUG] Got session_id: $sessionId');
      
      // Step 2: Use RPC to get documents with files (same as web client)
      final response = await supabase.rpc('get_advancing_documents', params: {
        'p_session_id': sessionId,
      });
      
      final List<dynamic> documents = response as List<dynamic>;
      print('[DEBUG] Loaded ${documents.length} documents');
      
      // Step 3: Extract all files from all documents
      final List<DocumentInfo> allFiles = [];
      for (var i = 0; i < documents.length; i++) {
        final doc = documents[i];
        print('[DEBUG] Document $i: ${doc['label']}');
        
        final filesData = doc['files'];
        print('[DEBUG] Files data type: ${filesData.runtimeType}');
        print('[DEBUG] Files data: $filesData');
        
        if (filesData is String) {
          // It might be a JSON string, try parsing it
          try {
            final parsed = jsonDecode(filesData);
            if (parsed is List) {
              print('[DEBUG] Parsed JSON string to list with ${parsed.length} files');
              for (var file in parsed) {
                if (file is Map<String, dynamic>) {
                  print('[DEBUG] Adding file: ${file['original_name']}');
                  allFiles.add(DocumentInfo.fromJson(file));
                }
              }
            }
          } catch (e) {
            print('[DEBUG] Failed to parse files as JSON: $e');
          }
        } else if (filesData is List) {
          print('[DEBUG] Files is already a list with ${filesData.length} items');
          for (var file in filesData) {
            print('[DEBUG] Processing file: ${file is Map ? file['original_name'] : file.runtimeType}');
            if (file is Map<String, dynamic>) {
              print('[DEBUG] Adding file: ${file['original_name']}');
              allFiles.add(DocumentInfo.fromJson(file));
            }
          }
        }
      }
      
      print('[DEBUG] Total files extracted: ${allFiles.length}');
      setState(() {
        _files = allFiles;
        _isLoading = false;
      });
    } catch (e) {
      print('[ERROR] Failed to load files: $e');
      setState(() => _isLoading = false);
      if (mounted) {
        AppToast.error(context, 'Failed to load files: $e');
      }
    }
  }

  Future<void> _pickAndUploadFile() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'csv'],
        withData: true,
      );

      if (result == null || result.files.isEmpty) return;

      final file = result.files.first;
      if (file.bytes == null) {
        if (mounted) {
          AppToast.error(context, 'Could not read file data');
        }
        return;
      }

      setState(() => _isUploading = true);

      await _uploadFile(
        fileName: file.name,
        fileBytes: file.bytes!,
        contentType: _getContentType(file.extension),
      );

    } catch (e) {
      if (mounted) {
        AppToast.error(context, 'Failed to pick file: $e');
      }
    } finally {
      if (mounted) {
        setState(() => _isUploading = false);
      }
    }
  }

  String _getContentType(String? extension) {
    switch (extension?.toLowerCase()) {
      case 'pdf':
        return 'application/pdf';
      case 'png':
        return 'image/png';
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      case 'doc':
        return 'application/msword';
      case 'docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'xls':
        return 'application/vnd.ms-excel';
      case 'xlsx':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'txt':
        return 'text/plain';
      case 'csv':
        return 'text/csv';
      default:
        return 'application/octet-stream';
    }
  }

  Future<void> _uploadFile({
    required String fileName,
    required Uint8List fileBytes,
    required String contentType,
  }) async {
    try {
      final supabase = ref.read(supabaseClientProvider);
      final user = supabase.auth.currentUser;
      
      // Step 1: Get or create show_advancing session
      final advancingResponse = await supabase.rpc(
        'get_or_create_show_advancing',
        params: {'p_show_id': widget.showId},
      );
      
      final advancingSession = advancingResponse as Map<String, dynamic>;
      final sessionId = advancingSession['id'] as String;
      
      // Step 2: Create an advancing_document to hold this file
      final documentResponse = await supabase.rpc(
        'create_advancing_document',
        params: {
          'p_session_id': sessionId,
          'p_party_type': 'artist', // Default to artist, could be made configurable
          'p_label': fileName, // Use filename as label
        },
      );
      
      final document = documentResponse as Map<String, dynamic>;
      final documentId = document['id'] as String;
      
      // Step 3: Generate unique file path
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final random = DateTime.now().microsecondsSinceEpoch % 100000;
      final fileExt = fileName.split('.').last;
      final uniqueFileName = '$timestamp-$random.$fileExt';
      final storagePath = '${widget.orgId}/shows/${widget.showId}/advancing/$sessionId/$uniqueFileName';
      
      // Step 4: Upload to storage
      await supabase.storage
          .from('advancing-files')
          .uploadBinary(storagePath, fileBytes, fileOptions: FileOptions(contentType: contentType));
      
      // Step 5: Create file record linked to advancing_document using RPC
      await supabase.rpc('upload_advancing_file', params: {
        'p_org_id': widget.orgId,
        'p_document_id': documentId,
        'p_storage_path': storagePath,
        'p_original_name': fileName,
        'p_content_type': contentType,
        'p_size_bytes': fileBytes.length,
      });

      // Reload files
      await _loadFiles();
      
      // Notify parent
      widget.onDocumentAdded?.call();

      if (mounted) {
        AppToast.success(context, 'File uploaded successfully');
      }
    } catch (e) {
      print('═══════════════════════════════════════');
      print('❌ ERROR uploading file: $e');
      print('═══════════════════════════════════════');
      if (mounted) {
        AppToast.error(context, 'Failed to upload file: $e');
      }
    }
  }

  void _openDocumentViewer(int initialIndex) {
    Navigator.of(context).push(
      SwipeablePageRoute(
        builder: (context) => _DocumentViewerScreen(
          files: _files,
          initialIndex: initialIndex,
          showId: widget.showId,
          onDocumentDeleted: () {
            _loadFiles();
            widget.onDocumentAdded?.call();
          },
        ),
      ),
    );
  }

  IconData _getFileIcon(DocumentInfo file) {
    final contentType = file.contentType?.toLowerCase() ?? '';
    if (contentType.contains('pdf')) {
      return CupertinoIcons.doc;
    } else if (contentType.startsWith('image/')) {
      return CupertinoIcons.photo;
    } else if (contentType.contains('word') || contentType.contains('document')) {
      return CupertinoIcons.doc_text;
    } else if (contentType.contains('excel') || contentType.contains('spreadsheet')) {
      return CupertinoIcons.table;
    } else if (contentType.contains('text')) {
      return CupertinoIcons.doc_plaintext;
    }
    return CupertinoIcons.doc;
  }

  @override
  Widget build(BuildContext context) {
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;

    return LayerScaffold(
      title: 'Documents',
      body: Column(
        children: [
          // Document list
          Expanded(
            child: _isLoading
                ? const Center(child: CupertinoActivityIndicator())
                : _files.isEmpty
                    ? _buildEmptyState(brightness)
                    : ListView.builder(
                        padding: const EdgeInsets.all(24),
                        itemCount: _files.length,
                        itemBuilder: (context, index) {
                          final file = _files[index];
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: GestureDetector(
                              onTap: () => _openDocumentViewer(index),
                              child: Container(
                                decoration: BoxDecoration(
                                  color: AppTheme.getCardColor(brightness),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Padding(
                                  padding: const EdgeInsets.all(16),
                                  child: Row(
                                    children: [
                                      Icon(
                                        _getFileIcon(file),
                                        color: const Color(0xFFA78BFA),
                                        size: 32,
                                      ),
                                      const SizedBox(width: 16),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              file.displayName,
                                              style: TextStyle(
                                                color: AppTheme.getForegroundColor(brightness),
                                                fontSize: 16,
                                                fontWeight: FontWeight.w500,
                                              ),
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                            const SizedBox(height: 4),
                                            Text(
                                              file.formattedSize,
                                              style: TextStyle(
                                                color: AppTheme.getMutedForegroundColor(brightness),
                                                fontSize: 14,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      Icon(
                                        CupertinoIcons.chevron_right,
                                        color: AppTheme.getMutedForegroundColor(brightness),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          );
                        },
                      ),
          ),

          // Add Document button
          Padding(
            padding: const EdgeInsets.all(24),
            child: SizedBox(
              width: double.infinity,
              child: CupertinoButton.filled(
                onPressed: _isUploading ? null : _pickAndUploadFile,
                child: _isUploading
                    ? SizedBox(
                        width: 20,
                        height: 20,
                        child: CupertinoActivityIndicator(
                          color: AppTheme.getCardColor(brightness),
                        ),
                      )
                    : const Text(
                        'Add New',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(Brightness brightness) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            CupertinoIcons.doc_text,
            size: 64,
            color: AppTheme.getMutedForegroundColor(brightness).withValues(alpha: 0.5),
          ),
          const SizedBox(height: 16),
          Text(
            'No documents',
            style: TextStyle(
              color: AppTheme.getForegroundColor(brightness),
              fontSize: 18,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Add a document to get started',
            style: TextStyle(
              color: AppTheme.getMutedForegroundColor(brightness),
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }
}

/// Layer 3: Document viewer with swipe navigation
class _DocumentViewerScreen extends ConsumerStatefulWidget {
  final List<DocumentInfo> files;
  final int initialIndex;
  final String showId;
  final VoidCallback onDocumentDeleted;

  const _DocumentViewerScreen({
    required this.files,
    required this.initialIndex,
    required this.showId,
    required this.onDocumentDeleted,
  });

  @override
  ConsumerState<_DocumentViewerScreen> createState() => _DocumentViewerScreenState();
}

class _DocumentViewerScreenState extends ConsumerState<_DocumentViewerScreen> {
  late PageController _pageController;
  late int _currentFileIndex;
  late List<DocumentInfo> _files;

  @override
  void initState() {
    super.initState();
    _currentFileIndex = widget.initialIndex;
    _files = List.from(widget.files);
    _pageController = PageController(initialPage: widget.initialIndex);
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _nextFile() {
    if (_currentFileIndex < _files.length - 1) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    }
  }

  void _previousFile() {
    if (_currentFileIndex > 0) {
      _pageController.previousPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    }
  }

  Future<void> _copyDocumentLink() async {
    if (_files.isEmpty) return;

    final file = _files[_currentFileIndex];
    final supabase = ref.read(supabaseClientProvider);
    final shareService = DocumentShareService(supabase: supabase);

    await shareService.copyLinkToClipboard(
      document: file,
      context: context,
    );
  }

  Future<void> _shareDocument() async {
    if (_files.isEmpty) return;

    final file = _files[_currentFileIndex];
    final supabase = ref.read(supabaseClientProvider);
    final shareService = DocumentShareService(supabase: supabase);

    // Get the show title if available (we can fetch from route params or database)
    final showTitle = 'Show Document'; // Default fallback

    await shareService.shareDocument(
      document: file,
      showTitle: showTitle,
      context: context,
    );
  }

  Future<void> _deleteCurrentFile() async {
    if (_files.isEmpty) return;
    
    final file = _files[_currentFileIndex];
    
    // Show confirmation dialog
    final confirmed = await showCupertinoDialog<bool>(
      context: context,
      builder: (context) => CupertinoAlertDialog(
        title: const Text('Delete File'),
        content: Text('Are you sure you want to delete "${file.displayName}"?'),
        actions: [
          CupertinoButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          CupertinoButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      final supabase = ref.read(supabaseClientProvider);
      
      // Delete from storage
      await supabase.storage
          .from('advancing-files')
          .remove([file.storagePath]);
      
      // Delete from database using RPC function
      await supabase.rpc('delete_file', params: {
        'p_file_id': file.id,
        'p_show_id': widget.showId,
      });

      // Update state
      setState(() {
        _files.removeAt(_currentFileIndex);
        if (_currentFileIndex >= _files.length && _files.isNotEmpty) {
          _currentFileIndex = _files.length - 1;
        }
      });

      // Notify parent
      widget.onDocumentDeleted();

      if (mounted) {
        AppToast.success(context, 'File deleted');
        
        // If no files left, go back
        if (_files.isEmpty) {
          Navigator.of(context).pop();
        }
      }
    } catch (e) {
      if (mounted) {
        AppToast.error(context, 'Failed to delete file: $e');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;

    return LayerScaffold(
      title: '',
      body: Column(
        children: [
          // Header with file info
          if (_files.isNotEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      _files[_currentFileIndex].displayName,
                      style: TextStyle(
                        color: AppTheme.getMutedForegroundColor(brightness),
                        fontSize: 14,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  Text(
                    'File ${_currentFileIndex + 1} of ${_files.length}',
                    style: TextStyle(
                      color: AppTheme.getMutedForegroundColor(brightness),
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
          
          // File viewer
          Expanded(
            child: _files.isEmpty
                ? const Center(child: Text('No files'))
                : PageView.builder(
                    controller: _pageController,
                    onPageChanged: (index) {
                      setState(() => _currentFileIndex = index);
                    },
                    itemCount: _files.length,
                    itemBuilder: (context, index) {
                      return _FileViewer(
                        file: _files[index],
                      );
                    },
                  ),
          ),

          // Navigation arrows
          if (_files.isNotEmpty && _files.length > 1)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  GestureDetector(
                    onTap: _currentFileIndex > 0 ? _previousFile : null,
                    child: Icon(
                      CupertinoIcons.chevron_left,
                      color: _currentFileIndex > 0
                          ? AppTheme.getForegroundColor(brightness)
                          : AppTheme.getMutedForegroundColor(brightness).withValues(alpha: 0.3),
                      size: 32,
                    ),
                  ),
                  const SizedBox(width: 24),
                  GestureDetector(
                    onTap: _currentFileIndex < _files.length - 1 ? _nextFile : null,
                    child: Icon(
                      CupertinoIcons.chevron_right,
                      color: _currentFileIndex < _files.length - 1
                          ? AppTheme.getForegroundColor(brightness)
                          : AppTheme.getMutedForegroundColor(brightness).withValues(alpha: 0.3),
                      size: 32,
                    ),
                  ),
                ],
              ),
            ),

          // Action buttons
          Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              children: [
                // Delete, Copy, Share buttons
                if (_files.isNotEmpty)
                  Row(
                    children: [
                      // Delete button
                      CupertinoButton.filled(
                        onPressed: _deleteCurrentFile,
                        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                        child: const Text('Delete'),
                      ),
                      const Spacer(),
                      // Copy button
                      CupertinoButton(
                        onPressed: _copyDocumentLink,
                        child: Icon(CupertinoIcons.doc_on_doc, color: AppTheme.getForegroundColor(brightness)),
                      ),
                      // Share button
                      CupertinoButton(
                        onPressed: _shareDocument,
                        child: Icon(CupertinoIcons.share, color: AppTheme.getForegroundColor(brightness)),
                      ),
                    ],
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Individual file viewer - shows preview or PDF/image based on file type
class _FileViewer extends ConsumerStatefulWidget {
  final DocumentInfo file;

  const _FileViewer({
    required this.file,
  });

  @override
  ConsumerState<_FileViewer> createState() => _FileViewerState();
}

class _FileViewerState extends ConsumerState<_FileViewer> {
  String? _signedUrl;
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadFile();
  }

  Future<void> _loadFile() async {
    try {
      final supabase = ref.read(supabaseClientProvider);
      
      // Get signed URL for the file (valid for 1 hour)
      final url = await supabase.storage
          .from('advancing-files')
          .createSignedUrl(widget.file.storagePath, 3600);
      
      setState(() {
        _signedUrl = url;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;

    if (_isLoading) {
      return const Center(child: CupertinoActivityIndicator());
    }

    if (_error != null || _signedUrl == null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(CupertinoIcons.exclamationmark_circle, size: 48, color: CupertinoColors.systemRed),
            const SizedBox(height: 16),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Text(
                'Failed to load file',
                style: TextStyle(color: AppTheme.getForegroundColor(brightness)),
                textAlign: TextAlign.center,
              ),
            ),
          ],
        ),
      );
    }

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 24),
      decoration: BoxDecoration(
        color: CupertinoColors.white,
        borderRadius: BorderRadius.circular(12),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: _buildContent(brightness),
      ),
    );
  }

  Widget _buildContent(Brightness brightness) {
    // PDF viewer using Syncfusion - loads directly from URL
    if (widget.file.isPdf && _signedUrl != null) {
      return SfPdfViewer.network(
        _signedUrl!,
        canShowScrollHead: true,
        canShowScrollStatus: true,
        enableDoubleTapZooming: true,
        onDocumentLoadFailed: (details) {
          debugPrint('PDF load failed: ${details.error}');
        },
      );
    }

    // Image viewer
    if (widget.file.isImage && _signedUrl != null) {
      return Image.network(
        _signedUrl!,
        fit: BoxFit.contain,
        loadingBuilder: (context, child, loadingProgress) {
          if (loadingProgress == null) return child;
          return const Center(
            child: CupertinoActivityIndicator(),
          );
        },
        errorBuilder: (context, error, stackTrace) {
          return _buildFileIcon(brightness);
        },
      );
    }

    // Default file icon for other types
    return _buildFileIcon(brightness);
  }

  Widget _buildFileIcon(Brightness brightness) {
    IconData icon;
    final contentType = widget.file.contentType?.toLowerCase() ?? '';
    
    if (contentType.contains('pdf')) {
      icon = CupertinoIcons.doc;
    } else if (contentType.contains('word') || contentType.contains('document')) {
      icon = CupertinoIcons.doc_text;
    } else if (contentType.contains('excel') || contentType.contains('spreadsheet')) {
      icon = CupertinoIcons.table;
    } else if (contentType.contains('text') || contentType.contains('csv')) {
      icon = CupertinoIcons.doc_plaintext;
    } else {
      icon = CupertinoIcons.doc;
    }

    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 64, color: CupertinoColors.systemGrey),
          const SizedBox(height: 16),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Text(
              widget.file.displayName,
              style: TextStyle(
                color: CupertinoColors.systemGrey,
                fontSize: 16,
                fontWeight: FontWeight.w500,
              ),
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          if (widget.file.formattedSize.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              widget.file.formattedSize,
              style: TextStyle(
                color: CupertinoColors.systemGrey,
                fontSize: 14,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
