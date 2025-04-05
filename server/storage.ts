import { users, messages, type User, type InsertUser, type Message, type InsertMessage, 
  type Conversation, type InsertConversation } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import { config } from "./config";
import { v4 as uuidv4 } from "uuid";
import { ProcessedDocument } from "./document-processor";

const MemoryStore = createMemoryStore(session);

// Document interface for RAG system
export interface DocumentMetadata {
  id: string;
  filename: string;
  fileType: string;
  userId: number;
  uploadDate: Date;
  fileSize: number;
}

export interface DocumentChunk {
  content: string;
  metadata: DocumentMetadata;
}

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  makeUserAdmin(userId: number): Promise<User>;
  
  // Conversation management
  getConversations(userId: number): Promise<Conversation[]>;
  getConversation(id: number): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversationTitle(id: number, title: string): Promise<Conversation>;
  deleteConversation(id: number): Promise<void>;
  
  // Message management
  getMessages(userId: number, conversationId?: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // Admin functionality
  validateAdminKey(adminKey: string): Promise<boolean>;
  getAllUsers(): Promise<User[]>;
  getConversationCount(): Promise<number>;
  getMessageCount(): Promise<number>;
  
  // RAG functionality
  storeDocument(document: ProcessedDocument): Promise<string>;
  searchDocuments(query: string, userId: number): Promise<DocumentChunk[]>;
  getUserDocuments(userId: number): Promise<DocumentMetadata[]>;
  deleteDocument(documentId: string, userId: number): Promise<boolean>;
  
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private messages: Map<number, Message>;
  private conversations: Map<number, Conversation>;
  private documents: Map<string, DocumentMetadata>;
  private documentChunks: Map<string, DocumentChunk[]>;
  private adminKey: string = process.env.ADMIN_KEY || "admin123"; // Default admin key, should be changed in production
  
  currentUserId: number;
  currentMessageId: number;
  currentConversationId: number;
  sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.messages = new Map();
    this.conversations = new Map();
    this.documents = new Map();
    this.documentChunks = new Map();
    this.currentUserId = 1;
    this.currentMessageId = 1;
    this.currentConversationId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
  }

  // User management methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id,
      isAdmin: insertUser.isAdmin || false,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }
  
  async makeUserAdmin(userId: number): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    const updatedUser: User = {
      ...user,
      isAdmin: true
    };
    
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  // Conversation management methods
  async getConversations(userId: number): Promise<Conversation[]> {
    return Array.from(this.conversations.values())
      .filter(conversation => conversation.userId === userId)
      .sort((a, b) => {
        const dateA = a.updatedAt instanceof Date ? a.updatedAt : new Date(a.updatedAt);
        const dateB = b.updatedAt instanceof Date ? b.updatedAt : new Date(b.updatedAt);
        // Sort by most recent first
        return dateB.getTime() - dateA.getTime();
      });
  }
  
  async getConversation(id: number): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }
  
  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const id = this.currentConversationId++;
    const now = new Date();
    
    const newConversation: Conversation = {
      ...conversation,
      id,
      createdAt: now,
      updatedAt: now
    };
    
    this.conversations.set(id, newConversation);
    return newConversation;
  }
  
  async updateConversationTitle(id: number, title: string): Promise<Conversation> {
    const conversation = this.conversations.get(id);
    if (!conversation) {
      throw new Error(`Conversation with ID ${id} not found`);
    }
    
    const updatedConversation: Conversation = {
      ...conversation,
      title,
      updatedAt: new Date()
    };
    
    this.conversations.set(id, updatedConversation);
    return updatedConversation;
  }
  
  async deleteConversation(id: number): Promise<void> {
    if (!this.conversations.has(id)) {
      throw new Error(`Conversation with ID ${id} not found`);
    }
    
    this.conversations.delete(id);
    
    // Delete all messages associated with this conversation
    const messagesToDelete: number[] = [];
    
    // First, find all message IDs to delete
    this.messages.forEach((message, messageId) => {
      if (message.conversationId === id) {
        messagesToDelete.push(messageId);
      }
    });
    
    // Then delete them
    for (const messageId of messagesToDelete) {
      this.messages.delete(messageId);
    }
  }

  // Message management methods
  async getMessages(userId: number, conversationId?: number | null | undefined): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => {
        if (message.userId !== userId) return false;
        if (conversationId !== undefined && message.conversationId !== conversationId) return false;
        return true;
      })
      .sort((a, b) => {
        const dateA = a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp);
        const dateB = b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp);
        return dateA.getTime() - dateB.getTime();
      });
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.currentMessageId++;
    const message: Message = { 
      ...insertMessage, 
      id,
      isAi: insertMessage.isAi || false,
      model: insertMessage.model || null,
      conversationId: insertMessage.conversationId || null,
      timestamp: new Date()
    };
    
    this.messages.set(id, message);
    
    // Update the conversation's updatedAt timestamp if this message belongs to a conversation
    if (message.conversationId) {
      const conversation = this.conversations.get(message.conversationId);
      if (conversation) {
        conversation.updatedAt = new Date();
        this.conversations.set(message.conversationId, conversation);
      }
    }
    
    return message;
  }
  
  // Admin functionality
  async validateAdminKey(adminKey: string): Promise<boolean> {
    return adminKey === this.adminKey;
  }
  
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  async getConversationCount(): Promise<number> {
    return this.conversations.size;
  }
  
  async getMessageCount(): Promise<number> {
    return this.messages.size;
  }
  
  // RAG functionality
  async storeDocument(document: ProcessedDocument): Promise<string> {
    try {
      // Generate unique ID for the document
      const documentId = uuidv4();
      
      // Create document metadata
      const metadata: DocumentMetadata = {
        id: documentId,
        filename: document.metadata.filename,
        fileType: document.metadata.fileType,
        userId: document.metadata.userId,
        uploadDate: document.metadata.uploadDate,
        fileSize: document.metadata.fileSize
      };
      
      // Store document metadata
      this.documents.set(documentId, metadata);
      
      // Simple text chunking implementation
      const chunkSize = 1000;
      const chunkOverlap = 200;
      const content = document.content;
      const textChunks: string[] = [];
      
      // Simple implementation to split text into overlapping chunks
      let startIndex = 0;
      while (startIndex < content.length) {
        const chunk = content.substring(
          startIndex, 
          Math.min(startIndex + chunkSize, content.length)
        );
        textChunks.push(chunk);
        
        // Move the start index forward by chunkSize - chunkOverlap
        startIndex += (chunkSize - chunkOverlap);
        
        // If the next chunk would be too small, just exit
        if (startIndex + (chunkSize / 2) >= content.length) {
          break;
        }
      }
      
      // Create document chunks
      const chunks: DocumentChunk[] = textChunks.map((chunkContent: string) => ({
        content: chunkContent,
        metadata
      }));
      
      // Store document chunks
      this.documentChunks.set(documentId, chunks);
      
      return documentId;
    } catch (error) {
      console.error('Error storing document:', error);
      throw error;
    }
  }
  
  async searchDocuments(query: string, userId: number): Promise<DocumentChunk[]> {
    try {
      // For a simple in-memory implementation, we'll just do basic keyword matching
      // In a real implementation, this would use vector similarity search
      const allChunks: DocumentChunk[] = [];
      
      // Gather all chunks from user's documents
      this.documentChunks.forEach(chunks => {
        chunks.forEach(chunk => {
          if (chunk.metadata.userId === userId) {
            allChunks.push(chunk);
          }
        });
      });
      
      // Simple keyword search - split query into keywords
      const keywords = query.toLowerCase().split(/\s+/).filter(word => word.length > 3);
      
      // Score each chunk based on keyword matches
      const scoredChunks = allChunks.map(chunk => {
        const content = chunk.content.toLowerCase();
        let score = 0;
        
        keywords.forEach(keyword => {
          // Count occurrences of each keyword
          const regex = new RegExp(keyword, 'gi');
          const matches = content.match(regex);
          if (matches) {
            score += matches.length;
          }
        });
        
        return { chunk, score };
      });
      
      // Sort by score and return top results
      return scoredChunks
        .sort((a, b) => b.score - a.score)
        .filter(item => item.score > 0)
        .slice(0, 5)
        .map(item => item.chunk);
    } catch (error) {
      console.error('Error searching documents:', error);
      return [];
    }
  }
  
  async getUserDocuments(userId: number): Promise<DocumentMetadata[]> {
    return Array.from(this.documents.values())
      .filter(doc => doc.userId === userId)
      .sort((a, b) => {
        const dateA = a.uploadDate instanceof Date ? a.uploadDate : new Date(a.uploadDate);
        const dateB = b.uploadDate instanceof Date ? b.uploadDate : new Date(b.uploadDate);
        return dateB.getTime() - dateA.getTime();
      });
  }
  
  async deleteDocument(documentId: string, userId: number): Promise<boolean> {
    const document = this.documents.get(documentId);
    
    if (!document || document.userId !== userId) {
      return false;
    }
    
    this.documents.delete(documentId);
    this.documentChunks.delete(documentId);
    
    return true;
  }
}

export const storage = new MemStorage();
