import { ReactNode, useState } from "react";
import { AdaptiveDashboardProvider } from "@/contexts/AdaptiveDashboardContext";
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
import { GlobalNoCreditsDialog } from "@/components/credits/GlobalNoCreditsDialog";
import { CopilotDrawer } from "@/components/copilot/CopilotDrawer";
import { useSessionTracker } from "@/hooks/useSessionTracker";
import { MobileBottomNav } from "./MobileBottomNav";
import { useIsMobile } from "@/hooks/use-mobile";

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
  // Default to adaptive sidebar when no shell v2 flag is active
  const useAdaptive = adaptiveSidebar || !shellV2;
  const { collapsed } = useSidebarCollapse();
  const showFAB = location.pathname.includes("store-products") || location.pathname.includes("products");
  const isMobile = useIsMobile();
  useSessionTracker();

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
    <AdaptiveDashboardProvider>
      <WorkspaceStatusGuard>
        <div className="h-screen flex bg-background overflow-hidden">
          {useAdaptive ? (
            <AdaptiveSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onOpen={() => setSidebarOpen(true)} />
          ) : shellV2 ? (
            <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          ) : (
            <SidebarV1 open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          )}
          <div className={`flex-1 flex flex-col min-w-0 h-screen overflow-hidden transition-all duration-200 ${useAdaptive ? (collapsed ? "lg:pl-16" : "lg:pl-[280px]") : collapsed ? "lg:pl-14" : "lg:pl-64"}`}>
            <TopBar onMenuClick={() => setSidebarOpen(true)} />
            <AIUsageBanner />
            <main
              className={`flex-1 animate-fade-in p-3 sm:p-4 md:p-6 overflow-auto bg-background mobile-scroll-momentum ${isMobile ? "with-mobile-nav-pb" : ""}`}
            >
              {children}
            </main>
            {showFAB && <MQPCFloatingButton />}
            <VoiceConversationWidget />
            <GlobalNoCreditsDialog />
            <CopilotDrawer />
            {isMobile && <MobileBottomNav onMenuClick={() => setSidebarOpen(true)} />}
          </div>
        </div>
      </WorkspaceStatusGuard>
    </AdaptiveDashboardProvider>
  );
}
