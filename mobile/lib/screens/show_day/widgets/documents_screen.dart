import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:file_picker/file_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:syncfusion_flutter_pdfviewer/pdfviewer.dart';
import '../../../components/components.dart';
import '../../../models/show_day.dart';
import '../../../providers/auth_provider.dart';

/// Layer 2: Documents viewer screen with file upload
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
  late PageController _pageController;
  int _currentFileIndex = 0;
  List<DocumentInfo> _files = [];
  bool _isLoading = true;
  bool _isUploading = false;

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
    _loadFiles();
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  Future<void> _loadFiles() async {
    setState(() => _isLoading = true);
    
    try {
      final supabase = ref.read(supabaseClientProvider);
      
      // Use RPC function to bypass RLS
      final response = await supabase.rpc('get_show_files', params: {
        'p_show_id': widget.showId,
      });
      
      final List<dynamic> data = response as List<dynamic>;
      setState(() {
        _files = data.map((json) => DocumentInfo.fromJson(json as Map<String, dynamic>)).toList();
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        AppToast.error(context, 'Failed to load files: $e');
      }
    }
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
      
      // Generate unique file path: org_id/show_id/timestamp_filename
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final storagePath = '${widget.orgId}/${widget.showId}/${timestamp}_$fileName';
      
      // Upload to storage
      await supabase.storage
          .from('advancing-files')
          .uploadBinary(storagePath, fileBytes, fileOptions: FileOptions(contentType: contentType));
      
      // Create file record in database using RPC function
      await supabase.rpc('create_file', params: {
        'p_org_id': widget.orgId,
        'p_show_id': widget.showId,
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

  Future<void> _deleteCurrentFile() async {
    if (_files.isEmpty) return;
    
    final file = _files[_currentFileIndex];
    
    // Show confirmation dialog
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete File'),
        content: Text('Are you sure you want to delete "${file.displayName}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
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
      widget.onDocumentAdded?.call();

      if (mounted) {
        AppToast.success(context, 'File deleted');
      }
    } catch (e) {
      if (mounted) {
        AppToast.error(context, 'Failed to delete file: $e');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

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
                  Text(
                    _files[_currentFileIndex].displayName,
                    style: TextStyle(
                      color: colorScheme.onSurfaceVariant,
                      fontSize: 14,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    'File ${_currentFileIndex + 1} of ${_files.length}',
                    style: TextStyle(
                      color: colorScheme.onSurfaceVariant,
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
          
          // File viewer
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _files.isEmpty
                    ? _buildEmptyState(colorScheme)
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
                      Icons.chevron_left,
                      color: _currentFileIndex > 0
                          ? colorScheme.onSurface
                          : colorScheme.onSurfaceVariant.withValues(alpha: 0.3),
                      size: 32,
                    ),
                  ),
                  const SizedBox(width: 24),
                  GestureDetector(
                    onTap: _currentFileIndex < _files.length - 1 ? _nextFile : null,
                    child: Icon(
                      Icons.chevron_right,
                      color: _currentFileIndex < _files.length - 1
                          ? colorScheme.onSurface
                          : colorScheme.onSurfaceVariant.withValues(alpha: 0.3),
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
                      ElevatedButton(
                        onPressed: _deleteCurrentFile,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.red,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(24),
                          ),
                          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                        ),
                        child: const Text('Delete'),
                      ),
                      const Spacer(),
                      // Copy button
                      IconButton(
                        onPressed: () {
                          AppToast.info(context, 'Copy coming soon');
                        },
                        icon: Icon(Icons.copy, color: colorScheme.onSurface),
                      ),
                      // Share button
                      IconButton(
                        onPressed: () {
                          AppToast.info(context, 'Share coming soon');
                        },
                        icon: Icon(Icons.ios_share, color: colorScheme.onSurface),
                      ),
                    ],
                  ),
                const SizedBox(height: 16),
                // Add Document button - matches AddButton style
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _isUploading ? null : _pickAndUploadFile,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: colorScheme.onSurface,
                      foregroundColor: colorScheme.surface,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(32),
                      ),
                      elevation: 0,
                    ),
                    child: _isUploading
                        ? SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: colorScheme.surface,
                            ),
                          )
                        : const Text(
                            'Add',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                  ),
                ),
              ],
            ),
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
            Icons.description_outlined,
            size: 64,
            color: colorScheme.onSurfaceVariant.withValues(alpha: 0.5),
          ),
          const SizedBox(height: 16),
          Text(
            'No documents',
            style: TextStyle(
              color: colorScheme.onSurface,
              fontSize: 18,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Add a document to get started',
            style: TextStyle(
              color: colorScheme.onSurfaceVariant,
              fontSize: 14,
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
    final colorScheme = Theme.of(context).colorScheme;

    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null || _signedUrl == null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 48, color: colorScheme.error),
            const SizedBox(height: 16),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Text(
                'Failed to load file',
                style: TextStyle(color: colorScheme.onSurface),
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
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: _buildContent(colorScheme),
      ),
    );
  }

  Widget _buildContent(ColorScheme colorScheme) {
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
          return Center(
            child: CircularProgressIndicator(
              value: loadingProgress.expectedTotalBytes != null
                  ? loadingProgress.cumulativeBytesLoaded / loadingProgress.expectedTotalBytes!
                  : null,
            ),
          );
        },
        errorBuilder: (context, error, stackTrace) {
          return _buildFileIcon(colorScheme);
        },
      );
    }

    // Default file icon for other types
    return _buildFileIcon(colorScheme);
  }

  Widget _buildFileIcon(ColorScheme colorScheme) {
    IconData icon;
    final contentType = widget.file.contentType?.toLowerCase() ?? '';
    
    if (contentType.contains('pdf')) {
      icon = Icons.picture_as_pdf;
    } else if (contentType.contains('word') || contentType.contains('document')) {
      icon = Icons.description;
    } else if (contentType.contains('excel') || contentType.contains('spreadsheet')) {
      icon = Icons.table_chart;
    } else if (contentType.contains('text') || contentType.contains('csv')) {
      icon = Icons.article;
    } else {
      icon = Icons.insert_drive_file;
    }

    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 64, color: Colors.grey[400]),
          const SizedBox(height: 16),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Text(
              widget.file.displayName,
              style: TextStyle(
                color: Colors.grey[600],
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
                color: Colors.grey[400],
                fontSize: 14,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
