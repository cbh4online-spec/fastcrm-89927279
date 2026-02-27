import { motion, useScroll, useTransform } from "framer-motion";
import { Rocket, Users, TrendingUp } from "lucide-react";
import { useRef } from "react";

const segments = [
  { icon: Rocket, title: "SaaS Founders", desc: "Building their first structured sales motion with real intelligence." },
  { icon: Users, title: "Growing Sales Teams", desc: "Moving beyond spreadsheets to pipeline visibility and deal insights." },
  { icon: TrendingUp, title: "Revenue Leaders", desc: "Scaling revenue operations with forecasting, automations, and data." },
];

export function LandingPositioningSection() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const bgX = useTransform(scrollYProgress, [0, 1], ["-3%", "3%"]);

  return (
    <section ref={ref} className="relative py-28 lg:py-36 overflow-hidden">
      <motion.div
        className="absolute inset-0 bg-gradient-to-b from-transparent via-[hsl(222,47%,6%)] to-transparent pointer-events-none"
        style={{ x: bgX }}
      />

      <div className="relative max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.25, 0.4, 0.25, 1] }}
          className="text-center mb-14"
        >
          <motion.span
            className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-4 block"
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            Built For
          </motion.span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight mb-5">
            Not For Everyone.
          </h2>
          <p className="text-lg text-[hsl(215,20%,65%)] max-w-2xl mx-auto leading-relaxed">
            FastCRM is for SaaS teams that care about revenue clarity — not contact storage.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-3 gap-6">
          {segments.map((segment, i) => (
            <motion.div
              key={segment.title}
              initial={{ opacity: 0, y: 60, scale: 0.9 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.7, delay: i * 0.15, ease: [0.25, 0.4, 0.25, 1] }}
              whileHover={{ y: -8, scale: 1.04 }}
              className="rounded-2xl border border-[hsl(217,33%,17%)] bg-[hsl(222,47%,6%)] p-7 text-center hover:border-primary/30 transition-colors duration-300"
            >
              <motion.div
                className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-5"
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
              >
                <segment.icon className="h-7 w-7 text-primary" />
              </motion.div>
              <h3 className="font-black uppercase tracking-wide text-base mb-2">{segment.title}</h3>
              <p className="text-sm text-[hsl(215,20%,65%)] leading-relaxed">{segment.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
