import { motion } from "framer-motion";
import {
  Users, ShoppingCart, Workflow, CalendarDays, MessageSquare,
  UserCheck, Store, BarChart3, Package, Brain,
} from "lucide-react";

const modules = [
  { icon: Users, name: "CRM Core", desc: "Leads, contactos, empresas e pipeline" },
  { icon: ShoppingCart, name: "Vendas & Faturação", desc: "Propostas, faturas e catálogo" },
  { icon: Workflow, name: "Automações", desc: "Trigger → Condition → Action" },
  { icon: CalendarDays, name: "Calendário", desc: "Agendamento e disponibilidade" },
  { icon: MessageSquare, name: "Comunicação", desc: "Email, WhatsApp, inbox unificado" },
  { icon: UserCheck, name: "Portal Cliente", desc: "Self-service B2B para clientes" },
  { icon: Store, name: "Loja Online", desc: "Catálogo, checkout e gestão" },
  { icon: BarChart3, name: "Relatórios", desc: "KPIs e performance em tempo real" },
  { icon: Package, name: "Marketplace", desc: "Módulos adicionais plug-and-play" },
  { icon: Brain, name: "IA Integrada", desc: "Assistentes, OCR, RAG e coaching" },
];

export function LandingSolutionSection() {
  return (
    <section id="solucao" className="relative py-28 lg:py-36">
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
            O FastCRM unifica tudo numa{" "}
            <span className="bg-gradient-to-r from-primary to-[hsl(250,83%,60%)] bg-clip-text text-transparent">
              única arquitectura.
            </span>
          </h2>
          <p className="text-lg text-[hsl(215,20%,65%)] max-w-2xl mx-auto">
            10 módulos core, totalmente integrados, prontos para escalar a sua operação.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {modules.map((mod, i) => (
            <motion.div
              key={mod.name}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="group relative p-5 rounded-xl border border-[hsl(217,33%,17%)] bg-[hsl(222,47%,6%)] hover:border-primary/40 hover:bg-[hsl(222,47%,8%)] transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                <mod.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-sm mb-1">{mod.name}</h3>
              <p className="text-xs text-[hsl(215,20%,65%)] leading-relaxed">{mod.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
