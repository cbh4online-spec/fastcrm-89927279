import { motion } from "framer-motion";
import { useSystemAudit } from "@/hooks/useSystemAudit";
import { EDGE_FUNCTION_CATEGORIES } from "@/types/audit";
import { Database, Zap, Shield, Package, Code, Layers } from "lucide-react";

export function LandingMetricsSection() {
  const { metrics, modules } = useSystemAudit();

  const edgeFunctionCount = Object.values(EDGE_FUNCTION_CATEGORIES).reduce(
    (sum, fns) => sum + fns.length,
    0
  );

  const stats = [
    {
      icon: Package,
      value: modules.length > 0 ? modules.length.toString() : "37",
      label: "Módulos implementados",
    },
    {
      icon: Database,
      value: metrics?.tables?.toString() || "404",
      label: "Tabelas PostgreSQL",
    },
    {
      icon: Zap,
      value: edgeFunctionCount.toString(),
      label: "Edge Functions",
    },
    {
      icon: Shield,
      value: metrics?.rlsPolicies?.toString() || "1177",
      label: "Políticas RLS",
    },
    {
      icon: Code,
      value: metrics?.components?.toString() || "580",
      label: "Componentes React",
    },
    {
      icon: Layers,
      value: metrics?.hooks?.toString() || "185",
      label: "Custom Hooks",
    },
  ];

  return (
    <section id="metricas" className="relative py-28 lg:py-36">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-sm text-primary mb-6">
            Prova de Robustez
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-5">
            Números que falam por si.
          </h2>
          <p className="text-[hsl(215,20%,65%)] max-w-xl mx-auto">
            React 18 + Supabase + OpenAI + Stripe. Infraestrutura enterprise-grade, auditada e documentada.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="rounded-2xl border border-[hsl(217,33%,17%)] bg-[hsl(222,47%,6%)] p-6 lg:p-8"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <stat.icon className="h-6 w-6 text-primary" />
              </div>
              <div className="text-3xl lg:text-4xl font-bold mb-1 bg-gradient-to-r from-primary to-[hsl(250,83%,60%)] bg-clip-text text-transparent">
                {stat.value}
              </div>
              <div className="text-sm text-[hsl(215,20%,65%)]">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
