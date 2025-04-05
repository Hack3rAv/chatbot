import { useState, FormEvent, useRef, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Model } from "@shared/schema";
import { motion } from "framer-motion";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isTyping: boolean;
  currentModel: Model;
  onChangeModel: () => void;
  onFileUpload?: (file: File) => Promise<void>;
}

export function ChatInput({ onSendMessage, isTyping, currentModel, onChangeModel, onFileUpload }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isTyping) {
      onSendMessage(message.trim());
      setMessage("");
    }
  };
  
  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFileUpload) {
      try {
        setIsUploading(true);
        await onFileUpload(file);
        // Clear the input so the same file can be uploaded again
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } catch (error) {
        console.error("Error uploading file:", error);
      } finally {
        setIsUploading(false);
      }
    }
  };

  return (
    <div className="border-t border-[#ECECF1] p-4">
      <form onSubmit={handleSubmit} className="flex items-center space-x-2">
        {onFileUpload && (
          <motion.div
            animate={{
              opacity: isTyping || isUploading ? 0.5 : 1,
              scale: isTyping || isUploading ? 0.95 : 1
            }}
            transition={{ duration: 0.2 }}
          >
            <Button
              type="button"
              onClick={handleFileButtonClick}
              className="bg-white hover:bg-gray-50 text-gray-600 p-3 rounded-lg transition-colors border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isTyping || isUploading}
              title="Upload document for context"
            >
              {isUploading ? (
                <svg className="animate-spin h-5 w-5 text-[#10A37F]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              )}
            </Button>
            <input 
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.txt"
            />
          </motion.div>
        )}
        <motion.div 
          className="relative flex-grow"
          animate={{
            opacity: isTyping ? 0.7 : 1,
            scale: isTyping ? 0.98 : 1
          }}
          transition={{ duration: 0.2 }}
        >
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={isTyping ? "Neopix AI is thinking..." : "Type your message..."}
            className="w-full px-4 py-3 bg-white border border-[#ECECF1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10A37F] focus:border-transparent"
            disabled={isTyping}
          />
          {isTyping && (
            <motion.div 
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <div className="h-2 w-2 rounded-full bg-[#10A37F]" />
            </motion.div>
          )}
        </motion.div>
        <motion.div
          animate={{
            opacity: message.trim() && !isTyping ? 1 : 0.5,
            scale: message.trim() && !isTyping ? 1 : 0.95
          }}
          transition={{ duration: 0.2 }}
        >
          <Button
            type="submit"
            className="bg-[#10A37F] hover:bg-opacity-90 text-white p-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!message.trim() || isTyping}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </Button>
        </motion.div>
      </form>
      <motion.div 
        className="text-xs text-center text-gray-500 mt-2"
        animate={{ 
          opacity: isTyping ? 0.7 : 1 
        }}
        transition={{ duration: 0.3 }}
      >
        Using <span className="font-medium">{currentModel}</span> | <button onClick={onChangeModel} className="text-[#10A37F] hover:underline">Change model</button>
      </motion.div>
    </div>
  );
}
