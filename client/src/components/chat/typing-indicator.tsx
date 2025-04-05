import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface TypingIndicatorProps {
  isTyping: boolean;
}

export function TypingIndicator({ isTyping }: TypingIndicatorProps) {
  return (
    <AnimatePresence>
      {isTyping && (
        <motion.div 
          className="flex items-start space-x-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex flex-col items-center space-y-1">
            <div className="w-8 h-8 rounded-full bg-[#10A37F] flex-shrink-0 flex items-center justify-center text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm3 5a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-xs font-medium text-gray-600">Neopix AI</span>
          </div>
          <div className="bg-[#F7F7F8] rounded-lg p-4 max-w-3xl">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Add this to your global css or include in your component with styled-jsx
// .typing-indicator span {
//   animation: blink 1.4s infinite both;
// }
// .typing-indicator span:nth-child(2) {
//   animation-delay: 0.2s;
// }
// .typing-indicator span:nth-child(3) {
//   animation-delay: 0.4s;
// }
// @keyframes blink {
//   0% { opacity: 0.1; }
//   20% { opacity: 1; }
//   100% { opacity: 0.1; }
// }
