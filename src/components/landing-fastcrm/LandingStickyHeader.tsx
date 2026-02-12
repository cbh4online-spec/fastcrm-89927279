import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Zap, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

const navLinks = [
  { href: "#problema", label: "Problema" },
  { href: "#solucao", label: "Solução" },
  { href: "#arquitectura", label: "Arquitectura" },
  { href: "#metricas", label: "Métricas" },
  { href: "#pricing", label: "Investimento" },
  { href: "#faq", label: "FAQ" },
];

export function LandingStickyHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 60);
  });

  return (
    <motion.header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[hsl(222,47%,4%)]/90 backdrop-blur-xl border-b border-[hsl(217,33%,17%)]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight">FastCRM</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[hsl(215,20%,75%)]">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="hover:text-white transition-colors duration-200">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link to="/auth" className="hidden md:inline-flex">
            <Button
              variant="ghost"
              size="sm"
              className="text-[hsl(210,40%,98%)] hover:bg-[hsl(217,33%,17%)]"
            >
              Entrar
            </Button>
          </Link>
          <Link to="/auth" className="hidden md:inline-flex">
            <Button size="sm" className="gradient-primary shadow-glow text-primary-foreground">
              Criar Workspace
            </Button>
          </Link>

          {/* Mobile menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden text-[hsl(210,40%,98%)]">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="bg-[hsl(222,47%,4%)] border-[hsl(217,33%,17%)] w-72"
            >
              <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
              <nav className="flex flex-col gap-1 mt-8">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="px-4 py-3 text-sm font-medium text-[hsl(215,20%,75%)] hover:text-white hover:bg-[hsl(217,33%,17%)] rounded-md transition-colors duration-200"
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
              <div className="flex flex-col gap-3 mt-8 px-4">
                <Link to="/auth" onClick={() => setMobileOpen(false)}>
                  <Button
                    variant="ghost"
                    className="w-full text-[hsl(210,40%,98%)] hover:bg-[hsl(217,33%,17%)]"
                  >
                    Entrar
                  </Button>
                </Link>
                <Link to="/auth" onClick={() => setMobileOpen(false)}>
                  <Button className="w-full gradient-primary shadow-glow text-primary-foreground">
                    Criar Workspace
                  </Button>
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </motion.header>
  );
}
