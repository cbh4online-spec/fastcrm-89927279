import { ReactNode, useEffect, useState } from "react";

// Persiste entre remounts do DashboardLayout (e mesmo entre navegações para /onboarding e volta).
// Evita o loop /dashboard ↔ /onboarding causado por estados transitórios de workspaces vazios
// durante refetch/auth refresh.
let hadWorkspacesEver = false;
import { AdaptiveDashboardProvider } from "@/contexts/AdaptiveDashboardContext";
import { AdaptiveSidebar } from "./AdaptiveSidebar";
import { WatidySidebar } from "./WatidySidebar";
import { InvoiceXpressSidebar } from "./InvoiceXpressSidebar";
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
import { MenuVisibilityGuard } from "./MenuVisibilityGuard";
import { useIsMobile } from "@/hooks/use-mobile";
import { DirectMessagesProvider } from "@/contexts/DirectMessagesProvider";
import { AppModeGuard } from "./AppModeGuard";
import { useGlobalShortcutsHelp } from "@/hooks/useGlobalShortcutsHelp";
import { KeyboardShortcutsModal } from "@/components/keyboard-shortcuts/KeyboardShortcutsModal";


interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, loading: authLoading } = useAuth();
  const { loading: workspaceLoading, workspaces } = useWorkspace();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { open: shortcutsOpen, setOpen: setShortcutsOpen } = useGlobalShortcutsHelp();
  const location = useLocation();

  // Feature flags mantidos por compatibilidade, mas já não forçam Watidy quando desligados.
  useFeatureFlag("ui.adaptive_sidebar_enabled");
  useFeatureFlag("ui.watidy_sidebar_enabled");

  // Selecção da sidebar:
  // 1) Override explícito por URL: ?nav=adaptive|watidy|ix
  // 2) Escolha explícita persistida em localStorage.fastcrm.sidebar (apenas adaptive|watidy|ix)
  // 3) Padrão: AdaptiveSidebar
  const navParam = new URLSearchParams(location.search).get("nav");
  const VALID_NAV = ["adaptive", "watidy", "ix"] as const;
  type NavChoice = typeof VALID_NAV[number];
  if (navParam && (VALID_NAV as readonly string[]).includes(navParam)) {
    try { localStorage.setItem("fastcrm.sidebar", navParam); } catch { /* ignore */ }
  } else if (navParam === "legacy") {
    try { localStorage.removeItem("fastcrm.sidebar"); } catch { /* ignore */ }
  }
  const storedChoice: NavChoice | null = (() => {
    try {
      const v = localStorage.getItem("fastcrm.sidebar");
      return v && (VALID_NAV as readonly string[]).includes(v) ? (v as NavChoice) : null;
    } catch { return null; }
  })();
  const activeNav: NavChoice = (navParam && (VALID_NAV as readonly string[]).includes(navParam))
    ? (navParam as NavChoice)
    : (storedChoice ?? "adaptive");
  const useIX = activeNav === "ix";
  const useWatidy = activeNav === "watidy";
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
              {useIX ? (
                <InvoiceXpressSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onOpen={() => setSidebarOpen(true)} />
              ) : useWatidy ? (
                <WatidySidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onOpen={() => setSidebarOpen(true)} />
              ) : (
                <AdaptiveSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onOpen={() => setSidebarOpen(true)} />
              )}
              <div className={`flex-1 flex flex-col min-w-0 h-screen overflow-hidden transition-all duration-200 ${useIX ? "lg:pl-[280px]" : useWatidy ? (collapsed ? "lg:pl-14" : "lg:pl-[304px]") : (collapsed ? "lg:pl-16" : "lg:pl-[280px]")}`}>


                <TopBar onMenuClick={() => setSidebarOpen(true)} />
                <AIUsageBanner />
                <main
                  className={`flex-1 animate-fade-in p-3 sm:p-4 md:p-6 overflow-auto bg-background mobile-scroll-momentum ${isMobile ? "with-mobile-nav-pb" : ""}`}
                >
                  <WhatsAppHealthBanner />
                  <MenuVisibilityGuard>{children}</MenuVisibilityGuard>
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
