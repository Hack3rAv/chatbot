import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { config, updateConfigFromServer, updateServerConfig } from "@/config";
import { useToast } from "@/hooks/use-toast";
import { useChat } from "@/hooks/use-chat";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Settings } from "lucide-react";

export function ApiConfig() {
  const { toast } = useToast();
  const { currentModel } = useChat();
  const [ollamaApiUrl, setOllamaApiUrl] = useState(config.ollamaApiUrl);
  const [isSaving, setIsSaving] = useState(false);
  const [urlStatus, setUrlStatus] = useState<'unchecked' | 'valid' | 'invalid'>('unchecked');
  
  // Fetch initial config from server
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const updatedConfig = await updateConfigFromServer();
        setOllamaApiUrl(updatedConfig.ollamaApiUrl);
      } catch (error) {
        console.error("Failed to fetch config:", error);
      }
    };
    
    fetchConfig();
  }, []);
  
  const testConnection = async () => {
    try {
      setIsSaving(true);
      const response = await fetch(`${ollamaApiUrl}/api/tags`);
      if (response.ok) {
        setUrlStatus('valid');
        toast({
          title: "Connection Successful",
          description: "Successfully connected to Ollama API",
        });
      } else {
        setUrlStatus('invalid');
        toast({
          title: "Connection Failed",
          description: "Could not connect to Ollama API at the specified URL",
          variant: "destructive",
        });
      }
    } catch (error) {
      setUrlStatus('invalid');
      toast({
        title: "Connection Failed",
        description: "Could not connect to Ollama API at the specified URL",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateServerConfig({ ollamaApiUrl });
      toast({
        title: "Configuration saved",
        description: "Ollama API URL updated successfully",
      });
      testConnection();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update configuration",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleReset = async () => {
    setOllamaApiUrl("http://localhost:11434");
    setIsSaving(true);
    try {
      await updateServerConfig({ ollamaApiUrl: "http://localhost:11434" });
      toast({
        title: "Configuration reset",
        description: "Ollama API URL reset to default",
      });
      setUrlStatus('unchecked');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reset configuration",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            API Configuration
          </CardTitle>
          <Badge variant="outline" className="font-mono text-xs">
            Current Model: {currentModel}
          </Badge>
        </div>
        <CardDescription>
          Configure the Ollama API endpoint used by {config.aiName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ollamaApiUrl" className="flex items-center gap-2">
              Ollama API URL
              {urlStatus === 'valid' && (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
              {urlStatus === 'invalid' && (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
            </Label>
            <Input
              id="ollamaApiUrl"
              value={ollamaApiUrl}
              onChange={(e) => setOllamaApiUrl(e.target.value)}
              placeholder="http://localhost:11434"
              className={urlStatus === 'invalid' ? 'border-red-500' : ''}
            />
            <p className="text-sm text-muted-foreground">
              The URL where Ollama API is running. Default is http://localhost:11434
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div>
          <Button variant="outline" onClick={handleReset} disabled={isSaving} className="mr-2">
            Reset to Default
          </Button>
          <Button variant="secondary" onClick={testConnection} disabled={isSaving}>
            Test Connection
          </Button>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </CardFooter>
    </Card>
  );
}