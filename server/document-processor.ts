import fs from "fs/promises";
import path from "path";
// Using dynamic import for pdf-parse to avoid startup issues
const pdfParse = async (buffer: Buffer) => {
  try {
    const module = await import('pdf-parse');
    return module.default(buffer);
  } catch (error) {
    console.error("Error loading pdf-parse:", error);
    return { text: "Failed to parse PDF document" };
  }
};
import mammoth from "mammoth";
import { storage } from "./storage";
import { config } from "./config";
import { fileURLToPath } from 'url';

// Get the directory name using ES module compatible approach
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a directory for storing uploaded files
const UPLOAD_DIR = path.join(__dirname, "uploads");

// Ensure upload directory exists
async function ensureUploadDir() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  } catch (error) {
    console.error("Failed to create upload directory:", error);
  }
}

// Initialize upload directory
ensureUploadDir();

export interface ProcessedDocument {
  content: string;
  metadata: {
    filename: string;
    fileType: string;
    userId: number;
    uploadDate: Date;
    fileSize: number;
  };
}

/**
 * Process a document for the RAG system based on file type
 */
export async function processDocument(
  file: {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    destination?: string;
    filename?: string;
    path?: string;
    buffer: Buffer;
  },
  userId: number
): Promise<ProcessedDocument> {
  const fileType = path.extname(file.originalname).toLowerCase();
  let content = "";

  try {
    // Extract text based on file type
    if (fileType === ".pdf") {
      const dataBuffer = file.buffer;
      const pdfData = await pdfParse(dataBuffer);
      content = pdfData.text;
    } else if (fileType === ".docx" || fileType === ".doc") {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      content = result.value;
    } else if (fileType === ".txt") {
      content = file.buffer.toString("utf-8");
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }

    // Create processed document object
    const processedDocument: ProcessedDocument = {
      content,
      metadata: {
        filename: file.originalname,
        fileType: fileType.substring(1), // Remove the dot
        userId,
        uploadDate: new Date(),
        fileSize: file.size,
      },
    };

    // Save document to storage
    await storage.storeDocument(processedDocument);

    return processedDocument;
  } catch (error) {
    console.error(`Error processing document ${file.originalname}:`, error);
    throw error;
  }
}

/**
 * Get document context based on query
 */
export async function getDocumentContext(query: string, userId: number): Promise<string> {
  try {
    // Search documents for relevant chunks
    const relevantChunks = await storage.searchDocuments(query, userId);

    // If no relevant chunks found, return empty string
    if (relevantChunks.length === 0) {
      return "";
    }

    // Only use up to the maximum number of chunks defined in the config (default 3)
    const maxChunks = config.maxContextChunks || 3;
    const chunks = relevantChunks.slice(0, maxChunks).map(chunk => 
      `From document: ${chunk.metadata.filename}\n${chunk.content}\n\n`
    );

    return chunks.join("");
  } catch (error) {
    console.error("Error retrieving document context:", error);
    return "";
  }
}

/**
 * Get a list of all documents for a user
 */
export async function getUserDocuments(userId: number) {
  try {
    return await storage.getUserDocuments(userId);
  } catch (error) {
    console.error("Error getting user documents:", error);
    return [];
  }
}

/**
 * Delete a document by ID
 */
export async function deleteDocument(documentId: string, userId: number): Promise<boolean> {
  try {
    return await storage.deleteDocument(documentId, userId);
  } catch (error) {
    console.error(`Error deleting document ${documentId}:`, error);
    return false;
  }
}