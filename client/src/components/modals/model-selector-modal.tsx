import { Button } from "@/components/ui/button";
import { Model, modelSchema } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ModelSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentModel: Model;
  availableModels: { name: string }[];
  onModelChange: (model: Model) => void;
}

export function ModelSelectorModal({ 
  isOpen, 
  onClose, 
  currentModel, 
  availableModels, 
  onModelChange 
}: ModelSelectorModalProps) {
  
  const handleModelSelect = (modelName: string) => {
    try {
      const model = modelSchema.parse(modelName);
      onModelChange(model);
      onClose();
    } catch (error) {
      console.error("Invalid model:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select a Model</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-2 py-2">
            {availableModels.map((model) => (
              <Button
                key={model.name}
                variant="ghost"
                className={`w-full justify-start px-4 py-6 text-left rounded-lg hover:bg-[#ECECF1] transition-colors ${
                  currentModel === model.name ? "bg-[#F7F7F8]" : ""
                }`}
                onClick={() => handleModelSelect(model.name)}
              >
                {model.name}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
