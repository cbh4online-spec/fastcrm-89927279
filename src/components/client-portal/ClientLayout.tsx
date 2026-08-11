import { ReactNode, useState, useEffect, useMemo } from "react";
import { Link, useLocation, Navigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  FileText, 
  LogOut, 
  Menu, 
  X,
  User,
  Heart,
  Sparkles,
  Users,
  Receipt,
  TrendingUp,
  FileCheck,
  HeadphonesIcon,
  CheckCircle,
  Stethoscope,
  BarChart3,
  Trophy,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClientAuth } from "@/hooks/client-portal/useClientAuth";
import { useCart } from "@/contexts/CartContext";
import { useClientFavorites } from "@/hooks/client-portal/useClientFavorites";
import { useClientPermissions } from "@/hooks/client-portal/useClientPermissions";
import { ClientNotificationBadge } from "./ClientNotificationBadge";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { WorkspaceLogo } from "@/components/workspace/WorkspaceLogo";

interface ClientLayoutProps {
  children: ReactNode;
}

interface WorkspaceBranding {
  name: string;
  logo_url: string | null;
  primary_color: string | null;
}

interface NavItem {
  path: string;
  icon: typeof LayoutDashboard;
  label: string;
  showBadge?: "cart" | "favorites";
  requiredPermission?: "canViewInvoices" | "canViewFinancials" | "canViewContracts" | "canManageTeam" | "canApprove" | "canCreateTickets";
}

const allNavItems: NavItem[] = [
  { path: "/client/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/client/catalog", icon: Package, label: "Catálogo" },
  { path: "/client/diagnosis", icon: Stethoscope, label: "Diagnóstico" },
  { path: "/client/assistant", icon: Sparkles, label: "Assistente IA" },
  { path: "/client/favorites", icon: Heart, label: "Favoritos", showBadge: "favorites" },
  { path: "/client/cart", icon: ShoppingCart, label: "Carrinho", showBadge: "cart" },
  { path: "/client/orders", icon: FileText, label: "Encomendas" },
  { path: "/client/insights/consumption", icon: BarChart3, label: "Consumo", requiredPermission: "canViewFinancials" },
  { path: "/client/insights/rankings", icon: Trophy, label: "Rankings" },
  { path: "/client/invoices", icon: Receipt, label: "Faturas", requiredPermission: "canViewInvoices" },
  { path: "/client/financial", icon: TrendingUp, label: "Financeiro", requiredPermission: "canViewFinancials" },
  { path: "/client/approvals", icon: CheckCircle, label: "Aprovações", requiredPermission: "canApprove" },
  { path: "/client/contracts", icon: FileCheck, label: "Contratos", requiredPermission: "canViewContracts" },
  { path: "/client/support", icon: HeadphonesIcon, label: "Suporte", requiredPermission: "canCreateTickets" },
  { path: "/client/team", icon: Users, label: "Equipa", requiredPermission: "canManageTeam" },
];

// Convert hex to HSL for CSS variable
function hexToHsl(hex: string): string | null {
  try {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return null;
    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  } catch {
    return null;
  }
}

