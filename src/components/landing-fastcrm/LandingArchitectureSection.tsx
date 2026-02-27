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

export function LandingArchitectureSection() {
  return (
    <section id="for-teams" className="relative py-28 lg:py-36">
      <div className="absolute inset-0 bg-gradient-to-b from-[hsl(222,47%,6%)] via-transparent to-[hsl(222,47%,6%)] pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-4 block">Built For</span>
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

        <div className="grid md:grid-cols-3 gap-6">
          {personas.map((persona, i) => (
            <motion.div
              key={persona.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="rounded-2xl border border-[hsl(217,33%,17%)] bg-[hsl(222,47%,6%)] p-6 hover:border-primary/40 hover:bg-[hsl(222,47%,8%)] transition-all duration-300"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{ backgroundColor: `${persona.color}15`, color: persona.color }}
              >
                <persona.icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold mb-1">{persona.title}</h3>
              <p className="text-sm text-[hsl(215,20%,65%)] mb-5">{persona.subtitle}</p>
              <ul className="space-y-2.5">
                {persona.benefits.map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-sm text-[hsl(215,20%,65%)]">
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: persona.color }} />
                    {b}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
