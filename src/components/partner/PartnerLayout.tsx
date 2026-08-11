import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Package, ShoppingCart, FileText, LogOut, Menu, X,
  User, Building2, CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePartnerAuth } from "@/hooks/partner/usePartnerAuth";
import { usePartnerAccount } from "@/hooks/partner/usePartnerAccount";
import { usePartnerCart } from "@/contexts/PartnerCartContext";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { WorkspaceLogo } from "@/components/workspace/WorkspaceLogo";
import { formatMoneyEur } from "@/lib/money";

interface PartnerLayoutProps {
  children: ReactNode;
}

interface WorkspaceBranding {
  name: string;
  logo_url: string | null;
  primary_color: string | null;
}

const navItems = [
  { path: "/partner/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/partner/catalog", icon: Package, label: "Catálogo" },
  { path: "/partner/cart", icon: ShoppingCart, label: "Carrinho", showBadge: true },
  { path: "/partner/orders", icon: FileText, label: "Encomendas" },
  { path: "/partner/account", icon: Building2, label: "Conta" },
];

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

/**
 * Apresentacional puro: header, nav, footer, branding.
 *
 * O gate de auth (loading / error / not-authenticated) vive no
 * `PartnerProtectedLayout` para que este componente NÃO seja desmontado
 * entre transições de rota — eliminando flicker do header e re-fetches
 * desnecessários de branding entre Dashboard ↔ Catálogo.
 */
export function PartnerLayout({ children }: PartnerLayoutProps) {
  const { partnerUser, signOut } = usePartnerAuth();
  const { account } = usePartnerAccount(partnerUser?.partner_account_id);
  const { itemCount } = usePartnerCart();
  const location = useLocation();
  const [workspaceBranding, setWorkspaceBranding] = useState<WorkspaceBranding | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    async function fetchBranding() {
      if (!partnerUser?.workspace_id) return;
      const { data } = await supabase
        .from("public_workspaces")
        .select("name, logo_url, primary_color")
        .eq("id", partnerUser.workspace_id)
        .single();
      if (data) {
        setWorkspaceBranding(data as WorkspaceBranding);
        if (data.primary_color) {
          const hsl = hexToHsl(data.primary_color);
          if (hsl) {
            document.documentElement.style.setProperty("--primary", hsl);
            document.documentElement.style.setProperty("--ring", hsl);
          }
        }
      }
    }
    fetchBranding();
    return () => {
      document.documentElement.style.removeProperty("--primary");
      document.documentElement.style.removeProperty("--ring");
    };
  }, [partnerUser?.workspace_id]);

  const portalName = workspaceBranding?.name ? `${workspaceBranding.name} — Partner Center` : "Partner Center";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-20 items-center justify-between">
          <Link to="/partner/dashboard" className="flex items-center gap-3">
            {workspaceBranding?.logo_url ? (
              <img
                src={workspaceBranding.logo_url}
                alt={workspaceBranding?.name || "Workspace"}
                className="h-14 w-auto max-w-[260px] object-contain flex-shrink-0"
              />
            ) : (
              <>
                <WorkspaceLogo
                  workspaceName={workspaceBranding?.name}
                  size="xl"
                  variant="portal"
                />
                <span className="font-semibold text-lg hidden sm:inline tracking-tight">{portalName}</span>
              </>
            )}
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + "/");
              return (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                    className={cn("relative", isActive && "bg-primary/10 text-primary hover:bg-primary/15")}
                  >
                    <item.icon className="h-4 w-4 mr-1.5" />
                    {item.label}
                    {item.showBadge && itemCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                        {itemCount}
                      </span>
                    )}
                  </Button>
                </Link>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Credit indicator */}
            {account && account.credit_limit > 0 && (
              <div className="hidden lg:flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-muted/50">
                <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Crédito:</span>
                <span className="font-semibold">
                  {formatMoneyEur(account.credit_limit - account.current_credit_exposure)}
                </span>
              </div>
            )}

            {/* Tier badge */}
            {account?.tier && (
              <Badge
                variant="outline"
                className="hidden lg:flex"
                style={{ borderColor: account.tier.color, color: account.tier.color }}
              >
                {account.tier.name}
              </Badge>
            )}

            <div className="hidden sm:flex items-center gap-2 text-sm px-2">
              <div className="p-1.5 rounded-full bg-primary/10">
                <User className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="font-medium">{partnerUser?.full_name}</span>
            </div>

            <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground hover:text-destructive">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline ml-1.5">Sair</span>
            </Button>

            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-background/95 backdrop-blur-xl p-4">
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link key={item.path} to={item.path} onClick={() => setMobileMenuOpen(false)}>
                    <Button variant={isActive ? "secondary" : "ghost"} className={cn("w-full justify-start relative", isActive && "bg-primary/10 text-primary")}>
                      <item.icon className="h-4 w-4 mr-2" />
                      {item.label}
                      {item.showBadge && itemCount > 0 && (
                        <span className="ml-auto h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">{itemCount}</span>
                      )}
                    </Button>
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      <main className="container py-8">{children}</main>

      <footer className="border-t py-6 mt-auto">
        <div className="container flex items-center justify-between text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} {workspaceBranding?.name || "FastCRM"}</p>
          <p className="hidden sm:block">Partner Center — Portal de Parceiros Profissional</p>
        </div>
      </footer>
    </div>
  );
}
