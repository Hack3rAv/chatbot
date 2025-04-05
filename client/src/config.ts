export const config = {
  aiName: "NeopixAI",
  ollamaApiUrl: "http://localhost:11434",
  memoryEnabled: true,
  memoryWindow: 10,
  ragEnabled: true,
  webSearchEnabled: false,
  maxContextChunks: 3
};

// Function to fetch config from server and update local config
export async function updateConfigFromServer() {
  try {
    const response = await fetch('/api/config');
    const serverConfig = await response.json();
    
    // Update local config with server values
    if (serverConfig.ollamaApiUrl) {
      config.ollamaApiUrl = serverConfig.ollamaApiUrl;
    }
    
    if (serverConfig.aiName) {
      config.aiName = serverConfig.aiName;
    }
    
    if (serverConfig.memoryEnabled !== undefined) {
      config.memoryEnabled = serverConfig.memoryEnabled;
    }
    
    if (serverConfig.memoryWindow !== undefined) {
      config.memoryWindow = serverConfig.memoryWindow;
    }
    
    if (serverConfig.ragEnabled !== undefined) {
      config.ragEnabled = serverConfig.ragEnabled;
    }
    
    if (serverConfig.webSearchEnabled !== undefined) {
      config.webSearchEnabled = serverConfig.webSearchEnabled;
    }
    
    if (serverConfig.maxContextChunks !== undefined) {
      config.maxContextChunks = serverConfig.maxContextChunks;
    }
    
    return config;
  } catch (error) {
    console.error('Failed to fetch config from server:', error);
    return config;
  }
}

// Function to update server config
export async function updateServerConfig(updates: Partial<typeof config>) {
  try {
    const response = await fetch('/api/config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    
    const updatedConfig = await response.json();
    
    // Update local config with server response
    if (updatedConfig.ollamaApiUrl) {
      config.ollamaApiUrl = updatedConfig.ollamaApiUrl;
    }
    
    if (updatedConfig.aiName) {
      config.aiName = updatedConfig.aiName;
    }
    
    if (updatedConfig.memoryEnabled !== undefined) {
      config.memoryEnabled = updatedConfig.memoryEnabled;
    }
    
    if (updatedConfig.memoryWindow !== undefined) {
      config.memoryWindow = updatedConfig.memoryWindow;
    }
    
    if (updatedConfig.ragEnabled !== undefined) {
      config.ragEnabled = updatedConfig.ragEnabled;
    }
    
    if (updatedConfig.webSearchEnabled !== undefined) {
      config.webSearchEnabled = updatedConfig.webSearchEnabled;
    }
    
    if (updatedConfig.maxContextChunks !== undefined) {
      config.maxContextChunks = updatedConfig.maxContextChunks;
    }
    
    return config;
  } catch (error) {
    console.error('Failed to update server config:', error);
    return config;
  }
}