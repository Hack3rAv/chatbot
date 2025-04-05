import { Button } from "@/components/ui/button";
import { User } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from "wouter";
import { Settings } from "lucide-react";

interface MobileMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onLogout: () => void;
  onNewChat?: () => void;
}

export function MobileMenuModal({ isOpen, onClose, user, onLogout, onNewChat }: MobileMenuModalProps) {
  const handleLogout = () => {
    onLogout();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-white">
              <span>{user?.username.charAt(0).toUpperCase()}</span>
            </div>
            <DialogTitle>{user?.username}</DialogTitle>
          </div>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 py-2">
            <Button 
              className="w-full py-3 space-x-2 justify-center bg-[#10A37F] hover:bg-[#0D8C6D] text-white"
              onClick={() => {
                if (onNewChat) {
                  onNewChat();
                  onClose();
                }
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              <span>New Chat</span>
            </Button>
          
            <h3 className="text-sm uppercase text-gray-500 font-medium">Recent Chats</h3>
            <div className="space-y-2">
              <div className="py-3 px-4 rounded-lg hover:bg-[#ECECF1] transition-colors cursor-pointer">
                <p className="font-medium">Chat with AI</p>
                <p className="text-sm text-gray-500">Current session</p>
              </div>
            </div>
            
            <h3 className="text-sm uppercase text-gray-500 font-medium">Options</h3>
            <div className="space-y-2">
              <Link href="/settings" onClick={onClose}>
                <Button 
                  className="w-full py-3 space-x-2 justify-start"
                  variant="outline"
                >
                  <Settings className="h-5 w-5" />
                  <span>Settings</span>
                </Button>
              </Link>
            </div>
            
            <Button 
              className="w-full py-3 space-x-2 justify-center text-destructive border border-destructive/20 rounded-lg"
              variant="outline"
              onClick={handleLogout}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
              </svg>
              <span>Sign out</span>
            </Button>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
