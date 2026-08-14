import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { FastCRMLogo } from "@/components/brand/FastCRMLogo";
import {
  PUBLIC_CTA_NAVIGATION,
  PUBLIC_PRIMARY_NAVIGATION,
} from "@/config/publicNavigation";

const NAV = PUBLIC_PRIMARY_NAVIGATION.filter(
  (item) => item.visibility === "primary" && item.href !== "/",
);
const CTA = PUBLIC_CTA_NAVIGATION[0];

export function HeaderV2() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-all duration-300",
          scrolled
            ? "border-b border-navy-100 bg-white/85 backdrop-blur-xl shadow-[0_4px_24px_-12px_hsl(218_70%_14%/0.08)]"
            : "border-b border-transparent bg-white/0",
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 md:h-20 md:px-10">
          {/* Logo */}
          <Link
            to="/"
            aria-label="FastCRM — página inicial"
            className="group inline-flex items-center transition-transform hover:-translate-y-[1px]"
          >
            <FastCRMLogo variant="full" size="lg" className="md:hidden" />
            <FastCRMLogo variant="full" size="xl" className="hidden md:block" />
          </Link>

          {/* Nav (desktop) */}
          <nav className="hidden items-center gap-0.5 xl:flex">
            {NAV.map((item) => (
              <Link
                key={item.label}
                to={item.href}
                className="group relative whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-navy-500 transition-colors hover:text-navy"
              >
                {item.label}
                <span className="pointer-events-none absolute inset-x-3 -bottom-0.5 h-px scale-x-0 bg-gradient-to-r from-brand to-cyan transition-transform duration-300 group-hover:scale-x-100" />
              </Link>
            ))}
          </nav>

          {/* CTAs */}
          <div className="hidden items-center gap-2 xl:flex">
            <Link
              to="/auth"
              className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-navy-500 transition-colors hover:text-navy"
            >
              Entrar
            </Link>
            <Link
              to={CTA.href}
              className="group relative inline-flex items-center gap-1.5 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_hsl(218_70%_14%/0.4)] transition-all hover:-translate-y-0.5 hover:bg-navy-900 hover:shadow-[0_12px_28px_-8px_hsl(218_100%_54%/0.5)] whitespace-nowrap"
            >
              {CTA.label}
              <span className="ml-0.5 transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-navy xl:hidden"
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden border-t border-navy-100 bg-white xl:hidden"
            >
              <div className="space-y-1 px-6 py-5">
                {NAV.map((item) => (
                  <Link
                    key={item.label}
                    to={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="block rounded-lg px-3 py-2.5 text-base font-medium text-navy-500 transition-colors hover:bg-brand/5 hover:text-brand"
                  >
                    {item.label}
                  </Link>
                ))}
                <div className="mt-4 grid grid-cols-2 gap-2 border-t border-navy-100 pt-4">
                  <Link
                    to="/auth"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg border border-navy-100 px-3 py-2.5 text-center text-sm font-medium text-navy"
                  >
                    Entrar
                  </Link>
                  <Link
                    to={CTA.href}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg bg-navy px-3 py-2.5 text-center text-sm font-semibold text-white"
                  >
                    Agendar demo
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
      {/* Spacer for fixed header */}
      <div className="h-16 md:h-20" aria-hidden />
    </>
  );
}
