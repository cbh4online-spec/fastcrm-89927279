import { motion } from "framer-motion";
import { Layers, Brain, Workflow, Puzzle } from "lucide-react";

const pillars = [
  {
    icon: Layers,
    headline: "Your data, your structure.",
    name: "Flexible Object-Based CRM",
    desc: "Contacts, Companies, Deals as flexible objects. Custom fields, views, and pipelines that adapt to how you sell.",
    features: ["Custom objects and fields that match your process", "Saved views and filters for every team member", "Multiple pipelines for different products or segments"],
    anchor: "#features",
  },
  {
    icon: Brain,
    headline: "Know what to do next.",
    name: "Revenue Intelligence Built In",
    desc: "Health scores, stage benchmarks, and deal insights — not just dashboards.",
    features: ["Deal health scoring on every opportunity", "Stage benchmarks that flag stalled deals", "Win/loss analysis powered by your own data"],
    anchor: "#intelligence",
  },
  {
    icon: Workflow,
    headline: "From follow-up to full workflow.",
    name: "Automations That Scale",
    desc: "Start with simple reminders. Scale to complex, multi-step automations as your team grows.",
    features: ["Trigger, condition, action — visual builder", "Pre-built templates for common workflows", "Smart suggestions based on deal patterns"],
    anchor: "#features",
  },
  {
    icon: Puzzle,
    headline: "Activate what you need.",
    name: "Extend with Marketplace",
    desc: "Official extensions for proposals, invoicing, and B2B revenue. One click to activate, zero friction.",
    features: ["Curated extension packs and bundles", "One-click activation with instant provisioning", "Extensions follow your CRM design — no \"bolted-on\" feel"],
    anchor: "#pricing",
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
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-4 block">Platform</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight mb-5">
            Everything You Need To{" "}
            <span className="bg-gradient-to-r from-primary to-[hsl(250,83%,60%)] bg-clip-text text-transparent">
              Close More Deals.
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
              className="group relative p-7 rounded-2xl border border-[hsl(217,33%,17%)] bg-[hsl(222,47%,6%)] hover:border-primary/40 hover:bg-[hsl(222,47%,8%)] transition-all duration-300"
            >
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                <pillar.icon className="h-7 w-7 text-primary" />
              </div>
              <p className="text-xs font-bold text-primary tracking-[0.15em] uppercase mb-2">{pillar.headline}</p>
              <h3 className="font-black text-xl uppercase tracking-tight mb-3">{pillar.name}</h3>
              <p className="text-sm text-[hsl(215,20%,65%)] leading-relaxed mb-5">{pillar.desc}</p>
              <ul className="space-y-2.5 mb-5">
                {pillar.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2.5 text-sm text-[hsl(215,20%,65%)]">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                    {feat}
                  </li>
                ))}
              </ul>
              <a href={pillar.anchor} className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-primary hover:text-primary/80 transition-colors">
                Learn more →
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
