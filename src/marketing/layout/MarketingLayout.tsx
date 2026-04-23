import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Funcionalidades", href: "/funcionalidades" },
  { label: "Preços", href: "/precos" },
  { label: "Casos", href: "/casos" },
  { label: "Sobre", href: "/sobre" },
  { label: "Contacto", href: "/contacto" },
];

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
            {NAV.map((n) => (
              <NavLink
                key={n.href}
                to={n.href}
                className={({ isActive }) =>
                  cn(
                    "px-3 py-2 text-sm rounded-md transition-colors",
                    isActive
                      ? "text-foreground bg-muted"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                  )
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/app">Entrar</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/contacto?tipo=demo">Pedir demo</Link>
            </Button>
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
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  to={n.href}
                  className="px-3 py-2 text-sm rounded-md hover:bg-muted"
                >
                  {n.label}
                </Link>
              ))}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" asChild className="flex-1">
                  <Link to="/app">Entrar</Link>
                </Button>
                <Button size="sm" asChild className="flex-1">
                  <Link to="/contacto?tipo=demo">Pedir demo</Link>
                </Button>
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
              O CRM com IA pensado para PME portuguesas. Vende mais, com a mesma equipa.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">Produto</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/funcionalidades" className="hover:text-foreground">Funcionalidades</Link></li>
              <li><Link to="/precos" className="hover:text-foreground">Preços</Link></li>
              <li><Link to="/casos" className="hover:text-foreground">Casos</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">Empresa</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/sobre" className="hover:text-foreground">Sobre nós</Link></li>
              <li><Link to="/contacto" className="hover:text-foreground">Contacto</Link></li>
              <li><a href="https://fastcrm.lovable.app/dashboard/pitch" className="hover:text-foreground">Apresentação</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">Conta</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/app" className="hover:text-foreground">Entrar</Link></li>
              <li><Link to="/contacto?tipo=demo" className="hover:text-foreground">Pedir demo</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border/50">
          <div className="container mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
            <p>© {new Date().getFullYear()} FastCRM · vendesimples.com · Feito em Portugal</p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-foreground">Privacidade</a>
              <a href="#" className="hover:text-foreground">Termos</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