export function ClientLayout({ children }: ClientLayoutProps) {
  const savedWorkspaceId = localStorage.getItem("client_workspace_id") || undefined;
  const { clientUser, loading, signOut, isAuthenticated, hasAuthButNoClient } = useClientAuth({ workspaceId: savedWorkspaceId });
  const { itemCount } = useCart();
  const { favoriteCount } = useClientFavorites();
  const permissions = useClientPermissions();
  const location = useLocation();
  const [workspaceBranding, setWorkspaceBranding] = useState<WorkspaceBranding | null>(null);

  const navItems = useMemo(() => {
    return allNavItems.filter((item) => {
      if (!item.requiredPermission) return true;
      return permissions[item.requiredPermission];
    });
  }, [permissions]);
  
  // Fetch workspace branding and apply dynamic theming
  useEffect(() => {
    async function fetchWorkspaceBranding() {
      if (!clientUser?.workspace_id) return;
      
      const { data } = await supabase
        .from("public_workspaces")
        .select("name, logo_url, primary_color")
        .eq("id", clientUser.workspace_id)
        .single();
      
      if (data) {
        setWorkspaceBranding(data as WorkspaceBranding);

        // Apply dynamic brand color as CSS variable
        if (data.primary_color) {
          const hsl = hexToHsl(data.primary_color);
          if (hsl) {
            document.documentElement.style.setProperty("--portal-primary", hsl);
            document.documentElement.style.setProperty("--primary", hsl);
            document.documentElement.style.setProperty("--ring", hsl);
          }
        }
      }
    }
    
    fetchWorkspaceBranding();

    // Cleanup: restore original primary on unmount
    return () => {
      document.documentElement.style.removeProperty("--portal-primary");
      // Note: --primary and --ring will be restored by navigating away from portal
    };
  }, [clientUser?.workspace_id]);
  
  const getBadgeCount = (badgeType?: "cart" | "favorites") => {
    if (badgeType === "cart") return itemCount;
    if (badgeType === "favorites") return favoriteCount;
    return 0;
  };
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          {workspaceBranding?.logo_url && (
            <WorkspaceLogo logoUrl={workspaceBranding.logo_url} workspaceName={workspaceBranding.name} size="lg" variant="portal" />
          )}
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">A carregar o portal...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/client/login" replace />;
  }

  const portalName = workspaceBranding?.name ? `Portal ${workspaceBranding.name}` : "Portal Cliente";

  return (
    <div className="editorial-portal min-h-screen flex flex-col">
      {/* Header — Editorial premium */}
      <header className="sticky top-0 z-50 border-b border-[hsl(var(--editorial-border))]/70 bg-[hsl(var(--editorial-cream))]/85 backdrop-blur-xl">
        <div className="container flex h-20 items-center justify-between">
          {/* Logo */}
          <Link to="/client/dashboard" className="flex items-center gap-3">
            {workspaceBranding?.logo_url ? (
              <img
                src={workspaceBranding.logo_url}
                alt={workspaceBranding.name || "Workspace"}
                className="h-14 w-auto max-w-[260px] object-contain flex-shrink-0"
              />
            ) : (
              <>
                <WorkspaceLogo
                  workspaceName={workspaceBranding?.name}
                  size="xl"
                  variant="portal"
                />
                <span className="font-editorial text-2xl tracking-tight text-[hsl(var(--editorial-ink))] hidden sm:inline">{portalName}</span>
              </>
            )}
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-0.5">
            {navItems.map((item) => {
              const badgeCount = getBadgeCount(item.showBadge);
              const isActive = location.pathname === item.path;
              return (
              <Link key={item.path} to={item.path}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "relative transition-all",
                    isActive && "bg-primary/10 text-primary hover:bg-primary/15"
                  )}
                >
                  <item.icon className="h-4 w-4 mr-1.5" />
                  {item.label}
                  {badgeCount > 0 && (
                    <span className={cn(
                      "absolute -top-1 -right-1 h-5 w-5 rounded-full text-xs flex items-center justify-center font-bold",
                      item.showBadge === "favorites" 
                        ? "bg-red-500 text-white" 
                        : "bg-primary text-primary-foreground"
                    )}>
                      {badgeCount}
                    </span>
                  )}
                </Button>
              </Link>
            )})}
          </nav>

          {/* User Menu — Premium */}
          <div className="flex items-center gap-2">
            <ClientNotificationBadge />
            <Link to="/client/security">
              <Button variant="ghost" size="icon" className="hidden sm:flex">
                <Shield className="h-4 w-4" />
              </Button>
            </Link>
            <div className="hidden sm:flex items-center gap-2 text-sm px-2">
              <div className="p-1.5 rounded-full bg-primary/10">
                <User className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="font-medium">{clientUser?.name}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground hover:text-destructive">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline ml-1.5">Sair</span>
            </Button>

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-background/95 backdrop-blur-xl p-4">
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => {
                const badgeCount = getBadgeCount(item.showBadge);
                const isActive = location.pathname === item.path;
                return (
                <Link 
                  key={item.path} 
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start relative",
                      isActive && "bg-primary/10 text-primary"
                    )}
                  >
                    <item.icon className="h-4 w-4 mr-2" />
                    {item.label}
                    {badgeCount > 0 && (
                      <span className={cn(
                        "ml-auto h-5 w-5 rounded-full text-xs flex items-center justify-center",
                        item.showBadge === "favorites"
                          ? "bg-red-500 text-white"
                          : "bg-primary text-primary-foreground"
                      )}>
                        {badgeCount}
                      </span>
                    )}
                  </Button>
                </Link>
              )})}
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="container py-8">
        {children}
      </main>

      {/* Footer — Premium */}
      <footer className="border-t py-6 mt-auto">
        <div className="container flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            {workspaceBranding?.logo_url && (
              <WorkspaceLogo logoUrl={workspaceBranding.logo_url} workspaceName={workspaceBranding.name} size="sm" variant="portal" />
            )}
            <p>© {new Date().getFullYear()} {workspaceBranding?.name || "FastCRM"}</p>
          </div>
          <p className="hidden sm:block">Portal de Cliente Profissional</p>
        </div>
      </footer>
    </div>
  );
}
