import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

import verticalImobiliario from "@/assets/verticals/vertical-imobiliario.jpg";
import verticalConstrucao from "@/assets/verticals/vertical-construcao.jpg";
import verticalLideranca from "@/assets/verticals/vertical-lideranca.jpg";
import verticalFormacao from "@/assets/verticals/vertical-formacao.jpg";
import verticalClinicas from "@/assets/verticals/vertical-clinicas.jpg";
import verticalSeguranca from "@/assets/verticals/vertical-seguranca.jpg";
import verticalEmpresas from "@/assets/verticals/vertical-empresas.jpg";
import verticalAgencias from "@/assets/verticals/vertical-agencias.jpg";

const verticals = [
  { src: verticalImobiliario, label: "Imobiliário", alt: "Ambiente profissional imobiliário" },
  { src: verticalConstrucao, label: "Construção", alt: "Ambiente profissional de construção" },
  { src: verticalLideranca, label: "Liderança", alt: "Reunião executiva de liderança" },
  { src: verticalFormacao, label: "Formação", alt: "Sala de formação profissional" },
  { src: verticalClinicas, label: "Clínicas", alt: "Recepção de clínica moderna" },
  { src: verticalSeguranca, label: "Segurança", alt: "Centro de operações de segurança" },
  { src: verticalEmpresas, label: "Empresas", alt: "Equipa empresarial em escritório moderno" },
  { src: verticalAgencias, label: "Agências", alt: "Agência de marketing digital" },
];

// Duplicate for seamless infinite scroll
const items = [...verticals, ...verticals];

export function LandingVerticalsCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const offsetRef = useRef(0);
  const isPausedRef = useRef(false);

  useEffect(() => {
    const speed = 0.5; // px per frame
    const track = trackRef.current;
    if (!track) return;

    const animate = () => {
      if (!isPausedRef.current) {
        offsetRef.current += speed;
        // Reset when first set scrolls out
        const halfWidth = track.scrollWidth / 2;
        if (offsetRef.current >= halfWidth) {
          offsetRef.current = 0;
        }
        track.style.transform = `translateX(-${offsetRef.current}px)`;
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <section className="relative py-16 sm:py-20 overflow-hidden">
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-32 bg-gradient-to-r from-[hsl(222,47%,4%)] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-32 bg-gradient-to-l from-[hsl(222,47%,4%)] to-transparent z-10 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7 }}
        className="text-center mb-10 px-6"
      >
        <p className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-primary mb-3">
          Um CRM para cada setor
        </p>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">
          Feito para o <span className="text-primary">seu</span> negócio
        </h2>
      </motion.div>

      <div
        className="flex gap-4 sm:gap-6 will-change-transform"
        ref={trackRef}
        onMouseEnter={() => { isPausedRef.current = true; }}
        onMouseLeave={() => { isPausedRef.current = false; }}
      >
        {items.map((v, i) => (
          <div
            key={`${v.label}-${i}`}
            className="relative flex-shrink-0 w-[280px] sm:w-[340px] md:w-[400px] rounded-xl overflow-hidden group cursor-pointer"
          >
            <img
              src={v.src}
              alt={v.alt}
              width={1280}
              height={720}
              loading="lazy"
              decoding="async"
              className="w-full aspect-video object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            {/* Label */}
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/20 backdrop-blur-sm border border-primary/30 text-xs sm:text-sm font-semibold text-primary">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                {v.label}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
