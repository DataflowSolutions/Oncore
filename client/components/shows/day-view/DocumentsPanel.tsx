"use client";

import { useState, useRef } from "react";
import {
  FileText,
  Upload,
  Eye,
  Download,
  Plus,
  Loader2,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { logger } from "@/lib/logger";
import {
  getAdvancingFileUrl,
  uploadAdvancingFile,
  deleteAdvancingFile,
} from "@/lib/actions/advancing-files";
import { createAdvancingDocument } from "@/lib/actions/advancing";
import { FilePreviewModal } from "@/components/advancing/FilePreviewModal";

type PartyType = "from_us" | "from_you";

interface DocumentFile {
  id: string;
  original_name: string | null;
  content_type: string | null;
  size_bytes: number | null;
  storage_path: string;
  created_at: string;
}

interface AdvancingDocument {
  id: string;
  label: string | null;
  party_type: PartyType;
  created_at: string;
  files: DocumentFile[] | null;
}

interface AssignedPerson {
  person_id: string;
  duty: string | null;
  people: {
    id: string;
    name: string;
    member_type: string | null;
  } | null;
}

interface DocumentsPanelProps {
  documents: AdvancingDocument[];
  assignedPeople: AssignedPerson[];
  orgSlug: string;
  sessionId: string;
}

const documentCategories = [
  { value: "contract", label: "Contract" },
  { value: "rider", label: "Rider" },
  // { value: "advancing", label: "Advancing" },
  { value: "boarding_pass", label: "Boarding Pass" },
  { value: "visa", label: "Visa" },
  { value: "other", label: "Other" },
];

const formatFileSize = (bytes: number | null) => {
  if (!bytes || bytes <= 0) return "Unknown size";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(k)),
    sizes.length - 1
  );
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const getFileIcon = (contentType: string | null) => {
  if (!contentType) return "📎";
  if (contentType.startsWith("image/")) return "🖼️";
  if (contentType.includes("pdf")) return "📄";
  if (contentType.includes("word")) return "📝";
  if (contentType.includes("excel") || contentType.includes("sheet"))
    return "📊";
  return "📎";
};

const categorizeDocument = (label: string | null): string => {
  if (!label) return "other";
  const lower = label.toLowerCase();
  if (lower.includes("contract")) return "contract";
  if (lower.includes("rider") || lower.includes("tech")) return "rider";
  if (lower.includes("advancing")) return "advancing";
  if (lower.includes("boarding") || lower.includes("pass"))
    return "boarding_pass";
  if (lower.includes("visa")) return "visa";
  return "other";
};

const canPreview = (contentType: string | null) => {
  if (!contentType) return false;
  return (
    contentType.startsWith("image/") ||
    contentType.includes("pdf") ||
    contentType.startsWith("text/")
  );
};

