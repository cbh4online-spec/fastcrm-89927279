import { motion } from "framer-motion";
import { Shield, Brain, Users, Zap, Lock, CreditCard } from "lucide-react";

const metrics = [
  { icon: Users, label: "Multi-Tenant", desc: "Arquitectura multi-workspace robusta" },
  { icon: Brain, label: "IA Integrada", desc: "Assistentes, RAG e coaching com IA" },
  { icon: Shield, label: "Segurança RLS", desc: "Row Level Security em todas as tabelas" },
  { icon: CreditCard, label: "Stripe Integrado", desc: "Pagamentos e subscrições nativas" },
  { icon: Zap, label: "Automações", desc: "Trigger → Condition → Action engine" },
  { icon: Lock, label: "RGPD Compliant", desc: "Conformidade total com regulamentação" },
];

export function VerticalAuthority() {
  return (
    <section className="relative py-24 lg:py-32">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Construído com{" "}
            <span className="bg-gradient-to-r from-primary to-[hsl(250,83%,60%)] bg-clip-text text-transparent">
              tecnologia enterprise
            </span>
          </h2>
          <p className="text-lg text-[hsl(215,20%,65%)] max-w-2xl mx-auto">
            Não é um CRM genérico. É uma infraestrutura digital completa.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {metrics.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="flex items-start gap-4 p-5 rounded-xl border border-[hsl(217,33%,17%)] bg-[hsl(222,47%,6%)]"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <m.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm mb-1">{m.label}</h3>
                <p className="text-xs text-[hsl(215,20%,65%)]">{m.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
