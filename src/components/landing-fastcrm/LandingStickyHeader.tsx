import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";

export function LandingStickyHeader() {
  const [scrolled, setScrolled] = useState(false);
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
          <a href="#problema" className="hover:text-white transition-colors duration-200">
            Problema
          </a>
          <a href="#solucao" className="hover:text-white transition-colors duration-200">
            Solução
          </a>
          <a href="#arquitectura" className="hover:text-white transition-colors duration-200">
            Arquitectura
          </a>
          <a href="#metricas" className="hover:text-white transition-colors duration-200">
            Métricas
          </a>
          <a href="#pricing" className="hover:text-white transition-colors duration-200">
            Investimento
          </a>
          <a href="#faq" className="hover:text-white transition-colors duration-200">
            FAQ
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <Link to="/auth">
            <Button
              variant="ghost"
              size="sm"
              className="text-[hsl(210,40%,98%)] hover:bg-[hsl(217,33%,17%)]"
            >
              Entrar
            </Button>
          </Link>
          <Link to="/auth">
            <Button size="sm" className="gradient-primary shadow-glow text-primary-foreground">
              Criar Workspace
            </Button>
          </Link>
        </div>
      </div>
    </motion.header>
  );
}
