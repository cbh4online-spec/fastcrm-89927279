import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Zap, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import type { VerticalConfig } from "@/config/verticalConfigs";

const navLinks = [
  { href: "#vertical-cta-form", label: "Contacto" },
];

interface Props {
  config: VerticalConfig;
}

export function VerticalStickyHeader({ config }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 60);
  });

  const scrollToForm = () => {
    document.getElementById("vertical-cta-form")?.scrollIntoView({ behavior: "smooth" });
    setMobileOpen(false);
  };

  return (
    <motion.header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[hsl(222,47%,4%)]/90 backdrop-blur-xl border-b border-[hsl(217,33%,17%)]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
        <Link to="/" className="flex items-center gap-2 shrink-0 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight">FastCRM</span>
          <span className="text-xs text-[hsl(215,20%,65%)] hidden sm:inline truncate">para {config.nome}</span>
        </Link>

        <div className="flex items-center gap-2">
          {/* CTA visível apenas em sm+ */}
          <Button
            size="sm"
            onClick={scrollToForm}
            className="gradient-primary shadow-glow text-primary-foreground hidden sm:inline-flex"
          >
            {config.cta_principal}
          </Button>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden text-[hsl(210,40%,98%)]">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-[hsl(222,47%,4%)] border-[hsl(217,33%,17%)] w-72">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <div className="flex flex-col gap-3 mt-8 px-4">
                {/* CTA no menu mobile */}
                <Button onClick={scrollToForm} className="w-full gradient-primary shadow-glow text-primary-foreground">
                  {config.cta_principal}
                </Button>
                <Link to="/" onClick={() => setMobileOpen(false)}>
                  <Button variant="ghost" className="w-full text-[hsl(210,40%,98%)] hover:bg-[hsl(217,33%,17%)]">
                    Voltar ao FastCRM
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
