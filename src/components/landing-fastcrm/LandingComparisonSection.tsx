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

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.15, delayChildren: 0.2 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 60, scale: 0.9 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.7, ease: [0.25, 0.4, 0.25, 1] as [number, number, number, number] },
  },
};

export function LandingComparisonSection() {
  return (
    <section id="intelligence" className="relative py-28 lg:py-36 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[hsl(222,47%,6%)] to-transparent pointer-events-none" />

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
            initial={{ opacity: 0, y: -10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Intelligence
          </motion.span>
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

        <motion.div
          className="grid md:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {comparisons.map((item, i) => (
            <motion.div
              key={item.title}
              variants={cardVariants}
              whileHover={{ y: -8, scale: 1.03 }}
              className="rounded-2xl border border-[hsl(217,33%,17%)] bg-[hsl(222,47%,6%)] p-7 flex flex-col hover:border-primary/30 transition-colors duration-300"
            >
              <motion.div
                className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6"
                whileHover={{ scale: 1.15, rotate: 5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <item.icon className="h-6 w-6 text-primary" />
              </motion.div>
              <h3 className="text-sm font-black uppercase tracking-wide mb-4">{item.title}</h3>
              <p className="text-sm text-[hsl(215,20%,65%)] leading-relaxed mb-5 line-through decoration-[hsl(0,84%,60%)]/40">
                {item.pain}
              </p>
              <motion.p
                className="text-sm font-semibold text-[hsl(210,40%,98%)] leading-relaxed mt-auto"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 + i * 0.15, duration: 0.6 }}
              >
                {item.solution}
              </motion.p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
