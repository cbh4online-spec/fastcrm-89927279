import { motion } from "framer-motion";
import { Layers, Brain, Workflow, Puzzle } from "lucide-react";

const pillars = [
  {
    icon: Layers,
    name: "Flexible Object-Based CRM",
    desc: "Contacts, Companies, Deals as flexible objects. Custom fields, views, and pipelines that adapt to how you sell.",
    features: ["Custom objects & fields", "Saved views & filters", "Multiple pipelines", "Activity timeline"],
  },
  {
    icon: Brain,
    name: "Revenue Intelligence Built In",
    desc: "Health scores, stage benchmarks, and deal insights powered by AI — not just dashboards.",
    features: ["Deal health scoring", "Stage benchmarks", "Win/loss analysis", "Revenue forecasting"],
  },
  {
    icon: Workflow,
    name: "Automations That Scale",
    desc: "From simple follow-ups to complex workflows. Templates, triggers, and smart suggestions.",
    features: ["Trigger → Condition → Action", "Pre-built templates", "Smart suggestions", "Audit logging"],
  },
  {
    icon: Puzzle,
    name: "Extend with Marketplace",
    desc: "Official extensions and bundles. Proposals, invoicing, B2B portal — activate what you need.",
    features: ["Official extension packs", "One-click activation", "Curated bundles", "14-day free trials"],
  },
];

export function LandingSolutionSection() {
  return (
    <section id="features" className="relative py-28 lg:py-36">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/5 blur-[150px]" />
      </div>

      <div className="relative max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-5">
            Everything you need to{" "}
            <span className="bg-gradient-to-r from-primary to-[hsl(250,83%,60%)] bg-clip-text text-transparent">
              close more deals.
            </span>
          </h2>
          <p className="text-lg text-[hsl(215,20%,65%)] max-w-2xl mx-auto">
            Four pillars. One platform. Built for revenue teams that want structure without complexity.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {pillars.map((pillar, i) => (
            <motion.div
              key={pillar.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group relative p-6 rounded-2xl border border-[hsl(217,33%,17%)] bg-[hsl(222,47%,6%)] hover:border-primary/40 hover:bg-[hsl(222,47%,8%)] transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <pillar.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-bold text-lg mb-2">{pillar.name}</h3>
              <p className="text-sm text-[hsl(215,20%,65%)] leading-relaxed mb-4">{pillar.desc}</p>
              <ul className="grid grid-cols-2 gap-2">
                {pillar.features.map((feat) => (
                  <li key={feat} className="flex items-center gap-2 text-xs text-[hsl(215,20%,65%)]">
                    <div className="w-1 h-1 rounded-full bg-primary shrink-0" />
                    {feat}
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
