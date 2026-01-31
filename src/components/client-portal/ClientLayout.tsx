import { ReactNode, useState } from "react";
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
  Heart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClientAuth } from "@/hooks/client-portal/useClientAuth";
import { useCart } from "@/contexts/CartContext";
import { useClientFavorites } from "@/hooks/client-portal/useClientFavorites";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClientLayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: "/client/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/client/catalog", icon: Package, label: "Catálogo" },
  { path: "/client/favorites", icon: Heart, label: "Favoritos", showBadge: "favorites" as const },
  { path: "/client/cart", icon: ShoppingCart, label: "Carrinho", showBadge: "cart" as const },
  { path: "/client/orders", icon: FileText, label: "Encomendas" },
];

export function ClientLayout({ children }: ClientLayoutProps) {
  const { clientUser, loading, signOut, isAuthenticated } = useClientAuth();
  const { itemCount } = useCart();
  const { favoriteCount } = useClientFavorites();
  const location = useLocation();
  
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

  if (!isAuthenticated) {
    return <Navigate to="/client/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/client/dashboard" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">FC</span>
            </div>
            <span className="font-semibold text-lg hidden sm:inline">Portal Cliente</span>
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
          <p>© {new Date().getFullYear()} FastCRM - Portal de Cliente Profissional</p>
        </div>
      </footer>
    </div>
  );
}
