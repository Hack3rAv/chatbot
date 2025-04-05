import { Button } from "@/components/ui/button";
import { Model, modelSchema } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { Settings } from "lucide-react";

interface SidebarProps {
  currentModel: Model;
  availableModels: { name: string }[];
  onModelChange: (model: Model) => void;
  onNewChat?: () => void;
}

export function Sidebar({ currentModel, availableModels, onModelChange, onNewChat }: SidebarProps) {
  const { user, logoutMutation } = useAuth();

  const handleModelChange = (value: string) => {
    try {
      const model = modelSchema.parse(value);
      onModelChange(model);
    } catch (error) {
      console.error("Invalid model:", error);
    }
  };

  return (
    <div className="hidden md:flex flex-col w-64 bg-[#40414F] text-white p-4 h-full">
      <div className="flex flex-col mb-6">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-[#10A37F] rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm3 5a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold">Neopix AI</h1>
        </div>
        <a 
          href="https://neopix.in" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="ml-10 text-xs text-gray-400 italic hover:text-[#10A37F] transition-colors"
        >
          powered by Neopix
        </a>
      </div>
      
      <div className="mb-4">
        <Button 
          variant="outline"
          className="w-full bg-[#10A37F] hover:bg-[#0D8C6D] text-white border-0 flex items-center justify-center"
          onClick={onNewChat}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          New Chat
        </Button>
      </div>
      
      <div className="mb-6">
        <h2 className="text-sm uppercase text-gray-400 font-medium mb-2">Models</h2>
        <Select value={currentModel} onValueChange={handleModelChange}>
          <SelectTrigger className="w-full bg-gray-700 text-white border-0 focus:ring-[#10A37F]">
            <SelectValue placeholder="Select a model" />
          </SelectTrigger>
          <SelectContent>
            {availableModels.map((model) => (
              <SelectItem key={model.name} value={model.name}>
                {model.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex-grow">
        {/* Placeholder for recent chats - would be implemented in a more complex version */}
        <h2 className="text-sm uppercase text-gray-400 font-medium mb-2">Recent Chats</h2>
        <div className="space-y-1">
          <div className="py-2 px-3 rounded-md hover:bg-gray-700 cursor-pointer transition-colors">
            <p className="text-sm truncate">Chat with AI</p>
            <p className="text-xs text-gray-400">Current session</p>
          </div>
        </div>
      </div>
      
      <div className="space-y-2 mb-4">
        <Link href="/settings">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-700"
          >
            <Settings className="h-4 w-4 mr-2" />
            <span>Settings</span>
          </Button>
        </Link>
      </div>
      
      <div className="pt-4 border-t border-gray-700">
        <div className="flex items-center space-x-3 p-2 rounded-md">
          <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-white">
            <span>{user?.username.charAt(0).toUpperCase()}</span>
          </div>
          <div className="flex-grow">
            <p className="text-sm font-medium">{user?.username}</p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-gray-400 hover:text-white" 
            title="Sign Out"
            onClick={() => logoutMutation.mutate()}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
            </svg>
          </Button>
        </div>
      </div>
    </div>
  );
}
