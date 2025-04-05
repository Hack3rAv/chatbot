import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { modelSchema, type Message, type Model } from "@shared/schema";
import { useToast } from "./use-toast";
import { useAuth } from "./use-auth";
import { config, updateConfigFromServer } from "@/config";

export function useChat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentModel, setCurrentModel] = useState<Model>("llama2");
  const [isTyping, setIsTyping] = useState(false);

  // Fetch messages
  const { 
    data: messages = [], 
    isLoading: isLoadingMessages,
    refetch: refetchMessages
  } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
    enabled: !!user,
  });

  // Fetch available models
  const { 
    data: availableModels = [],
    isLoading: isLoadingModels,
    error: modelsError,
    isError: hasModelsError
  } = useQuery<{name: string}[]>({
    queryKey: ["/api/models"],
    enabled: !!user,
    retry: 1 // Only retry once to avoid excessive retries on permanent errors
  });
  
  // API connection status based on error state
  const apiConnectionStatus = hasModelsError ? 'error' : 'connected';
  
  // Extract API error message if available
  const apiError = hasModelsError 
    ? `Failed to connect to Ollama API at ${config.ollamaApiUrl}`
    : null;

  // Send message
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      setIsTyping(true);
      try {
        const validModel = modelSchema.parse(currentModel);
        const res = await apiRequest("POST", "/api/messages", {
          content,
          isAi: false,
          model: validModel
        });
        return await res.json();
      } catch (error) {
        console.error("Error sending message:", error);
        throw error;
      } finally {
        setIsTyping(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    },
    onError: (error) => {
      console.error("Message error:", error);
      toast({
        title: "Error",
        description: `Failed to send message. Make sure Ollama is running at ${config.ollamaApiUrl}`,
        variant: "destructive",
      });
    },
  });

  // Set default model from localStorage if available
  useEffect(() => {
    const savedModel = localStorage.getItem("currentModel");
    if (savedModel) {
      try {
        const parsedModel = modelSchema.parse(savedModel);
        setCurrentModel(parsedModel);
      } catch (error) {
        // If saved model is invalid, use default
        console.warn("Invalid saved model, using default");
      }
    }
  }, []);

  // Save model to localStorage when changed
  const changeModel = (model: Model) => {
    try {
      const validModel = modelSchema.parse(model);
      setCurrentModel(validModel);
      localStorage.setItem("currentModel", validModel);
    } catch (error) {
      console.error("Invalid model:", error);
      toast({
        title: "Error",
        description: "Invalid model selected",
        variant: "destructive",
      });
    }
  };
  
  // Clear chat messages
  const clearChat = () => {
    queryClient.setQueryData(["/api/messages"], []);
    toast({
      title: "Chat cleared",
      description: "Started a new conversation",
    });
  };

  // Upload file mutation
  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload file');
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "File uploaded",
        description: `${data.filename} has been uploaded and processed for context`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    messages,
    isLoadingMessages,
    availableModels,
    isLoadingModels,
    currentModel,
    changeModel,
    sendMessage: (content: string) => sendMessageMutation.mutate(content),
    isTyping,
    refetchMessages,
    apiConnectionStatus,
    apiError,
    clearChat,
    uploadFile: (file: File) => uploadFileMutation.mutateAsync(file)
  };
}
