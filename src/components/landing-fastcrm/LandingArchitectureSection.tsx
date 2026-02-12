import { motion } from "framer-motion";
import {
  Shield, Brain, Workflow, MessageSquare, CreditCard,
  Lock, Users, FileSearch, Sparkles, BookOpen, Zap, Globe,
} from "lucide-react";

const pillars = [
  {
    title: "Arquitectura Multi-Tenant Real",
    icon: Shield,
    features: [
      "Isolamento total por workspace",
      "RLS 100% em todas as tabelas",
      "Permissões granulares por role",
      "Bypass controlado para Super Admins",
    ],
  },
  {
    title: "IA Nativa Integrada",
    icon: Brain,
    features: [
      "AI Sales Coach para oportunidades",
      "Assistentes IA com personas configuráveis",
      "Sugestões inteligentes de campos e acções",
      "OCR para documentos e faturas",
      "Knowledge Base com RAG",
      "Lead Enrichment automático",
    ],
  },
  {
    title: "Motor de Automação Avançado",
    icon: Workflow,
    features: [
      "Trigger → Condition → Action",
      "Logs e auditoria completa",
      "Sugestões automáticas de automações",
      "Execução paralela e encadeamento",
    ],
  },
  {
    title: "Comunicação Omnicanal",
    icon: MessageSquare,
    features: [
      "Email integrado (SMTP, Resend, Zoho)",
      "WhatsApp Business API",
      "Instagram Direct Messages",
      "Inbox unificado com timeline",
    ],
  },
  {
    title: "Pagamentos Nativos",
    icon: CreditCard,
    features: [
      "Stripe integrado nativamente",
      "Subscrições e planos recorrentes",
      "Bundles e pacotes de produtos",
      "Checkout optimizado para conversão",
    ],
  },
];

export function LandingArchitectureSection() {
  return (
    <section id="arquitectura" className="relative py-28 lg:py-36">
      <div className="absolute inset-0 bg-gradient-to-b from-[hsl(222,47%,6%)] via-transparent to-[hsl(222,47%,6%)] pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-sm text-primary mb-6">
            Diferenciação Estrutural
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-5">
            Construído para{" "}
            <span className="bg-gradient-to-r from-primary to-[hsl(250,83%,60%)] bg-clip-text text-transparent">
              escala empresarial.
            </span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pillars.map((pillar, i) => (
            <motion.div
              key={pillar.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`rounded-2xl border border-[hsl(217,33%,17%)] bg-[hsl(222,47%,6%)] p-6 ${
                i === 1 ? "md:col-span-2 lg:col-span-1 lg:row-span-1" : ""
              }`}
            >
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <pillar.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-bold mb-4">{pillar.title}</h3>
              <ul className="space-y-2.5">
                {pillar.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2.5 text-sm text-[hsl(215,20%,65%)]">
                    <Zap className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
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
