// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
import session from "express-session";
import createMemoryStore from "memorystore";
import { v4 as uuidv4 } from "uuid";
var MemoryStore = createMemoryStore(session);
var MemStorage = class {
  users;
  messages;
  conversations;
  documents;
  documentChunks;
  adminKey = process.env.ADMIN_KEY || "admin123";
  // Default admin key, should be changed in production
  currentUserId;
  currentMessageId;
  currentConversationId;
  sessionStore;
  constructor() {
    this.users = /* @__PURE__ */ new Map();
    this.messages = /* @__PURE__ */ new Map();
    this.conversations = /* @__PURE__ */ new Map();
    this.documents = /* @__PURE__ */ new Map();
    this.documentChunks = /* @__PURE__ */ new Map();
    this.currentUserId = 1;
    this.currentMessageId = 1;
    this.currentConversationId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 864e5
      // prune expired entries every 24h
    });
  }
  // User management methods
  async getUser(id) {
    return this.users.get(id);
  }
  async getUserByUsername(username) {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  async createUser(insertUser) {
    const id = this.currentUserId++;
    const user = {
      ...insertUser,
      id,
      isAdmin: insertUser.isAdmin || false,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.users.set(id, user);
    return user;
  }
  async makeUserAdmin(userId) {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    const updatedUser = {
      ...user,
      isAdmin: true
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
  // Conversation management methods
  async getConversations(userId) {
    return Array.from(this.conversations.values()).filter((conversation) => conversation.userId === userId).sort((a, b) => {
      const dateA = a.updatedAt instanceof Date ? a.updatedAt : new Date(a.updatedAt);
      const dateB = b.updatedAt instanceof Date ? b.updatedAt : new Date(b.updatedAt);
      return dateB.getTime() - dateA.getTime();
    });
  }
  async getConversation(id) {
    return this.conversations.get(id);
  }
  async createConversation(conversation) {
    const id = this.currentConversationId++;
    const now = /* @__PURE__ */ new Date();
    const newConversation = {
      ...conversation,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.conversations.set(id, newConversation);
    return newConversation;
  }
  async updateConversationTitle(id, title) {
    const conversation = this.conversations.get(id);
    if (!conversation) {
      throw new Error(`Conversation with ID ${id} not found`);
    }
    const updatedConversation = {
      ...conversation,
      title,
      updatedAt: /* @__PURE__ */ new Date()
    };
    this.conversations.set(id, updatedConversation);
    return updatedConversation;
  }
  async deleteConversation(id) {
    if (!this.conversations.has(id)) {
      throw new Error(`Conversation with ID ${id} not found`);
    }
    this.conversations.delete(id);
    const messagesToDelete = [];
    this.messages.forEach((message, messageId) => {
      if (message.conversationId === id) {
        messagesToDelete.push(messageId);
      }
    });
    for (const messageId of messagesToDelete) {
      this.messages.delete(messageId);
    }
  }
  // Message management methods
  async getMessages(userId, conversationId) {
    return Array.from(this.messages.values()).filter((message) => {
      if (message.userId !== userId) return false;
      if (conversationId !== void 0 && message.conversationId !== conversationId) return false;
      return true;
    }).sort((a, b) => {
      const dateA = a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp);
      const dateB = b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp);
      return dateA.getTime() - dateB.getTime();
    });
  }
  async createMessage(insertMessage) {
    const id = this.currentMessageId++;
    const message = {
      ...insertMessage,
      id,
      isAi: insertMessage.isAi || false,
      model: insertMessage.model || null,
      conversationId: insertMessage.conversationId || null,
      timestamp: /* @__PURE__ */ new Date()
    };
    this.messages.set(id, message);
    if (message.conversationId) {
      const conversation = this.conversations.get(message.conversationId);
      if (conversation) {
        conversation.updatedAt = /* @__PURE__ */ new Date();
        this.conversations.set(message.conversationId, conversation);
      }
    }
    return message;
  }
  // Admin functionality
  async validateAdminKey(adminKey) {
    return adminKey === this.adminKey;
  }
  async getAllUsers() {
    return Array.from(this.users.values());
  }
  async getConversationCount() {
    return this.conversations.size;
  }
  async getMessageCount() {
    return this.messages.size;
  }
  // RAG functionality
  async storeDocument(document) {
    try {
      const documentId = uuidv4();
      const metadata = {
        id: documentId,
        filename: document.metadata.filename,
        fileType: document.metadata.fileType,
        userId: document.metadata.userId,
        uploadDate: document.metadata.uploadDate,
        fileSize: document.metadata.fileSize
      };
      this.documents.set(documentId, metadata);
      const chunkSize = 1e3;
      const chunkOverlap = 200;
      const content = document.content;
      const textChunks = [];
      let startIndex = 0;
      while (startIndex < content.length) {
        const chunk = content.substring(
          startIndex,
          Math.min(startIndex + chunkSize, content.length)
        );
        textChunks.push(chunk);
        startIndex += chunkSize - chunkOverlap;
        if (startIndex + chunkSize / 2 >= content.length) {
          break;
        }
      }
      const chunks = textChunks.map((chunkContent) => ({
        content: chunkContent,
        metadata
      }));
      this.documentChunks.set(documentId, chunks);
      return documentId;
    } catch (error) {
      console.error("Error storing document:", error);
      throw error;
    }
  }
  async searchDocuments(query, userId) {
    try {
      const allChunks = [];
      this.documentChunks.forEach((chunks) => {
        chunks.forEach((chunk) => {
          if (chunk.metadata.userId === userId) {
            allChunks.push(chunk);
          }
        });
      });
      const keywords = query.toLowerCase().split(/\s+/).filter((word) => word.length > 3);
      const scoredChunks = allChunks.map((chunk) => {
        const content = chunk.content.toLowerCase();
        let score = 0;
        keywords.forEach((keyword) => {
          const regex = new RegExp(keyword, "gi");
          const matches = content.match(regex);
          if (matches) {
            score += matches.length;
          }
        });
        return { chunk, score };
      });
      return scoredChunks.sort((a, b) => b.score - a.score).filter((item) => item.score > 0).slice(0, 5).map((item) => item.chunk);
    } catch (error) {
      console.error("Error searching documents:", error);
      return [];
    }
  }
  async getUserDocuments(userId) {
    return Array.from(this.documents.values()).filter((doc) => doc.userId === userId).sort((a, b) => {
      const dateA = a.uploadDate instanceof Date ? a.uploadDate : new Date(a.uploadDate);
      const dateB = b.uploadDate instanceof Date ? b.uploadDate : new Date(b.uploadDate);
      return dateB.getTime() - dateA.getTime();
    });
  }
  async deleteDocument(documentId, userId) {
    const document = this.documents.get(documentId);
    if (!document || document.userId !== userId) {
      return false;
    }
    this.documents.delete(documentId);
    this.documentChunks.delete(documentId);
    return true;
  }
};
var storage = new MemStorage();

// server/auth.ts
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session2 from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
var scryptAsync = promisify(scrypt);
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}
async function comparePasswords(supplied, stored) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = await scryptAsync(supplied, salt, 64);
  return timingSafeEqual(hashedBuf, suppliedBuf);
}
function setupAuth(app2) {
  const sessionSettings = {
    secret: process.env.SESSION_SECRET || "neopix-ai-secret-key",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore
  };
  app2.set("trust proxy", 1);
  app2.use(session2(sessionSettings));
  app2.use(passport.initialize());
  app2.use(passport.session());
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      const user = await storage.getUserByUsername(username);
      if (!user || !await comparePasswords(password, user.password)) {
        return done(null, false);
      } else {
        return done(null, user);
      }
    })
  );
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });
  app2.post("/api/register", async (req, res, next) => {
    const existingUser = await storage.getUserByUsername(req.body.username);
    if (existingUser) {
      return res.status(400).send("Username already exists");
    }
    const user = await storage.createUser({
      ...req.body,
      password: await hashPassword(req.body.password)
    });
    req.login(user, (err) => {
      if (err) return next(err);
      res.status(201).json(user);
    });
  });
  app2.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
  });
  app2.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });
  app2.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}

