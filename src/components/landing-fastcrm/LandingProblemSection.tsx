import { motion, useScroll, useTransform } from "framer-motion";
import { TrendingDown, Clock, Eye, DollarSign } from "lucide-react";
import { useRef } from "react";

const problems = [
  { icon: DollarSign, text: "\"I don't know which deals will actually close.\"", color: "hsl(0, 84%, 60%)" },
  { icon: TrendingDown, text: "\"My forecast is a guess — not a strategy.\"", color: "hsl(38, 92%, 50%)" },
  { icon: Clock, text: "\"I spend more time updating my CRM than selling.\"", color: "hsl(250, 83%, 60%)" },
  { icon: Eye, text: "\"I need proposals and invoicing but don't want another tool.\"", color: "hsl(340, 82%, 52%)" },
];

export function LandingProblemSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["-5%", "5%"]);

  return (
    <section id="problema" ref={sectionRef} className="relative py-28 lg:py-36 overflow-hidden">
      <motion.div
        className="absolute inset-0 bg-gradient-to-b from-transparent via-[hsl(222,47%,6%)] to-transparent pointer-events-none"
        style={{ y: bgY }}
      />

      <div className="relative max-w-5xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.25, 0.4, 0.25, 1] }}
        >
          <motion.span
            className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-4 block"
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            The Problem
          </motion.span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight mb-6">
            Sound Familiar?
          </h2>
          <p className="text-lg text-[hsl(215,20%,65%)] max-w-2xl mx-auto mb-16">
            Most CRMs store contacts. FastCRM tells you what to do with them.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-5">
          {problems.map((item, i) => (
            <motion.div
              key={item.text}
              initial={{ opacity: 0, x: i % 2 === 0 ? -40 : 40, y: 20 }}
              whileInView={{ opacity: 1, x: 0, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: i * 0.12, ease: [0.25, 0.4, 0.25, 1] }}
              whileHover={{ scale: 1.03, y: -4 }}
              className="flex items-center gap-5 p-6 rounded-2xl border border-[hsl(217,33%,17%)] bg-[hsl(222,47%,6%)] text-left hover:border-[hsl(217,33%,25%)] hover:bg-[hsl(222,47%,8%)] transition-colors duration-300"
              style={{ borderLeftWidth: 3, borderLeftColor: item.color }}
            >
              <motion.div
                className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${item.color}15` }}
                whileHover={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.4 }}
              >
                <item.icon className="h-6 w-6" style={{ color: item.color }} />
              </motion.div>
              <span className="text-base font-semibold">{item.text}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
