import { motion } from "framer-motion";
import { User, Users, Building2 } from "lucide-react";

const personas = [
  {
    icon: User,
    title: "SaaS Founder",
    subtitle: "Building your first structured sales process",
    benefits: [
      "Set up your pipeline in minutes — not days",
      "Health scores on every deal from day one",
      "Automated follow-ups so nothing slips",
      "Start free. Upgrade when revenue grows.",
    ],
    color: "hsl(142, 76%, 36%)",
  },
  {
    icon: Users,
    title: "Small Sales Team",
    subtitle: "5-15 people, ready for real pipeline visibility",
    benefits: [
      "Multi-pipeline for different products or segments",
      "Stage benchmarks that flag stalled deals",
      "Shared inbox with unified customer timeline",
      "Proposals & invoicing without switching tools",
    ],
    color: "hsl(221, 83%, 53%)",
  },
  {
    icon: Building2,
    title: "Growing SaaS",
    subtitle: "Revenue operations that need intelligence at scale",
    benefits: [
      "Forecasting powered by your actual data",
      "Custom automations with full audit trail",
      "API access for your tech stack integrations",
      "Advanced roles and workspace controls",
    ],
    color: "hsl(250, 83%, 60%)",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.18, delayChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 50, rotateY: -8 },
  visible: {
    opacity: 1,
    y: 0,
    rotateY: 0,
    transition: { duration: 0.7, ease: [0.25, 0.4, 0.25, 1] as [number, number, number, number] },
  },
};

export function LandingArchitectureSection() {
  return (
    <section id="for-teams" className="relative py-28 lg:py-36 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[hsl(222,47%,6%)] via-transparent to-[hsl(222,47%,6%)] pointer-events-none" />

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
            Built For
          </motion.span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight mb-5">
            Built for{" "}
            <span className="bg-gradient-to-r from-primary to-[hsl(250,83%,60%)] bg-clip-text text-transparent">
              SaaS teams that sell.
            </span>
          </h2>
          <p className="text-lg text-[hsl(215,20%,65%)] max-w-2xl mx-auto">
            From first deal to revenue operations. FastCRM adapts to your stage.
          </p>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-3 gap-6"
          style={{ perspective: "1200px" }}
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {personas.map((persona, i) => (
            <motion.div
              key={persona.title}
              variants={cardVariants}
              whileHover={{ y: -8, scale: 1.02 }}
              className="rounded-2xl border border-[hsl(217,33%,17%)] bg-[hsl(222,47%,6%)] p-6 hover:border-primary/40 hover:bg-[hsl(222,47%,8%)] transition-colors duration-300"
            >
              <motion.div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{ backgroundColor: `${persona.color}15`, color: persona.color }}
                whileHover={{ scale: 1.2, rotate: 10 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <persona.icon className="h-6 w-6" />
              </motion.div>
              <h3 className="text-lg font-bold mb-1">{persona.title}</h3>
              <p className="text-sm text-[hsl(215,20%,65%)] mb-5">{persona.subtitle}</p>
              <ul className="space-y-2.5">
                {persona.benefits.map((b, bi) => (
                  <motion.li
                    key={b}
                    className="flex items-start gap-2.5 text-sm text-[hsl(215,20%,65%)]"
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.18 + bi * 0.06, duration: 0.4 }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: persona.color }} />
                    {b}
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
