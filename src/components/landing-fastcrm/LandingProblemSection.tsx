import { motion } from "framer-motion";
import { TrendingDown, Clock, Eye, DollarSign } from "lucide-react";

const problems = [
  { icon: TrendingDown, text: "Deals slipping through cracks without alerts", color: "hsl(0, 84%, 60%)" },
  { icon: Clock, text: "Hours lost on manual follow-ups and data entry", color: "hsl(38, 92%, 50%)" },
  { icon: Eye, text: "No visibility into what's actually working", color: "hsl(250, 83%, 60%)" },
  { icon: DollarSign, text: "Revenue forecasts based on gut feeling, not data", color: "hsl(340, 82%, 52%)" },
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
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-6">
            Your CRM shouldn't be a{" "}
            <span className="text-destructive">spreadsheet upgrade.</span>
          </h2>
          <p className="text-lg text-[hsl(215,20%,65%)] max-w-2xl mx-auto mb-16">
            Most CRMs store contacts. Few actually help you close deals, forecast revenue, and scale your team.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-4">
          {problems.map((item, i) => (
            <motion.div
              key={item.text}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="flex items-center gap-4 p-5 rounded-xl border border-[hsl(217,33%,17%)] bg-[hsl(222,47%,6%)] text-left"
            >
              <div className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${item.color}15` }}>
                <item.icon className="h-5 w-5" style={{ color: item.color }} />
              </div>
              <span className="text-sm font-medium">{item.text}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
