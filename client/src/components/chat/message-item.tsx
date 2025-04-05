import { Message } from "@shared/schema";
import { cn } from "@/lib/utils";

interface MessageItemProps {
  message: Message;
}

export function MessageItem({ message }: MessageItemProps) {
  if (message.isAi) {
    return (
      <div className="flex items-start space-x-3">
        <div className="flex flex-col items-center space-y-1">
          <div className="w-8 h-8 rounded-full bg-[#10A37F] flex-shrink-0 flex items-center justify-center text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm3 5a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="text-xs font-medium text-gray-600">Neopix AI</span>
        </div>
        <div className="bg-[#F7F7F8] rounded-lg p-4 max-w-3xl">
          <p className="text-base whitespace-pre-wrap">{message.content}</p>
          {message.model && (
            <div className="mt-2 text-xs text-gray-500">
              Model: {message.model}
            </div>
          )}
        </div>
      </div>
    );
  } else {
    return (
      <div className="flex justify-end">
        <div className="bg-[#10A37F] text-white rounded-lg p-4 max-w-3xl">
          <p className="text-base whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }
}
