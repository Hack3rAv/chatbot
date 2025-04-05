import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useChat } from "@/hooks/use-chat";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";
import { ChatContainer } from "@/components/chat/chat-container";
import { ChatInput } from "@/components/chat/chat-input";
import { ModelSelectorModal } from "@/components/modals/model-selector-modal";
import { MobileMenuModal } from "@/components/modals/mobile-menu-modal";
import { useToast } from "@/hooks/use-toast";
import { config } from "@/config";

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const {
    messages,
    isLoadingMessages,
    availableModels: models,
    currentModel,
    changeModel,
    sendMessage,
    isTyping,
    refetchMessages,
    clearChat,
    uploadFile
  } = useChat();
  
  // Ensure models is always an array of objects with a name property
  const availableModels = Array.isArray(models) ? models : [{ name: currentModel }];

  // Fetch messages on initial load
  useEffect(() => {
    if (user) {
      refetchMessages();
    }
  }, [user, refetchMessages]);

  const handleSendMessage = (content: string) => {
    if (!content.trim()) return;
    
    try {
      sendMessage(content);
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: `Failed to send message. Make sure Ollama is running at ${config.ollamaApiUrl}`,
        variant: "destructive",
      });
    }
  };

  const handleModelChange = (model: string) => {
    changeModel(model);
    setIsModelSelectorOpen(false);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen">
      {/* Sidebar for larger screens */}
      <Sidebar 
        currentModel={currentModel} 
        availableModels={availableModels} 
        onModelChange={changeModel}
        onNewChat={clearChat}
      />

      {/* Main content area */}
      <div className="flex-grow flex flex-col h-full">
        {/* Mobile header */}
        <MobileHeader 
          currentModel={currentModel}
          onOpenModelSelector={() => setIsModelSelectorOpen(true)}
          onOpenMenu={() => setIsMobileMenuOpen(true)}
        />

        {/* Chat messages container */}
        <ChatContainer 
          messages={messages} 
          isTyping={isTyping} 
        />

        {/* Chat input area */}
        <ChatInput 
          onSendMessage={handleSendMessage}
          isTyping={isTyping}
          currentModel={currentModel}
          onChangeModel={() => setIsModelSelectorOpen(true)}
          onFileUpload={uploadFile}
        />
      </div>

      {/* Model selector modal */}
      <ModelSelectorModal 
        isOpen={isModelSelectorOpen}
        onClose={() => setIsModelSelectorOpen(false)}
        currentModel={currentModel}
        availableModels={availableModels}
        onModelChange={changeModel}
      />

      {/* Mobile menu modal */}
      <MobileMenuModal 
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        user={user}
        onLogout={() => logoutMutation.mutate()}
        onNewChat={clearChat}
      />
    </div>
  );
}