// server/routes.ts
import axios from "axios";
import { z as z2 } from "zod";

// shared/schema.ts
import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  model: text("model").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
var messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  conversationId: integer("conversation_id"),
  content: text("content").notNull(),
  isAi: boolean("is_ai").notNull().default(false),
  model: text("model"),
  timestamp: timestamp("timestamp").notNull().defaultNow()
});
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  isAdmin: true
});
var insertConversationSchema = createInsertSchema(conversations).pick({
  userId: true,
  title: true,
  model: true
});
var insertMessageSchema = createInsertSchema(messages).pick({
  userId: true,
  conversationId: true,
  content: true,
  isAi: true,
  model: true
});
var adminLoginSchema = z.object({
  adminKey: z.string().min(1, "Admin key is required")
});
var modelSchema = z.string();

// server/config.ts
var config = {
  ollamaApiUrl: process.env.OLLAMA_API_URL || "http://localhost:11434",
  aiName: "NeopixAI",
  memoryEnabled: true,
  memoryWindow: 10,
  // Number of previous messages to remember in context
  maxContextChunks: 3,
  // Maximum number of document chunks to include in context for RAG
  ragEnabled: true,
  // Enable/disable Retrieval Augmented Generation
  webSearchEnabled: false
  // Enable/disable web search capability (will require separate API key)
};

