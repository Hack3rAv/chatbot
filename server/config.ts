export const config = {
  ollamaApiUrl: process.env.OLLAMA_API_URL || "http://localhost:11434",
  aiName: "NeopixAI",
  memoryEnabled: true,
  memoryWindow: 10, // Number of previous messages to remember in context
  maxContextChunks: 3, // Maximum number of document chunks to include in context for RAG
  ragEnabled: true, // Enable/disable Retrieval Augmented Generation
  webSearchEnabled: false, // Enable/disable web search capability (will require separate API key)
};