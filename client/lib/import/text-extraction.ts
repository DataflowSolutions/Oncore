// Import worker before PDFParse to fix "Setting up fake worker failed" error
// See: https://github.com/mehmet-kozan/pdf-parse/blob/HEAD/docs/troubleshooting.md#4-error-setting-up-fake-worker-failed
import "pdf-parse/worker";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import { createWorker } from "tesseract.js";
import { logger } from "@/lib/logger";

/**
 * Enterprise-grade text extraction service supporting multiple file formats.
 * Handles PDFs, DOCX, TXT, HTML, and Images (via OCR).
 * Returns extracted text or empty string on failure (with logging).
 */

export interface ExtractTextOptions {
  fileName: string;
  mimeType?: string;
  buffer: Buffer;
}

export interface ExtractTextResult {
  text: string;
  pageCount?: number;
  wordCount?: number;
  isLowText?: boolean;
  error?: string;
}

/**
 * Extract text from a file buffer based on its MIME type or extension.
 * Delegates to specialized extractors for PDF, DOCX, etc.
 */
export async function extractText(options: ExtractTextOptions): Promise<ExtractTextResult> {
  const { fileName, mimeType, buffer } = options;

  try {
    // Determine format from MIME type or file extension
    const mime = (mimeType || "").toLowerCase();
    const ext = fileName.toLowerCase().split(".").pop() || "";

    if (mime.includes("pdf") || ext === "pdf") {
      return await extractFromPDF(buffer, fileName);
    }

    if (mime.includes("wordprocessingml") || mime.includes("msword") || ext === "docx" || ext === "doc") {
      return await extractFromDOCX(buffer, fileName);
    }

    if (mime.startsWith("image/") || ["jpg", "jpeg", "png", "bmp", "webp"].includes(ext)) {
      return await extractFromImage(buffer, fileName);
    }

    if (mime.startsWith("text/") || ["txt", "md", "csv", "json", "html", "xml"].includes(ext)) {
      return extractFromText(buffer, fileName);
    }

    // Unsupported format; return empty with warning
    logger.warn("Unsupported file format for text extraction", { fileName, mimeType, ext });
    return {
      text: "",
      error: `Unsupported format: ${ext || mimeType}`,
    };
  } catch (error) {
    logger.error("Text extraction failed", { fileName, mimeType, error });
    return {
      text: "",
      error: error instanceof Error ? error.message : "Unknown extraction error",
    };
  }
}

/**
 * Extract text from PDF using pdf-parse v2 API.
 */
async function extractFromPDF(buffer: Buffer, fileName: string): Promise<ExtractTextResult> {
  let parser: PDFParse | null = null;
  try {
    // pdf-parse v2 uses class-based API
    parser = new PDFParse({ data: buffer });
    const result = await parser.getText();

    const wordCount = countWords(result.text);
    const isLowText = isLowTextDocument(wordCount, result.total);

    if (isLowText) {
      logger.warn("PDF has low text content - likely image-based", {
        fileName,
        pages: result.total,
        words: wordCount,
        hint: "OCR may be required but is not supported for PDFs in this environment (requires PDF-to-Image conversion)"
      });
    }

    logger.info("PDF text extracted", {
      fileName,
      pages: result.total,
      words: wordCount,
      isLowText,
    });

    return {
      text: result.text,
      pageCount: result.total,
      wordCount,
      isLowText,
    };
  } catch (error) {
    logger.error("PDF extraction failed", { fileName, error });
    return {
      text: "",
      error: error instanceof Error ? error.message : "PDF parsing error",
    };
  } finally {
    // Clean up parser resources
    if (parser) {
      try {
        await parser.destroy();
      } catch (err) {
        // Ignore cleanup errors
      }
    }
  }
}

/**
 * Extract text from Images using Tesseract.js OCR.
 */
async function extractFromImage(buffer: Buffer, fileName: string): Promise<ExtractTextResult> {
  try {
    logger.info("Starting OCR for image", { fileName });

    const worker = await createWorker('eng');
    const ret = await worker.recognize(buffer);
    const text = ret.data.text;
    await worker.terminate();

    const wordCount = countWords(text);

    logger.info("OCR complete", {
      fileName,
      words: wordCount,
    });

    return {
      text,
      wordCount,
      isLowText: false, // Assume OCR text is valuable even if short
    };
  } catch (error) {
    logger.error("OCR extraction failed", { fileName, error });
    return {
      text: "",
      error: error instanceof Error ? error.message : "OCR error",
    };
  }
}

/**
 * Extract text from DOCX using mammoth.
 */
async function extractFromDOCX(buffer: Buffer, fileName: string): Promise<ExtractTextResult> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value || "";
    const wordCount = countWords(text);
    const isLowText = isLowTextDocument(wordCount, undefined);

    logger.info("DOCX text extracted", {
      fileName,
      words: wordCount,
      messages: result.messages.length,
      isLowText,
    });

    return {
      text,
      wordCount,
      isLowText,
    };
  } catch (error) {
    logger.error("DOCX extraction failed", { fileName, error });
    return {
      text: "",
      error: error instanceof Error ? error.message : "DOCX parsing error",
    };
  }
}

/**
 * Extract text from plain text files (UTF-8).
 */
function extractFromText(buffer: Buffer, fileName: string): ExtractTextResult {
  try {
    const text = buffer.toString("utf-8");
    const wordCount = countWords(text);
    const isLowText = isLowTextDocument(wordCount, undefined);

    logger.info("Text file extracted", {
      fileName,
      words: wordCount,
      isLowText,
    });

    return {
      text,
      wordCount,
      isLowText,
    };
  } catch (error) {
    logger.error("Text file extraction failed", { fileName, error });
    return {
      text: "",
      error: error instanceof Error ? error.message : "Text decoding error",
    };
  }
}

function countWords(text: string): number {
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

function isLowTextDocument(wordCount?: number, pageCount?: number): boolean {
  const words = wordCount ?? 0;
  if (words <= 0) return true;
  const wordsPerPage = pageCount && pageCount > 0 ? words / pageCount : words;
  return words < 200 || wordsPerPage < 30;
}
