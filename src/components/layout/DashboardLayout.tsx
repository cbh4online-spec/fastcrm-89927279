import { ReactNode, useState } from "react";
import { Sidebar } from "./Sidebar";
import { SidebarV1 } from "./SidebarV1";
import { AdaptiveSidebar } from "./AdaptiveSidebar";
import { TopBar } from "./TopBar";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useLocation } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { WorkspaceStatusGuard } from "@/components/workspace/WorkspaceStatusGuard";
import { Loader2 } from "lucide-react";
import { MQPCFloatingButton } from "@/components/mqpc/MQPCFloatingButton";
import { useFeatureFlag } from "@/hooks/useFeatureFlags";
import { useSidebarCollapse } from "@/hooks/useSidebarCollapse";
import { AIUsageBanner } from "@/components/saas/AIUsageBanner";
import { VoiceConversationWidget } from "@/components/voice/VoiceConversationWidget";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, loading: authLoading } = useAuth();
  const { loading: workspaceLoading, workspaces } = useWorkspace();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { enabled: shellV2 } = useFeatureFlag("ui.shell_v2_enabled");
  const { enabled: adaptiveSidebar } = useFeatureFlag("ui.adaptive_sidebar_enabled");
  const { collapsed } = useSidebarCollapse();
  const showFAB = location.pathname.includes("store-products") || location.pathname.includes("products");

  if (authLoading || workspaceLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If user has no workspaces, redirect to onboarding
  if (workspaces.length === 0) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <WorkspaceStatusGuard>
      <div className="min-h-screen flex bg-background">
        {adaptiveSidebar ? (
          <AdaptiveSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        ) : shellV2 ? (
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        ) : (
          <SidebarV1 open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        )}
        <div className={`flex-1 flex flex-col min-h-screen transition-all duration-200 ${adaptiveSidebar ? (collapsed ? "lg:pl-16" : "lg:pl-[280px]") : collapsed ? "lg:pl-14" : "lg:pl-64"}`}>
          <TopBar onMenuClick={() => setSidebarOpen(true)} />
          <AIUsageBanner />
          <main className="flex-1 animate-fade-in p-4 md:p-6">
            {children}
          </main>
          {showFAB && <MQPCFloatingButton />}
          <VoiceConversationWidget />
        </div>
      </div>
    </WorkspaceStatusGuard>
  );
}
