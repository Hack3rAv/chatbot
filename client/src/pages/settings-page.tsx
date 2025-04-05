import { ApiConfig } from "@/components/settings/api-config";
import { MemorySettings } from "@/components/settings/memory-settings";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function SettingsPage() {
  const { user, isLoading } = useAuth();
  const [_, navigate] = useLocation();
  
  // Redirect to auth page if not logged in
  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth");
    }
  }, [user, isLoading, navigate]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return (
    <div className="container max-w-6xl px-4 py-8 mx-auto">
      <div className="flex flex-col space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your application settings and preferences.
          </p>
        </div>
        
        <div className="grid gap-8">
          <div>
            <h2 className="text-xl font-semibold mb-4">API Configuration</h2>
            <ApiConfig />
          </div>
          
          <div>
            <h2 className="text-xl font-semibold mb-4">Memory Settings</h2>
            <MemorySettings />
          </div>
        </div>
      </div>
    </div>
  );
}