// server/routes.ts
import multer from "multer";
import path2 from "path";

// server/document-processor.ts
import fs from "fs/promises";
import path from "path";
import mammoth from "mammoth";
import { fileURLToPath } from "url";
var pdfParse = async (buffer) => {
  try {
    const module = await import("pdf-parse");
    return module.default(buffer);
  } catch (error) {
    console.error("Error loading pdf-parse:", error);
    return { text: "Failed to parse PDF document" };
  }
};
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var UPLOAD_DIR = path.join(__dirname, "uploads");
async function ensureUploadDir() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  } catch (error) {
    console.error("Failed to create upload directory:", error);
  }
}
ensureUploadDir();
async function processDocument(file, userId) {
  const fileType = path.extname(file.originalname).toLowerCase();
  let content = "";
  try {
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
    const processedDocument = {
      content,
      metadata: {
        filename: file.originalname,
        fileType: fileType.substring(1),
        // Remove the dot
        userId,
        uploadDate: /* @__PURE__ */ new Date(),
        fileSize: file.size
      }
    };
    await storage.storeDocument(processedDocument);
    return processedDocument;
  } catch (error) {
    console.error(`Error processing document ${file.originalname}:`, error);
    throw error;
  }
}
async function getDocumentContext(query, userId) {
  try {
    const relevantChunks = await storage.searchDocuments(query, userId);
    if (relevantChunks.length === 0) {
      return "";
    }
    const maxChunks = config.maxContextChunks || 3;
    const chunks = relevantChunks.slice(0, maxChunks).map(
      (chunk) => `From document: ${chunk.metadata.filename}
${chunk.content}

`
    );
    return chunks.join("");
  } catch (error) {
    console.error("Error retrieving document context:", error);
    return "";
  }
}
async function getUserDocuments(userId) {
  try {
    return await storage.getUserDocuments(userId);
  } catch (error) {
    console.error("Error getting user documents:", error);
    return [];
  }
}
async function deleteDocument(documentId, userId) {
  try {
    return await storage.deleteDocument(documentId, userId);
  } catch (error) {
    console.error(`Error deleting document ${documentId}:`, error);
    return false;
  }
}

