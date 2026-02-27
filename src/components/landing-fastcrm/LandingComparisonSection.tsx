import { motion } from "framer-motion";
import { Table2, Box, Building } from "lucide-react";

const comparisons = [
  {
    icon: Table2,
    title: "VS SPREADSHEETS",
    pain: "No health scores. No automation. No intelligence.",
    solution: "FastCRM gives every deal a score and every stage a benchmark.",
  },
  {
    icon: Box,
    title: "VS TRADITIONAL CRMS",
    pain: "They store contacts. They don't tell you what to do.",
    solution: "FastCRM surfaces insights — not just dashboards.",
  },
  {
    icon: Building,
    title: "VS ENTERPRISE PLATFORMS",
    pain: "6-month onboarding. Modules you'll never use. Bloat.",
    solution: "FastCRM: set up in minutes, extend only what you need.",
  },
];

export function LandingComparisonSection() {
  return (
    <section id="intelligence" className="relative py-28 lg:py-36">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[hsl(222,47%,6%)] to-transparent pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-4 block">Intelligence</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight mb-5">
            Why{" "}
            <span className="bg-gradient-to-r from-primary to-[hsl(250,83%,60%)] bg-clip-text text-transparent">
              FastCRM?
            </span>
          </h2>
          <p className="text-lg text-[hsl(215,20%,65%)] max-w-2xl mx-auto">
            Revenue intelligence, not revenue guessing.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {comparisons.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="rounded-2xl border border-[hsl(217,33%,17%)] bg-[hsl(222,47%,6%)] p-7 flex flex-col hover:border-primary/30 transition-colors"
            >
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                <item.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-wide mb-4">{item.title}</h3>
              <p className="text-sm text-[hsl(215,20%,65%)] leading-relaxed mb-5 line-through decoration-[hsl(0,84%,60%)]/40">
                {item.pain}
              </p>
              <p className="text-sm font-semibold text-[hsl(210,40%,98%)] leading-relaxed mt-auto">
                {item.solution}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
