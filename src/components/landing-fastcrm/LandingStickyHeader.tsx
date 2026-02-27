import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { LanguageSelector } from "@/components/ui/LanguageSelector";

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#intelligence", label: "Intelligence" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
  { href: "#fastclub", label: "FastClub" },
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
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center gap-2 cursor-pointer"
        >
          <span className="text-xl font-black tracking-tight uppercase">
            FAST<span className="text-primary">CRM</span>
          </span>
        </button>

        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold uppercase tracking-wide text-[hsl(215,20%,65%)]">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="hover:text-[hsl(210,40%,98%)] transition-colors duration-200">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <LanguageSelector className="text-[hsl(210,40%,98%)] hover:bg-[hsl(217,33%,17%)]" />
          <Link to="/auth" className="hidden md:inline-flex">
            <Button
              variant="ghost"
              size="sm"
              className="text-[hsl(210,40%,98%)] hover:bg-[hsl(217,33%,17%)] font-semibold uppercase tracking-wide text-xs"
            >
              Sign In
            </Button>
          </Link>
          <Link to="/auth" className="hidden md:inline-flex">
            <Button size="sm" className="gradient-primary shadow-glow text-primary-foreground font-bold uppercase tracking-wide text-xs">
              Start Free
            </Button>
          </Link>

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
              <SheetTitle className="sr-only">Navigation menu</SheetTitle>
              <nav className="flex flex-col gap-1 mt-8">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="px-4 py-3 text-sm font-semibold uppercase tracking-wide text-[hsl(215,20%,65%)] hover:text-[hsl(210,40%,98%)] hover:bg-[hsl(217,33%,17%)] rounded-md transition-colors duration-200"
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
                    Sign In
                  </Button>
                </Link>
                <Link to="/auth" onClick={() => setMobileOpen(false)}>
                  <Button className="w-full gradient-primary shadow-glow text-primary-foreground font-bold uppercase">
                    Start Free
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
