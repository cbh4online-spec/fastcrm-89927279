import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import pricingBg from "@/assets/pricing-bg.jpg";

import verticalImobiliario from "@/assets/verticals/vertical-imobiliario.jpg";
import verticalConstrucao from "@/assets/verticals/vertical-construcao.jpg";
import verticalLideranca from "@/assets/verticals/vertical-lideranca.jpg";
import verticalFormacao from "@/assets/verticals/vertical-formacao.jpg";
import verticalClinicas from "@/assets/verticals/vertical-clinicas.jpg";
import verticalSeguranca from "@/assets/verticals/vertical-seguranca.jpg";
import verticalEmpresas from "@/assets/verticals/vertical-empresas.jpg";
import verticalAgencias from "@/assets/verticals/vertical-agencias.jpg";

const verticals = [
  { src: verticalImobiliario, label: "Imobiliário" },
  { src: verticalConstrucao, label: "Construção" },
  { src: verticalLideranca, label: "Liderança" },
  { src: verticalFormacao, label: "Formação" },
  { src: verticalClinicas, label: "Clínicas" },
  { src: verticalSeguranca, label: "Segurança" },
  { src: verticalEmpresas, label: "Empresas" },
  { src: verticalAgencias, label: "Agências" },
];

const carouselItems = [...verticals, ...verticals];

function InfiniteCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const offsetRef = useRef(0);
  const isPausedRef = useRef(false);

  useEffect(() => {
    const speed = 0.4;
    const track = trackRef.current;
    if (!track) return;

    const animate = () => {
      if (!isPausedRef.current) {
        offsetRef.current += speed;
        const halfWidth = track.scrollWidth / 2;
        if (offsetRef.current >= halfWidth) offsetRef.current = 0;
        track.style.transform = `translateX(-${offsetRef.current}px)`;
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, []);

  return (
    <div className="relative w-full overflow-hidden">
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-12 sm:w-24 bg-gradient-to-r from-[hsl(222,47%,4%)] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-12 sm:w-24 bg-gradient-to-l from-[hsl(222,47%,4%)] to-transparent z-10 pointer-events-none" />

      <div
        className="flex gap-3 sm:gap-4 will-change-transform"
        ref={trackRef}
        onMouseEnter={() => { isPausedRef.current = true; }}
        onMouseLeave={() => { isPausedRef.current = false; }}
      >
        {carouselItems.map((v, i) => (
          <div
            key={`${v.label}-${i}`}
            className="relative flex-shrink-0 w-[220px] sm:w-[280px] md:w-[340px] rounded-xl overflow-hidden group"
          >
            <img
              src={v.src}
              alt={`Ambiente profissional — ${v.label}`}
              width={1280}
              height={720}
              loading="lazy"
              decoding="async"
              className="w-full aspect-video object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/20 backdrop-blur-sm border border-primary/30 text-[11px] sm:text-xs font-semibold text-primary">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                {v.label}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LandingHeroSection() {
  const { t } = useTranslation("landing");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const navigate = useNavigate();
  const { scrollY } = useScroll();
  const bgY = useTransform(scrollY, [0, 800], [0, 250]);
  const textY = useTransform(scrollY, [0, 600], [0, -80]);
  const opacity = useTransform(scrollY, [0, 500], [1, 0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/auth?name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}`);
  };

  return (
    <section className="relative min-h-[100vh] flex flex-col justify-center overflow-hidden">
      <motion.div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `url(${pricingBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          y: bgY,
          scale: 1.1,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[hsl(222,47%,4%)]/70 via-[hsl(222,47%,4%)]/50 to-[hsl(222,47%,4%)] pointer-events-none" />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full bg-primary/8 blur-[180px]"
          style={{ y: useTransform(scrollY, [0, 600], [0, 120]) }}
        />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      </div>

      {/* Text content */}
      <motion.div className="relative max-w-5xl mx-auto px-6 pt-28 pb-10 text-center" style={{ y: textY, opacity }}>
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.25, 0.4, 0.25, 1] }}
          className="space-y-8"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 text-sm font-semibold text-primary tracking-wide uppercase"
          >
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            {t("hero.badge")}
          </motion.div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black uppercase leading-[0.95] tracking-tight">
            <motion.span
              className="block"
              initial={{ opacity: 0, x: -60 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
            >
              {t("hero.title1")}
            </motion.span>
            <motion.span
              className="block bg-gradient-to-r from-primary to-[hsl(250,83%,60%)] bg-clip-text text-transparent"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.9, delay: 0.5, ease: [0.25, 0.4, 0.25, 1] }}
            >
              {t("hero.title2")}
            </motion.span>
            <motion.span
              className="block"
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.7, ease: [0.25, 0.4, 0.25, 1] }}
            >
              {t("hero.title3")}
            </motion.span>
          </h1>

          <motion.p
            className="text-lg sm:text-xl text-[hsl(215,20%,65%)] max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.9 }}
          >
            {t("hero.subtitle")}
          </motion.p>

          <motion.form
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
              className="w-full sm:flex-1 h-14 px-5 rounded-xl border border-[hsl(217,33%,17%)] bg-[hsl(222,47%,6%)] text-[hsl(210,40%,98%)] placeholder:text-[hsl(215,20%,45%)] text-base focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
            />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("hero.emailPlaceholder")}
              className="w-full sm:flex-1 h-14 px-5 rounded-xl border border-[hsl(217,33%,17%)] bg-[hsl(222,47%,6%)] text-[hsl(210,40%,98%)] placeholder:text-[hsl(215,20%,45%)] text-base focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
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
            className="text-xs text-[hsl(215,20%,45%)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 1.3 }}
          >
            {t("hero.freeNote")}
          </motion.p>
        </motion.div>
      </motion.div>

      {/* Verticals Carousel — inside hero */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 1.4, ease: [0.25, 0.4, 0.25, 1] }}
        className="relative pb-12"
      >
        <InfiniteCarousel />
      </motion.div>
    </section>
  );
}