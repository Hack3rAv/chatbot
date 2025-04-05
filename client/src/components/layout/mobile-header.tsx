import { Button } from "@/components/ui/button";
import { Model } from "@shared/schema";

interface MobileHeaderProps {
  currentModel: Model;
  onOpenModelSelector: () => void;
  onOpenMenu: () => void;
}

export function MobileHeader({ currentModel, onOpenModelSelector, onOpenMenu }: MobileHeaderProps) {
  return (
    <div className="md:hidden flex items-center justify-between p-4 border-b border-[#ECECF1]">
      <div className="flex flex-col">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-[#10A37F] rounded-full flex items-center justify-center text-white">
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
          className="ml-10 text-xs text-gray-500 italic hover:text-[#10A37F] transition-colors"
        >
          powered by Neopix
        </a>
      </div>
      
      <div className="flex items-center space-x-3">
        <Button 
          variant="outline" 
          size="sm" 
          className="text-sm bg-[#ECECF1] border-0"
          onClick={onOpenModelSelector}
        >
          {currentModel}
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onOpenMenu}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </Button>
      </div>
    </div>
  );
}
