import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

import verticalImobiliario from "@/assets/verticals/vertical-imobiliario.jpg";
import verticalConstrucao from "@/assets/verticals/vertical-construcao.jpg";
import verticalLideranca from "@/assets/verticals/vertical-lideranca.jpg";
import verticalFormacao from "@/assets/verticals/vertical-formacao.jpg";
import verticalClinicas from "@/assets/verticals/vertical-clinicas.jpg";
import verticalSeguranca from "@/assets/verticals/vertical-seguranca.jpg";
import verticalEmpresas from "@/assets/verticals/vertical-empresas.jpg";
import verticalAgencias from "@/assets/verticals/vertical-agencias.jpg";

const verticals = [
  { src: verticalImobiliario, label: "Imobiliário", headline: "Venda mais imóveis", subtitle: "Pipeline visual, alertas de visitas e follow-up automático para fechar negócios mais rápido.", cta: "Experimentar para Imobiliário" },
  { src: verticalConstrucao, label: "Construção", headline: "Obras sob controlo", subtitle: "Gestão de orçamentos, acompanhamento de clientes e propostas enviadas num só lugar.", cta: "Experimentar para Construção" },
  { src: verticalLideranca, label: "Liderança", headline: "Lidere com dados", subtitle: "Dashboards executivos, KPIs de equipa e previsões de receita em tempo real.", cta: "Experimentar para Líderes" },
  { src: verticalFormacao, label: "Formação", headline: "Mais inscrições, menos esforço", subtitle: "Capture leads de cursos, automatize comunicações e acompanhe conversões.", cta: "Experimentar para Formação" },
  { src: verticalClinicas, label: "Clínicas", headline: "Pacientes fidelizados", subtitle: "Agendamento inteligente, lembretes automáticos e histórico completo de cada paciente.", cta: "Experimentar para Clínicas" },
  { src: verticalSeguranca, label: "Segurança", headline: "Contratos sempre em dia", subtitle: "Gestão de contratos recorrentes, alertas de renovação e propostas profissionais.", cta: "Experimentar para Segurança" },
  { src: verticalEmpresas, label: "Empresas", headline: "Escale a sua operação", subtitle: "CRM completo para equipas comerciais com automação, relatórios e integrações.", cta: "Experimentar para Empresas" },
  { src: verticalAgencias, label: "Agências", headline: "Clientes & projetos alinhados", subtitle: "Pipeline multi-cliente, propostas rápidas e visibilidade total sobre cada conta.", cta: "Experimentar para Agências" },
];

const INTERVAL = 4000;

export function LandingHeroSection() {
  const { t } = useTranslation("landing");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const navigate = useNavigate();
  const { scrollY } = useScroll();
  const textY = useTransform(scrollY, [0, 600], [0, -80]);
  const opacity = useTransform(scrollY, [0, 500], [1, 0]);

  // Auto-advance slides
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % verticals.length);
    }, INTERVAL);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      navigate(`/auth?name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}`);
    },
    [name, email, navigate]
  );

  return (
    <section className="relative h-[100vh] min-h-[700px] flex flex-col justify-center overflow-hidden">
      {/* Fullscreen crossfading background images */}
      <AnimatePresence mode="popLayout">
        <motion.img
          key={activeIndex}
          src={verticals[activeIndex].src}
          alt={`Ambiente profissional — ${verticals[activeIndex].label}`}
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ opacity: { duration: 1.2 }, scale: { duration: 6, ease: "linear" } }}
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
          decoding="async"
        />
      </AnimatePresence>

      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-[hsl(222,47%,4%)]/55 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-[hsl(222,47%,4%)] via-transparent to-[hsl(222,47%,4%)]/40 pointer-events-none" />

      {/* Subtle glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-primary/6 blur-[160px]" />
      </div>

      {/* Text content */}
      <motion.div className="relative z-10 max-w-5xl mx-auto px-6 pt-28 pb-10 text-center" style={{ y: textY, opacity }}>
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.25, 0.4, 0.25, 1] }}
          className="space-y-8"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6 }}
              className="space-y-4"
            >
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 backdrop-blur-sm text-sm font-semibold text-primary tracking-wide uppercase">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                CRM para {verticals[activeIndex].label}
              </div>

              <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black uppercase leading-[0.95] tracking-tight drop-shadow-lg">
                <span className="block bg-gradient-to-r from-primary to-[hsl(250,83%,60%)] bg-clip-text text-transparent">
                  {verticals[activeIndex].headline}
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-[hsl(210,40%,90%)] max-w-2xl mx-auto leading-relaxed drop-shadow-md">
                {verticals[activeIndex].subtitle}
              </p>
            </motion.div>
          </AnimatePresence>

          <motion.form
            id="hero-form"
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 1.1 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-lg mx-auto"
          >
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("hero.namePlaceholder")}
              className="w-full sm:flex-1 h-14 px-5 rounded-xl border border-white/15 bg-[hsl(222,47%,4%)]/70 backdrop-blur-md text-[hsl(210,40%,98%)] placeholder:text-[hsl(215,20%,55%)] text-base focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
            />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("hero.emailPlaceholder")}
              className="w-full sm:flex-1 h-14 px-5 rounded-xl border border-white/15 bg-[hsl(222,47%,4%)]/70 backdrop-blur-md text-[hsl(210,40%,98%)] placeholder:text-[hsl(215,20%,55%)] text-base focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
            />
            <Button
              type="submit"
              size="lg"
              className="w-full sm:w-auto gradient-primary shadow-glow text-primary-foreground px-10 h-14 text-base font-bold uppercase tracking-wide gap-2"
            >
              {t("hero.startFree")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.form>

          <motion.p
            className="text-xs text-[hsl(210,40%,75%)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 1.3 }}
          >
            {t("hero.freeNote")}
          </motion.p>
        </motion.div>
      </motion.div>

      {/* Active vertical label + progress dots */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.8 }}
        className="absolute bottom-8 left-0 right-0 z-10 flex flex-col items-center gap-3"
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={activeIndex}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-sm font-semibold text-white"
          >
            <span className="w-2 h-2 rounded-full bg-primary" />
            {verticals[activeIndex].label}
          </motion.span>
        </AnimatePresence>

        <div className="flex gap-1.5">
          {verticals.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              aria-label={`Ver ${verticals[i].label}`}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i === activeIndex
                  ? "w-6 bg-primary"
                  : "w-1.5 bg-white/30 hover:bg-white/50"
              }`}
            />
          ))}
        </div>
      </motion.div>
    </section>
  );
}