export function DocumentsPanel({
  documents,
  orgSlug,
  sessionId,
}: DocumentsPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreatingDoc, setIsCreatingDoc] = useState(false);
  const [newDocLabel, setNewDocLabel] = useState("");
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Preview modal state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string>("");
  const [previewContentType, setPreviewContentType] = useState<string>("");
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const canUpload = Boolean(orgSlug && sessionId);

  const handleCreateDocument = async () => {
    if (!canUpload || !selectedCategory || !newDocLabel.trim()) return;

    setIsCreatingDoc(true);
    try {
      const result = await createAdvancingDocument(
        orgSlug!,
        sessionId!,
        "from_us", // Default to "from_us", could be made configurable
        newDocLabel
      );

      if (result.success) {
        setNewDocLabel("");
        // The page should revalidate automatically
      } else {
        logger.error("Failed to create document", result.error);
        alert(`Failed to create document: ${result.error}`);
      }
    } catch (error) {
      logger.error("Error creating document", error);
      alert("Failed to create document");
    } finally {
      setIsCreatingDoc(false);
    }
  };

  const handleFileUpload = async (documentId: string, file: File) => {
    if (!canUpload) return;

    setUploadingDocId(documentId);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const result = await uploadAdvancingFile(
        orgSlug!,
        sessionId!,
        documentId,
        formData
      );

      if (!result.success) {
        logger.error("File upload failed", result.error);
        alert(`Upload failed: ${result.error}`);
      }
    } catch (error) {
      logger.error("Error uploading file", error);
      alert("Failed to upload file");
    } finally {
      setUploadingDocId(null);
    }
  };

  const handleFileSelect = (documentId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    handleFileUpload(documentId, file);
  };

  const handleDrop = (documentId: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileUpload(documentId, files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!canUpload || !confirm("Are you sure you want to delete this file?"))
      return;

    setDeletingFileId(fileId);
    try {
      const result = await deleteAdvancingFile(orgSlug!, sessionId!, fileId);
      if (!result.success) {
        logger.error("File deletion failed", result.error);
        alert(`Delete failed: ${result.error}`);
      }
    } catch (error) {
      logger.error("Error deleting file", error);
      alert("Failed to delete file");
    } finally {
      setDeletingFileId(null);
    }
  };

  const handleDownloadFile = async (filePath: string, fileName: string) => {
    try {
      const result = await getAdvancingFileUrl(filePath);
      if (result.success && result.url) {
        const link = document.createElement("a");
        link.href = result.url;
        link.download = fileName;
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        logger.error("Failed to get download URL", result.error);
        alert(`Download failed: ${result.error}`);
      }
    } catch (error) {
      logger.error("Error downloading file", error);
      alert("Failed to download file");
    }
  };

  const handlePreviewFile = async (
    filePath: string,
    fileName: string,
    contentType: string
  ) => {
    setIsLoadingPreview(true);
    setPreviewFileName(fileName);
    setPreviewContentType(contentType);
    setIsPreviewModalOpen(true);

    try {
      const result = await getAdvancingFileUrl(filePath);
      if (result.success && result.url) {
        setPreviewUrl(result.url);
      } else {
        logger.error("Failed to get preview URL", result.error);
        alert(`Preview failed: ${result.error}`);
        setIsPreviewModalOpen(false);
      }
    } catch (error) {
      logger.error("Error loading preview", error);
      alert("Failed to load preview");
      setIsPreviewModalOpen(false);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Count documents per category
  const categoryCounts = documentCategories.map((category) => {
    const count = documents.filter(
      (doc) => categorizeDocument(doc.label) === category.value
    ).length;
    return { ...category, count };
  });

  // Get documents for selected category
  const selectedCategoryDocs = selectedCategory
    ? documents.filter(
        (doc) => categorizeDocument(doc.label) === selectedCategory
      )
    : [];

  const selectedCategoryLabel =
    documentCategories.find((c) => c.value === selectedCategory)?.label || "";

  return (
    <>
      <div className="bg-card border border-card-border rounded-[20px] p-8 w-full max-w-md mx-auto shadow-lg">
        <h3 className="text-xl font-medium text-card-foreground font-header mb-6 tracking-wide">
          Documents
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {categoryCounts.map((category) => {
            // Make 'Other' span 2 columns
            const isOther = category.value === "other";
            return (
              <div
                key={category.value}
                className={`relative bg-card-cell hover:bg-card-cell/50 rounded-full transition-colors cursor-pointer flex items-center justify-center py-3 shadow group  ${
                  isOther ? "col-span-2" : ""
                }`}
                onClick={() => {
                  setSelectedCategory(category.value);
                  setIsModalOpen(true);
                }}
              >
                <span className="z-10 text-xs font-semibold group-hover:scale-105 transition-transform duration-150 font-header">
                  {category.label}
                </span>
                {category.count > 0 ? (
                  <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-lg z-20">
                    {category.count}
                  </span>
                ) : (
                  <span className="absolute top-0 right-0 text-xs text-neutral-500 font-medium bg-card border-card-border px-2 py-0.5 rounded-full z-20">
                    0
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Document Category Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-xl">
              {selectedCategoryLabel} Documents
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-6 pr-2">
            {/* Create New Document Section */}
            {canUpload && (
              <div className="border-2 border-dashed border-neutral-700 rounded-lg p-4 bg-neutral-900/50">
                <h4 className="font-semibold text-sm mb-3">Add New Document</h4>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder={`e.g., ${selectedCategoryLabel} 2025`}
                    value={newDocLabel}
                    onChange={(e) => setNewDocLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateDocument();
                    }}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleCreateDocument}
                    disabled={isCreatingDoc || !newDocLabel.trim()}
                  >
                    {isCreatingDoc ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Create
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Existing Documents */}
            <div>
              <h4 className="font-semibold mb-3">
                Uploaded Documents ({selectedCategoryDocs.length})
              </h4>

              {selectedCategoryDocs.length === 0 ? (
                <div className="bg-neutral-800/50 rounded-lg p-6 text-center">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-neutral-600" />
                  <p className="text-sm text-neutral-400 mb-1">
                    No {selectedCategoryLabel.toLowerCase()} documents yet
                  </p>
                  <p className="text-xs text-neutral-500">
                    {canUpload
                      ? "Create a new document above to get started"
                      : "Documents will appear here once uploaded in the Advancing section"}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedCategoryDocs.map((doc) => {
                    const files = doc.files || [];
                    return (
                      <div
                        key={doc.id}
                        className="border border-neutral-700 rounded-lg p-4 bg-neutral-900/60"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h5 className="font-medium text-sm">
                              {doc.label || "Untitled Document"}
                            </h5>
                            <p className="text-xs text-neutral-500">
                              {new Date(doc.created_at).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                }
                              )}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {files.length}{" "}
                            {files.length === 1 ? "file" : "files"}
                          </Badge>
                        </div>

                        {/* Files */}
                        {files.length > 0 && (
                          <div className="space-y-2 mb-3">
                            {files.map((file) => (
                              <div
                                key={file.id}
                                className="flex items-center justify-between bg-neutral-800/50 border border-neutral-700 rounded-md p-3"
                              >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <span className="text-base flex-shrink-0">
                                    {getFileIcon(file.content_type)}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium truncate">
                                      {file.original_name || "Unnamed file"}
                                    </p>
                                    <p className="text-xs text-neutral-500">
                                      {formatFileSize(file.size_bytes)} •{" "}
                                      {new Date(
                                        file.created_at
                                      ).toLocaleDateString("en-US")}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  {canPreview(file.content_type) && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() =>
                                        handlePreviewFile(
                                          file.storage_path,
                                          file.original_name || "file",
                                          file.content_type ||
                                            "application/octet-stream"
                                        )
                                      }
                                      title="Preview"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      handleDownloadFile(
                                        file.storage_path,
                                        file.original_name || "file"
                                      )
                                    }
                                    title="Download"
                                  >
                                    <Download className="w-4 h-4" />
                                  </Button>
                                  {canUpload && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleDeleteFile(file.id)}
                                      disabled={deletingFileId === file.id}
                                      title="Delete"
                                    >
                                      {deletingFileId === file.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <Trash2 className="w-4 h-4" />
                                      )}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Upload Area */}
                        {canUpload && (
                          <div>
                            <input
                              ref={(el) => {
                                fileInputRefs.current[doc.id] = el;
                              }}
                              type="file"
                              className="hidden"
                              onChange={(e) =>
                                handleFileSelect(doc.id, e.target.files)
                              }
                              accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                            />
                            <div
                              className="border-2 border-dashed border-neutral-700 rounded-lg p-4 text-center hover:border-neutral-600 hover:bg-neutral-800/30 transition-colors cursor-pointer"
                              onClick={() =>
                                fileInputRefs.current[doc.id]?.click()
                              }
                              onDrop={(e) => handleDrop(doc.id, e)}
                              onDragOver={handleDragOver}
                            >
                              {uploadingDocId === doc.id ? (
                                <>
                                  <Loader2 className="w-6 h-6 mx-auto mb-1 text-neutral-500 animate-spin" />
                                  <p className="text-xs text-neutral-500">
                                    Uploading...
                                  </p>
                                </>
                              ) : (
                                <>
                                  <Upload className="w-6 h-6 mx-auto mb-1 text-neutral-500" />
                                  <p className="text-xs text-neutral-400">
                                    Drop files here or click to upload
                                  </p>
                                  <p className="text-xs text-neutral-600 mt-1">
                                    PDF, DOC, DOCX, TXT, JPG, PNG
                                  </p>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <FilePreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        fileUrl={previewUrl}
        fileName={previewFileName}
        contentType={previewContentType}
        isLoading={isLoadingPreview}
        onDownload={handleDownloadFile}
      />
    </>
  );
}
