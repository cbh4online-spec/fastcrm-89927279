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
  CheckCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClientAuth } from "@/hooks/client-portal/useClientAuth";
import { useCart } from "@/contexts/CartContext";
import { useClientFavorites } from "@/hooks/client-portal/useClientFavorites";
import { useClientPermissions } from "@/hooks/client-portal/useClientPermissions";
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
  { path: "/client/assistant", icon: Sparkles, label: "Assistente IA" },
  { path: "/client/favorites", icon: Heart, label: "Favoritos", showBadge: "favorites" },
  { path: "/client/cart", icon: ShoppingCart, label: "Carrinho", showBadge: "cart" },
  { path: "/client/orders", icon: FileText, label: "Encomendas" },
  { path: "/client/invoices", icon: Receipt, label: "Faturas", requiredPermission: "canViewInvoices" },
  { path: "/client/financial", icon: TrendingUp, label: "Financeiro", requiredPermission: "canViewFinancials" },
  { path: "/client/approvals", icon: CheckCircle, label: "Aprovações", requiredPermission: "canApprove" },
  { path: "/client/contracts", icon: FileCheck, label: "Contratos", requiredPermission: "canViewContracts" },
  { path: "/client/support", icon: HeadphonesIcon, label: "Suporte", requiredPermission: "canCreateTickets" },
  { path: "/client/team", icon: Users, label: "Equipa", requiredPermission: "canManageTeam" },
];

export function ClientLayout({ children }: ClientLayoutProps) {
  // Get workspace ID from localStorage for multi-tenancy
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
  
  // Fetch workspace branding based on client's workspace
  useEffect(() => {
    async function fetchWorkspaceBranding() {
      if (!clientUser?.workspace_id) return;
      
      const { data } = await supabase
        .from("workspaces")
        .select("name, logo_url")
        .eq("id", clientUser.workspace_id)
        .single();
      
      if (data) {
        setWorkspaceBranding(data);
      }
    }
    
    fetchWorkspaceBranding();
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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect to login if not authenticated (either no user or no client record)
  // The login page handles the hasAuthButNoClient case with a proper error message
  if (!isAuthenticated) {
    return <Navigate to="/client/login" replace />;
  }

  const portalName = workspaceBranding?.name ? `Portal ${workspaceBranding.name}` : "Portal Cliente";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/client/dashboard" className="flex items-center gap-2">
            <WorkspaceLogo
              logoUrl={workspaceBranding?.logo_url}
              workspaceName={workspaceBranding?.name}
              size="md"
              variant="portal"
            />
            <span className="font-semibold text-lg hidden sm:inline">{portalName}</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const badgeCount = getBadgeCount(item.showBadge);
              return (
              <Link key={item.path} to={item.path}>
                <Button
                  variant={location.pathname === item.path ? "secondary" : "ghost"}
                  size="sm"
                  className="relative"
                >
                  <item.icon className="h-4 w-4 mr-2" />
                  {item.label}
                  {badgeCount > 0 && (
                    <span className={cn(
                      "absolute -top-1 -right-1 h-5 w-5 rounded-full text-xs flex items-center justify-center",
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

          {/* User Menu */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{clientUser?.name}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Sair</span>
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
          <div className="md:hidden border-t bg-background p-4">
            <nav className="flex flex-col gap-2">
              {navItems.map((item) => {
                const badgeCount = getBadgeCount(item.showBadge);
                return (
                <Link 
                  key={item.path} 
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button
                    variant={location.pathname === item.path ? "secondary" : "ghost"}
                    className="w-full justify-start relative"
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
      <main className="container py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t py-6 mt-auto">
        <div className="container text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} {workspaceBranding?.name || "FastCRM"} - Portal de Cliente Profissional</p>
        </div>
      </footer>
    </div>
  );
}
