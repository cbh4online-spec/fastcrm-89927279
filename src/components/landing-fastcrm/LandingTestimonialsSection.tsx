import { motion, useScroll, useTransform } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Star, Quote } from "lucide-react";
import { useRef } from "react";

const testimonialKeys = ["t1", "t2", "t3"];
const companyLogos = ["TechFlow", "ScaleUp.io", "DataBridge", "CloudBase", "NexGen", "Propelr"];

export function LandingTestimonialsSection() {
  const { t } = useTranslation("landing");
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["-5%", "5%"]);

  return (
    <section ref={ref} className="relative py-28 lg:py-36 overflow-hidden">
      <motion.div
        className="absolute inset-0 bg-gradient-to-b from-transparent via-[hsl(222,47%,6%)] to-transparent pointer-events-none"
        style={{ y: bgY }}
      />

      <div className="relative max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.25, 0.4, 0.25, 1] }}
          className="text-center mb-16"
        >
          <motion.span
            className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-4 block"
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            {t("testimonials.badge")}
          </motion.span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight mb-5">
            {t("testimonials.title")}
          </h2>
          <p className="text-lg text-[hsl(215,20%,65%)] max-w-2xl mx-auto leading-relaxed">
            {t("testimonials.subtitle")}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 mb-20">
          {testimonialKeys.map((key, i) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 60, scale: 0.9 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.7, delay: i * 0.15, ease: [0.25, 0.4, 0.25, 1] }}
              whileHover={{ y: -8, scale: 1.03 }}
              className="relative rounded-2xl border border-[hsl(217,33%,17%)] bg-[hsl(222,47%,6%)] p-7 hover:border-primary/30 transition-colors duration-300"
            >
              <Quote className="h-8 w-8 text-primary/20 mb-4" />

              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {Array.from({ length: 5 }).map((_, si) => (
                  <Star key={si} className="h-4 w-4 fill-primary text-primary" />
                ))}
              </div>

              <p className="text-sm text-[hsl(215,20%,65%)] leading-relaxed mb-6 italic">
                "{t(`testimonials.${key}Quote`)}"
              </p>

              <div className="flex items-center gap-3">
                {/* Avatar placeholder */}
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">
                    {t(`testimonials.${key}Name`).split(" ").map((n: string) => n[0]).join("")}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-bold">{t(`testimonials.${key}Name`)}</p>
                  <p className="text-xs text-[hsl(215,20%,65%)]">
                    {t(`testimonials.${key}Title`)}, {t(`testimonials.${key}Company`)}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Trusted By logos */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="text-center"
        >
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[hsl(215,20%,45%)] mb-8">
            {t("testimonials.trustedBy")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-12">
            {companyLogos.map((logo, i) => (
              <motion.span
                key={logo}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 + i * 0.08, duration: 0.5 }}
                className="text-lg font-black uppercase tracking-wider text-[hsl(215,20%,30%)] hover:text-primary/50 transition-colors duration-300 cursor-default"
              >
                {logo}
              </motion.span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
