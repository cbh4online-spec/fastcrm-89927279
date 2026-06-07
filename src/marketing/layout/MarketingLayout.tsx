import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  PUBLIC_CTA_NAVIGATION,
  PUBLIC_FOOTER_NAVIGATION,
  PUBLIC_PRIMARY_NAVIGATION,
} from "@/config/publicNavigation";

const PRIMARY_NAV = PUBLIC_PRIMARY_NAVIGATION.filter((item) => item.visibility === "primary");
const PRIMARY_CTA = PUBLIC_CTA_NAVIGATION[0];

const FOOTER_PRODUCT_LINKS = PUBLIC_FOOTER_NAVIGATION.filter((item) =>
  ["/fastcrm-whatsapp-sales", "/funcionalidades", "/precos", "/casos"].includes(item.href),
);

const FOOTER_COMPANY_LINKS = PUBLIC_FOOTER_NAVIGATION.filter((item) =>
  ["/sobre", "/contacto"].includes(item.href),
);

const FOOTER_LEGAL_LINKS = PUBLIC_FOOTER_NAVIGATION.filter((item) =>
  ["/privacy", "/terms", "/cookies"].includes(item.href),
);

export default function MarketingLayout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
              F
            </div>
            <span className="text-lg font-semibold tracking-tight">FastCRM</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {PRIMARY_NAV.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    "px-3 py-2 text-sm rounded-md transition-colors",
                    isActive
                      ? "text-foreground bg-muted"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/app">Entrar</Link>
            </Button>
            {PRIMARY_CTA && (
              <Button size="sm" asChild>
                <Link to={PRIMARY_CTA.href}>{PRIMARY_CTA.label}</Link>
              </Button>
            )}
          </div>

          <button
            className="md:hidden p-2 -mr-2"
            aria-label="Abrir menu"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {open && (
          <div className="md:hidden border-t border-border/50 bg-background">
            <div className="container mx-auto px-4 py-3 flex flex-col gap-1">
              {PRIMARY_NAV.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className="px-3 py-2 text-sm rounded-md hover:bg-muted"
                >
                  {item.label}
                </Link>
              ))}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" asChild className="flex-1">
                  <Link to="/app">Entrar</Link>
                </Button>
                {PRIMARY_CTA && (
                  <Button size="sm" asChild className="flex-1">
                    <Link to={PRIMARY_CTA.href}>{PRIMARY_CTA.label}</Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="border-t border-border/50 mt-24">
        <div className="container mx-auto px-4 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
                F
              </div>
              <span className="text-lg font-semibold">FastCRM</span>
            </div>
            <p className="text-sm text-muted-foreground">
              O CRM com IA pensado para PME portuguesas. Organize leads, conversas, oportunidades e follow-ups.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">Produto</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {FOOTER_PRODUCT_LINKS.map((item) => (
                <li key={item.href}>
                  <Link to={item.href} className="hover:text-foreground">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">Empresa</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {FOOTER_COMPANY_LINKS.map((item) => (
                <li key={item.href}>
                  <Link to={item.href} className="hover:text-foreground">
                    {item.label === "Sobre" ? "Sobre nós" : item.label}
                  </Link>
                </li>
              ))}
              {PRIMARY_CTA && (
                <li>
                  <Link to={PRIMARY_CTA.href} className="hover:text-foreground">
                    {PRIMARY_CTA.label}
                  </Link>
                </li>
              )}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">Conta</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/app" className="hover:text-foreground">Entrar</Link></li>
              {PRIMARY_CTA && (
                <li>
                  <Link to={PRIMARY_CTA.href} className="hover:text-foreground">
                    {PRIMARY_CTA.label}
                  </Link>
                </li>
              )}
            </ul>
          </div>
        </div>
        <div className="border-t border-border/50">
          <div className="container mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
            <p>© {new Date().getFullYear()} FastCRM · vendesimples.com · Feito em Portugal</p>
            <div className="flex gap-4">
              {FOOTER_LEGAL_LINKS.map((item) => (
                <Link key={item.href} to={item.href} className="hover:text-foreground">
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