// server/routes.ts
var upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
    // 10MB file size limit
  }
});
async function registerRoutes(app2) {
  setupAuth(app2);
  app2.get("/api/messages", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      let conversationId = void 0;
      if (req.query.conversationId) {
        conversationId = parseInt(req.query.conversationId);
        if (isNaN(conversationId)) {
          return res.status(400).json({ message: "Invalid conversation ID" });
        }
      }
      const messages2 = await storage.getMessages(req.user.id, conversationId);
      res.json(messages2);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });
  app2.post("/api/messages", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const messageData = insertMessageSchema.parse({
        ...req.body,
        userId: req.user.id
      });
      const userMessage = await storage.createMessage(messageData);
      if (!messageData.isAi) {
        try {
          let prompt = messageData.content;
          let contextAdded = false;
          if (config.ragEnabled) {
            try {
              const documentContext = await getDocumentContext(messageData.content, req.user.id);
              if (documentContext && documentContext.trim().length > 0) {
                prompt = `I'll provide some context from documents that might help answer this question:

${documentContext}

With this context in mind, please answer the following question: ${messageData.content}`;
                contextAdded = true;
              }
            } catch (error) {
              console.error("Error retrieving document context:", error);
            }
          }
          if (config.memoryEnabled && !contextAdded) {
            try {
              const conversationId = messageData.conversationId || void 0;
              const previousMessages = await storage.getMessages(req.user.id, conversationId);
              const memoryWindow = config.memoryWindow || 10;
              const contextMessages = previousMessages.slice(-memoryWindow).filter((msg) => !msg.isAi);
              if (contextMessages.length > 0) {
                const context = contextMessages.map((msg) => `Previous message: ${msg.content}`).join("\n");
                prompt = `${context}

Current message: ${messageData.content}`;
              }
            } catch (error) {
              console.error("Error building context:", error);
            }
          }
          const response = await axios.post(`${config.ollamaApiUrl}/api/generate`, {
            model: messageData.model || "llama2",
            prompt,
            stream: false
          });
          if (response.data && response.data.response) {
            const aiMessage = await storage.createMessage({
              userId: req.user.id,
              content: response.data.response,
              isAi: true,
              model: messageData.model,
              conversationId: messageData.conversationId
            });
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
        res.status(201).json({ message: userMessage });
      }
    } catch (error) {
      console.error(error);
      if (error instanceof z2.ZodError) {
        res.status(400).json({ message: "Invalid message data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to process message" });
      }
    }
  });
  app2.get("/api/config", async (req, res) => {
    res.json({
      ollamaApiUrl: config.ollamaApiUrl,
      aiName: config.aiName,
      memoryEnabled: config.memoryEnabled,
      memoryWindow: config.memoryWindow,
      ragEnabled: config.ragEnabled,
      webSearchEnabled: config.webSearchEnabled
    });
  });
  app2.post("/api/config", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    if (req.body.ollamaApiUrl) {
      config.ollamaApiUrl = req.body.ollamaApiUrl;
    }
    if (req.body.memoryEnabled !== void 0) {
      config.memoryEnabled = req.body.memoryEnabled;
    }
    if (req.body.memoryWindow !== void 0) {
      config.memoryWindow = req.body.memoryWindow;
    }
    if (req.body.ragEnabled !== void 0) {
      config.ragEnabled = req.body.ragEnabled;
    }
    if (req.body.webSearchEnabled !== void 0) {
      config.webSearchEnabled = req.body.webSearchEnabled;
    }
    if (req.body.maxContextChunks !== void 0) {
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
  app2.get("/api/models", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const response = await axios.get(`${config.ollamaApiUrl}/api/tags`);
      if (response.data && response.data.models) {
        res.json(response.data.models);
      } else {
        throw new Error("Invalid response from Ollama API");
      }
    } catch (error) {
      console.error("Error fetching models:", error);
      res.status(503).json({
        error: "Failed to connect to Ollama API",
        message: `Could not fetch models from ${config.ollamaApiUrl}. Please check your API URL in settings.`
      });
    }
  });
  app2.get("/api/conversations", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const conversations2 = await storage.getConversations(req.user.id);
      res.json(conversations2);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });
  app2.get("/api/conversations/:id", async (req, res) => {
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
      if (conversation.userId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      const messages2 = await storage.getMessages(req.user.id, conversationId);
      res.json({ conversation, messages: messages2 });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ message: "Failed to fetch conversation" });
    }
  });
  app2.post("/api/conversations", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const conversationData = insertConversationSchema.parse({
        ...req.body,
        userId: req.user.id
      });
      const conversation = await storage.createConversation(conversationData);
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      if (error instanceof z2.ZodError) {
        res.status(400).json({ message: "Invalid conversation data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create conversation" });
      }
    }
  });
  app2.patch("/api/conversations/:id", async (req, res) => {
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
      if (conversation.userId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (typeof req.body.title === "string") {
        const updatedConversation = await storage.updateConversationTitle(conversationId, req.body.title);
        return res.json(updatedConversation);
      }
      res.status(400).json({ message: "Invalid update data" });
    } catch (error) {
      console.error("Error updating conversation:", error);
      res.status(500).json({ message: "Failed to update conversation" });
    }
  });
  app2.delete("/api/conversations/:id", async (req, res) => {
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
      if (conversation.userId !== req.user.id && !req.user.isAdmin) {
        return res.status(403).json({ message: "Access denied" });
      }
      await storage.deleteConversation(conversationId);
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ message: "Failed to delete conversation" });
    }
  });
  app2.post("/api/admin/login", async (req, res) => {
    try {
      const { adminKey } = adminLoginSchema.parse(req.body);
      const isValid = await storage.validateAdminKey(adminKey);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid admin key" });
      }
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Please log in first" });
      }
      const adminUser = await storage.makeUserAdmin(req.user.id);
      req.login(adminUser, (err) => {
        if (err) {
          return res.status(500).json({ message: "Failed to update session" });
        }
        res.json({ success: true, user: adminUser });
      });
    } catch (error) {
      console.error("Admin login error:", error);
      if (error instanceof z2.ZodError) {
        res.status(400).json({ message: "Invalid input", errors: error.errors });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });
  app2.post("/api/documents/upload", upload.single("file"), async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const file = req.file;
      const allowedTypes = [".pdf", ".txt", ".doc", ".docx"];
      const fileExt = path2.extname(file.originalname).toLowerCase();
      if (!allowedTypes.includes(fileExt)) {
        return res.status(400).json({
          message: "Invalid file type",
          allowedTypes
        });
      }
      const document = await processDocument(file, req.user.id);
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
  app2.get("/api/documents", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const documents = await getUserDocuments(req.user.id);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });
  app2.delete("/api/documents/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const documentId = req.params.id;
      const success = await deleteDocument(documentId, req.user.id);
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
  app2.post("/api/documents/search", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const { query } = req.body;
      if (!query || typeof query !== "string") {
        return res.status(400).json({ message: "Invalid query" });
      }
      const context = await getDocumentContext(query, req.user.id);
      res.json({ context });
    } catch (error) {
      console.error("Error searching documents:", error);
      res.status(500).json({ message: "Failed to search documents" });
    }
  });
  app2.get("/api/admin/dashboard", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }
    try {
      const users2 = await storage.getAllUsers();
      const totalConversations = await storage.getConversationCount();
      const totalMessages = await storage.getMessageCount();
      const stats = {
        totalUsers: users2.length,
        totalConversations,
        totalMessages
      };
      const sanitizedUsers = users2.map((user) => ({
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
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs2 from "fs";
import path4 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path3 from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    themePlugin(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path3.resolve(import.meta.dirname, "client", "src"),
      "@shared": path3.resolve(import.meta.dirname, "shared"),
      "@assets": path3.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path3.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path3.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path4.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs2.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path4.resolve(import.meta.dirname, "public");
  if (!fs2.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path4.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path5 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path5.startsWith("/api")) {
      let logLine = `${req.method} ${path5} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5e3;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
