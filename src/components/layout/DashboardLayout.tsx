import { ReactNode, useEffect, useState } from "react";

// Persiste entre remounts do DashboardLayout (e mesmo entre navegações para /onboarding e volta).
// Evita o loop /dashboard ↔ /onboarding causado por estados transitórios de workspaces vazios
// durante refetch/auth refresh.
let hadWorkspacesEver = false;
import { AdaptiveDashboardProvider } from "@/contexts/AdaptiveDashboardContext";
import { AdaptiveSidebar } from "./AdaptiveSidebar";
import { WatidySidebar } from "./WatidySidebar";
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
import { WhatsAppHealthBanner } from "@/components/whatsapp-pro/WhatsAppHealthBanner";
import { VoiceConversationWidget } from "@/components/voice/VoiceConversationWidget";
import { GlobalNoCreditsDialog } from "@/components/credits/GlobalNoCreditsDialog";
import { CopilotDrawer } from "@/components/copilot/CopilotDrawer";
import { useSessionTracker } from "@/hooks/useSessionTracker";
import { MobileBottomNav } from "./MobileBottomNav";
import { useIsMobile } from "@/hooks/use-mobile";
import { DirectMessagesProvider } from "@/contexts/DirectMessagesProvider";
import { AppModeGuard } from "./AppModeGuard";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, loading: authLoading } = useAuth();
  const { loading: workspaceLoading, workspaces } = useWorkspace();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { enabled: adaptiveSidebar } = useFeatureFlag("ui.adaptive_sidebar_enabled");
  const { enabled: watidySidebar } = useFeatureFlag("ui.watidy_sidebar_enabled");
  // Default to Watidy unless explicitly forced to Adaptive (legacy SidebarV1/Sidebar removidos na Fase 2)
  const useWatidy = watidySidebar || !adaptiveSidebar;
  // (AdaptiveSidebar é o fallback automático quando Watidy está desligado)
  const { collapsed } = useSidebarCollapse();
  const showFAB = location.pathname.includes("store-products") || location.pathname.includes("products");
  const isMobile = useIsMobile();
  useSessionTracker();

  // Lembrar (entre remounts) se já vimos workspaces para não cair em onboarding
  // por estados transitórios (refetch, remount após câmara/scanner, refresh do token, etc.)
  useEffect(() => {
    if (workspaces.length > 0) hadWorkspacesEver = true;
  }, [workspaces.length]);

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

  // Só redirecionar para onboarding se nunca chegámos a ter workspaces nesta sessão.
  if (workspaces.length === 0 && !hadWorkspacesEver) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <AdaptiveDashboardProvider>
      <WorkspaceStatusGuard>
        <DirectMessagesProvider>
          <AppModeGuard>
            <div className="h-screen flex bg-background overflow-hidden">
              <InvoiceXpressSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onOpen={() => setSidebarOpen(true)} />
              <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden transition-all duration-200 lg:pl-[280px]">

                <TopBar onMenuClick={() => setSidebarOpen(true)} />
                <AIUsageBanner />
                <WhatsAppHealthBanner />
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
          </AppModeGuard>
        </DirectMessagesProvider>
      </WorkspaceStatusGuard>
    </AdaptiveDashboardProvider>
  );
}
