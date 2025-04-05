import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import axios from "axios";
import { z } from "zod";
import { insertMessageSchema, insertConversationSchema, adminLoginSchema, modelSchema } from "@shared/schema";
import { config } from "./config";
import multer from "multer";
import path from "path";
import { processDocument, getDocumentContext, getUserDocuments, deleteDocument } from "./document-processor";

// Configure multer for in-memory file storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB file size limit
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // Chat message routes
  app.get("/api/messages", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      let conversationId: number | undefined = undefined;
      
      // Check if conversationId is provided as a query parameter
      if (req.query.conversationId) {
        conversationId = parseInt(req.query.conversationId as string);
        if (isNaN(conversationId)) {
          return res.status(400).json({ message: "Invalid conversation ID" });
        }
      }
      
      const messages = await storage.getMessages(req.user!.id, conversationId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/messages", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      // Validate message data
      const messageData = insertMessageSchema.parse({
        ...req.body,
        userId: req.user!.id
      });
      
      // Save user message
      const userMessage = await storage.createMessage(messageData);
      
      // Only make Ollama API call if this is a user message
      if (!messageData.isAi) {
        try {
          // Prepare context with previous messages if memory is enabled
          let prompt = messageData.content;
          let contextAdded = false;
          
          // Add document context if RAG is enabled
          if (config.ragEnabled) {
            try {
              // Get relevant document context for the query
              const documentContext = await getDocumentContext(messageData.content, req.user!.id);
              
              if (documentContext && documentContext.trim().length > 0) {
                // Add document context to prompt
                prompt = `I'll provide some context from documents that might help answer this question:\n\n${documentContext}\n\nWith this context in mind, please answer the following question: ${messageData.content}`;
                contextAdded = true;
              }
            } catch (error) {
              console.error("Error retrieving document context:", error);
              // Continue without document context if there's an error
            }
          }
          
          // Add conversation memory if enabled (and if RAG wasn't already used)
          if (config.memoryEnabled && !contextAdded) {
            try {
              // Get previous messages to create context
              const conversationId = messageData.conversationId || undefined;
              const previousMessages = await storage.getMessages(req.user!.id, conversationId);
              
              // Apply memory window to limit context size
              const memoryWindow = config.memoryWindow || 10; // Default to 10 if not set
              const contextMessages = previousMessages
                .slice(-memoryWindow) // Get only the last N messages
                .filter(msg => !msg.isAi); // Keep only user messages for context (optional - remove this line to include AI responses)
              
              // Format context
              if (contextMessages.length > 0) {
                const context = contextMessages
                  .map(msg => `Previous message: ${msg.content}`)
                  .join('\n');
                
                // Combine context with current prompt
                prompt = `${context}\n\nCurrent message: ${messageData.content}`;
              }
            } catch (error) {
              console.error("Error building context:", error);
              // Continue with original prompt if there's an error
            }
          }
          
          // Call Ollama API
          const response = await axios.post(`${config.ollamaApiUrl}/api/generate`, {
            model: messageData.model || "llama2",
            prompt: prompt,
            stream: false
          });
          
          if (response.data && response.data.response) {
            // Save AI response
            const aiMessage = await storage.createMessage({
              userId: req.user!.id,
              content: response.data.response,
              isAi: true,
              model: messageData.model,
              conversationId: messageData.conversationId
            });
            
            // Return both messages
            res.status(201).json({ userMessage, aiMessage });
          } else {
            throw new Error("Invalid response from Ollama API");
          }
        } catch (apiError) {
          console.error("Ollama API Error:", apiError);
          res.status(503).json({
            message: `Error connecting to Ollama API. Make sure Ollama is running at ${config.ollamaApiUrl}`,
            userMessage
          });
        }
      } else {
        // If it's an AI message (usually not the case here, but for completeness)
        res.status(201).json({ message: userMessage });
      }
    } catch (error) {
      console.error(error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid message data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to process message" });
      }
    }
  });

  // Get API configuration
  app.get("/api/config", async (req, res) => {
    res.json({
      ollamaApiUrl: config.ollamaApiUrl,
      aiName: config.aiName,
      memoryEnabled: config.memoryEnabled,
      memoryWindow: config.memoryWindow,
      ragEnabled: config.ragEnabled,
      webSearchEnabled: config.webSearchEnabled
    });
  });

  // Update API configuration
  app.post("/api/config", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    if (req.body.ollamaApiUrl) {
      config.ollamaApiUrl = req.body.ollamaApiUrl;
    }
    
    if (req.body.memoryEnabled !== undefined) {
      config.memoryEnabled = req.body.memoryEnabled;
    }
    
    if (req.body.memoryWindow !== undefined) {
      config.memoryWindow = req.body.memoryWindow;
    }
    
    if (req.body.ragEnabled !== undefined) {
      config.ragEnabled = req.body.ragEnabled;
    }
    
    if (req.body.webSearchEnabled !== undefined) {
      config.webSearchEnabled = req.body.webSearchEnabled;
    }
    
    if (req.body.maxContextChunks !== undefined) {
      config.maxContextChunks = req.body.maxContextChunks;
    }
    
    res.json({
      ollamaApiUrl: config.ollamaApiUrl,
      aiName: config.aiName,
      memoryEnabled: config.memoryEnabled,
      memoryWindow: config.memoryWindow,
      ragEnabled: config.ragEnabled,
      webSearchEnabled: config.webSearchEnabled,
      maxContextChunks: config.maxContextChunks
    });
  });

  // Get available models from Ollama
  app.get("/api/models", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const response = await axios.get(`${config.ollamaApiUrl}/api/tags`);
      if (response.data && response.data.models) {
        // Return actual models from Ollama API
        res.json(response.data.models);
      } else {
        throw new Error("Invalid response from Ollama API");
      }
    } catch (error) {
      console.error("Error fetching models:", error);
      // Return error status to indicate API connection failure
      res.status(503).json({ 
        error: "Failed to connect to Ollama API", 
        message: `Could not fetch models from ${config.ollamaApiUrl}. Please check your API URL in settings.`
      });
    }
  });

  // Conversation routes
  app.get("/api/conversations", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const conversations = await storage.getConversations(req.user!.id);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.get("/api/conversations/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const conversationId = parseInt(req.params.id);
      if (isNaN(conversationId)) {
        return res.status(400).json({ message: "Invalid conversation ID" });
      }
      
      const conversation = await storage.getConversation(conversationId);
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Check if the conversation belongs to the authenticated user
      if (conversation.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Get messages for this conversation
      const messages = await storage.getMessages(req.user!.id, conversationId);
      
      res.json({ conversation, messages });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ message: "Failed to fetch conversation" });
    }
  });

  app.post("/api/conversations", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const conversationData = insertConversationSchema.parse({
        ...req.body,
        userId: req.user!.id
      });
      
      const conversation = await storage.createConversation(conversationData);
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid conversation data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create conversation" });
      }
    }
  });

  app.patch("/api/conversations/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const conversationId = parseInt(req.params.id);
      if (isNaN(conversationId)) {
        return res.status(400).json({ message: "Invalid conversation ID" });
      }
      
      const conversation = await storage.getConversation(conversationId);
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Check if the conversation belongs to the authenticated user
      if (conversation.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Update title
      if (typeof req.body.title === 'string') {
        const updatedConversation = await storage.updateConversationTitle(conversationId, req.body.title);
        return res.json(updatedConversation);
      }
      
      res.status(400).json({ message: "Invalid update data" });
    } catch (error) {
      console.error("Error updating conversation:", error);
      res.status(500).json({ message: "Failed to update conversation" });
    }
  });

  app.delete("/api/conversations/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const conversationId = parseInt(req.params.id);
      if (isNaN(conversationId)) {
        return res.status(400).json({ message: "Invalid conversation ID" });
      }
      
      const conversation = await storage.getConversation(conversationId);
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Check if the conversation belongs to the authenticated user
      if (conversation.userId !== req.user!.id && !req.user!.isAdmin) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteConversation(conversationId);
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ message: "Failed to delete conversation" });
    }
  });

  // Admin endpoints
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { adminKey } = adminLoginSchema.parse(req.body);
      const isValid = await storage.validateAdminKey(adminKey);
      
      if (!isValid) {
        return res.status(401).json({ message: "Invalid admin key" });
      }
      
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Please log in first" });
      }
      
      // Make the user an admin
      const adminUser = await storage.makeUserAdmin(req.user!.id);
      
      // Update the user in the session
      req.login(adminUser, (err) => {
        if (err) {
          return res.status(500).json({ message: "Failed to update session" });
        }
        res.json({ success: true, user: adminUser });
      });
    } catch (error) {
      console.error("Admin login error:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input", errors: error.errors });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  // Document routes for RAG system
  app.post("/api/documents/upload", upload.single("file"), async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const file = req.file;
      
      // Check file type
      const allowedTypes = [".pdf", ".txt", ".doc", ".docx"];
      const fileExt = path.extname(file.originalname).toLowerCase();
      
      if (!allowedTypes.includes(fileExt)) {
        return res.status(400).json({
          message: "Invalid file type",
          allowedTypes
        });
      }
      
      // Process document
      const document = await processDocument(file, req.user!.id);
      
      res.status(201).json({
        message: "Document uploaded successfully",
        filename: document.metadata.filename,
        fileType: document.metadata.fileType,
        uploadDate: document.metadata.uploadDate,
        fileSize: document.metadata.fileSize
      });
    } catch (error) {
      console.error("Error uploading document:", error);
      res.status(500).json({ message: "Failed to upload document" });
    }
  });
  
  app.get("/api/documents", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const documents = await getUserDocuments(req.user!.id);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });
  
  app.delete("/api/documents/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const documentId = req.params.id;
      const success = await deleteDocument(documentId, req.user!.id);
      
      if (success) {
        res.status(204).end();
      } else {
        res.status(404).json({ message: "Document not found or access denied" });
      }
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });
  
  app.post("/api/documents/search", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const { query } = req.body;
      
      if (!query || typeof query !== "string") {
        return res.status(400).json({ message: "Invalid query" });
      }
      
      const context = await getDocumentContext(query, req.user!.id);
      res.json({ context });
    } catch (error) {
      console.error("Error searching documents:", error);
      res.status(500).json({ message: "Failed to search documents" });
    }
  });

  // Admin dashboard data
  app.get("/api/admin/dashboard", async (req, res) => {
    if (!req.isAuthenticated() || !req.user!.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    try {
      // Get all users and system stats
      const users = await storage.getAllUsers();
      const totalConversations = await storage.getConversationCount();
      const totalMessages = await storage.getMessageCount();
      
      // Build the response object
      const stats = {
        totalUsers: users.length,
        totalConversations,
        totalMessages
      };
      
      // Remove password from user objects before sending to client
      const sanitizedUsers = users.map(user => ({
        id: user.id,
        username: user.username,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt
      }));
      
      res.json({ users: sanitizedUsers, stats });
    } catch (error) {
      console.error("Error fetching admin dashboard:", error);
      res.status(500).json({ message: "Failed to fetch admin dashboard data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
