import { ReactNode, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { ClubSidebar } from "./ClubSidebar";
import { Button } from "@/components/ui/button";
import { Menu, Loader2 } from "lucide-react";

interface ClubLayoutProps {
  children: ReactNode;
}

export function ClubLayout({ children }: ClubLayoutProps) {
  const { user, loading: authLoading } = useAuth();
  const { loading: workspaceLoading } = useWorkspace();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (authLoading || workspaceLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/club/fastclub/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile topbar */}
      <div className="lg:hidden flex items-center gap-3 p-3 border-b bg-card/50">
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="h-9 w-9">
          <Menu className="h-5 w-5" />
        </Button>
        <span className="font-semibold text-sm text-foreground">FastClub</span>
      </div>
      <div className="max-w-[1600px] mx-auto lg:flex lg:gap-6 lg:p-6">
        <ClubSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 min-w-0 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
