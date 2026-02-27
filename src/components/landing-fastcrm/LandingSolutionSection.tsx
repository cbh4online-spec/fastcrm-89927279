import { motion, useScroll, useTransform } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Layers, Brain, Workflow, Puzzle } from "lucide-react";
import { useRef } from "react";

const pillarIcons = [Layers, Brain, Workflow, Puzzle];
const pillarAnchors = ["#features", "#intelligence", "#features", "#pricing"];

const cardVariants = {
  hidden: (i: number) => ({
    opacity: 0,
    y: 50,
    scale: 0.95,
    rotateX: 5,
  }),
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    rotateX: 0,
    transition: {
      duration: 0.7,
      delay: i * 0.15,
      ease: [0.25, 0.4, 0.25, 1] as [number, number, number, number],
    },
  }),
};

export function LandingSolutionSection() {
  const { t } = useTranslation("landing");
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });
  const glowScale = useTransform(scrollYProgress, [0, 0.5, 1], [0.8, 1.2, 0.8]);

  const pillars = [1, 2, 3, 4].map((n, i) => ({
    icon: pillarIcons[i],
    headline: t(`solution.pillar${n}Headline`),
    name: t(`solution.pillar${n}Name`),
    desc: t(`solution.pillar${n}Desc`),
    features: [t(`solution.pillar${n}F1`), t(`solution.pillar${n}F2`), t(`solution.pillar${n}F3`)],
    anchor: pillarAnchors[i],
  }));

  return (
    <section id="features" ref={sectionRef} className="relative py-28 lg:py-36 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/5 blur-[150px]"
          style={{ scale: glowScale }}
        />
      </div>

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
            initial={{ opacity: 0, letterSpacing: "0.5em" }}
            whileInView={{ opacity: 1, letterSpacing: "0.2em" }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            {t("solution.badge")}
          </motion.span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight mb-5">
            {t("solution.title")}{" "}
            <span className="bg-gradient-to-r from-primary to-[hsl(250,83%,60%)] bg-clip-text text-transparent">
              {t("solution.titleHighlight")}
            </span>
          </h2>
          <p className="text-lg text-[hsl(215,20%,65%)] max-w-2xl mx-auto">
            {t("solution.subtitle")}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6" style={{ perspective: "1000px" }}>
          {pillars.map((pillar, i) => (
            <motion.div
              key={i}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-30px" }}
              whileHover={{ y: -6, scale: 1.02 }}
              transition={{ duration: 0.3 }}
              className="group relative p-7 rounded-2xl border border-[hsl(217,33%,17%)] bg-[hsl(222,47%,6%)] hover:border-primary/40 hover:bg-[hsl(222,47%,8%)] transition-colors duration-300"
            >
              <motion.div
                className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors"
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
              >
                <pillar.icon className="h-7 w-7 text-primary" />
              </motion.div>
              <p className="text-xs font-bold text-primary tracking-[0.15em] uppercase mb-2">{pillar.headline}</p>
              <h3 className="font-black text-xl uppercase tracking-tight mb-3">{pillar.name}</h3>
              <p className="text-sm text-[hsl(215,20%,65%)] leading-relaxed mb-5">{pillar.desc}</p>
              <ul className="space-y-2.5 mb-5">
                {pillar.features.map((feat, fi) => (
                  <motion.li
                    key={fi}
                    className="flex items-start gap-2.5 text-sm text-[hsl(215,20%,65%)]"
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.15 + fi * 0.08, duration: 0.4 }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                    {feat}
                  </motion.li>
                ))}
              </ul>
              <a href={pillar.anchor} className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-primary hover:text-primary/80 transition-colors">
                {t("solution.learnMore")}
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
