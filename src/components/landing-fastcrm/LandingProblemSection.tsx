import { motion } from "framer-motion";
import { TrendingDown, Clock, Eye, DollarSign } from "lucide-react";

const problems = [
  { icon: DollarSign, text: "\"I don't know which deals will actually close.\"", color: "hsl(0, 84%, 60%)" },
  { icon: TrendingDown, text: "\"My forecast is a guess — not a strategy.\"", color: "hsl(38, 92%, 50%)" },
  { icon: Clock, text: "\"I spend more time updating my CRM than selling.\"", color: "hsl(250, 83%, 60%)" },
  { icon: Eye, text: "\"I need proposals and invoicing but don't want another tool.\"", color: "hsl(340, 82%, 52%)" },
];

export function LandingProblemSection() {
  return (
    <section id="problema" className="relative py-28 lg:py-36">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[hsl(222,47%,6%)] to-transparent pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-4 block">The Problem</span>
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
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="flex items-center gap-5 p-6 rounded-2xl border border-[hsl(217,33%,17%)] bg-[hsl(222,47%,6%)] text-left hover:border-[hsl(217,33%,25%)] transition-colors"
              style={{ borderLeftWidth: 3, borderLeftColor: item.color }}
            >
              <div className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${item.color}15` }}>
                <item.icon className="h-6 w-6" style={{ color: item.color }} />
              </div>
              <span className="text-base font-semibold">{item.text}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
