import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { config, updateConfigFromServer, updateServerConfig } from "@/config";
import { useToast } from "@/hooks/use-toast";
import { Brain } from "lucide-react";

export function MemorySettings() {
  const { toast } = useToast();
  const [memoryEnabled, setMemoryEnabled] = useState(config.memoryEnabled);
  const [memoryWindow, setMemoryWindow] = useState(config.memoryWindow);
  const [isSaving, setIsSaving] = useState(false);
  
  // Fetch initial config from server
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const updatedConfig = await updateConfigFromServer();
        setMemoryEnabled(updatedConfig.memoryEnabled);
        setMemoryWindow(updatedConfig.memoryWindow);
      } catch (error) {
        console.error("Failed to fetch config:", error);
      }
    };
    
    fetchConfig();
  }, []);
  
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateServerConfig({ 
        memoryEnabled, 
        memoryWindow
      });
      toast({
        title: "Memory settings saved",
        description: "Your chat memory preferences have been updated",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update memory settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleReset = async () => {
    setMemoryEnabled(true);
    setMemoryWindow(10);
    setIsSaving(true);
    try {
      await updateServerConfig({ 
        memoryEnabled: true, 
        memoryWindow: 10
      });
      toast({
        title: "Memory settings reset",
        description: "Your chat memory preferences have been reset to default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reset memory settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Memory Settings
        </CardTitle>
        <CardDescription>
          Configure how {config.aiName} remembers your conversation context
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="memory-switch">Enable conversation memory</Label>
              <p className="text-sm text-muted-foreground">
                Allows the AI to reference earlier parts of your conversation
              </p>
            </div>
            <Switch
              id="memory-switch"
              checked={memoryEnabled}
              onCheckedChange={setMemoryEnabled}
            />
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="memory-window">Memory window size</Label>
              <span className="text-sm font-medium">{memoryWindow} messages</span>
            </div>
            <Slider
              id="memory-window"
              value={[memoryWindow]}
              onValueChange={(value) => setMemoryWindow(value[0])}
              disabled={!memoryEnabled}
              min={1}
              max={50}
              step={1}
              className={!memoryEnabled ? "opacity-50" : ""}
            />
            <p className="text-sm text-muted-foreground">
              Number of previous messages to include in the conversation context
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={handleReset} disabled={isSaving}>
          Reset to Default
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </CardFooter>
    </Card>
  );
}