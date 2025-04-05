import { useEffect, useRef } from "react";
import { Message } from "@shared/schema";
import { MessageItem } from "./message-item";
import { TypingIndicator } from "./typing-indicator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatContainerProps {
  messages: Message[];
  isTyping: boolean;
}

export function ChatContainer({ messages, isTyping }: ChatContainerProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  return (
    <ScrollArea className="chat-container flex-grow p-4 md:p-8 space-y-6 h-[calc(100vh-144px)]">
      {/* Empty state */}
      {messages.length === 0 && (
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 rounded-full bg-[#10A37F] flex-shrink-0 flex items-center justify-center text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm3 5a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="bg-[#F7F7F8] rounded-lg p-4 max-w-3xl">
            <p className="text-base">Hi there! I'm your AI assistant. How can I help you today?</p>
          </div>
        </div>
      )}

      {/* Message list */}
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}

      {/* Typing indicator */}
      <TypingIndicator isTyping={isTyping} />

      {/* Invisible element to scroll to */}
      <div ref={messagesEndRef} />
    </ScrollArea>
  );
}
