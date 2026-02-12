import { motion } from "framer-motion";
import { AlertTriangle, Unplug, Mail, Bot, Database, MessageSquare } from "lucide-react";

const problems = [
  { icon: Database, text: "CRM separado da faturação" },
  { icon: MessageSquare, text: "WhatsApp isolado do sistema" },
  { icon: Mail, text: "Email fora da plataforma" },
  { icon: Bot, text: "Automações em ferramentas externas" },
  { icon: AlertTriangle, text: "IA desconectada dos dados" },
  { icon: Unplug, text: "Dados espalhados por 5+ plataformas" },
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
            A maioria das empresas está{" "}
            <span className="text-destructive">fragmentada.</span>
          </h2>
          <p className="text-lg text-[hsl(215,20%,65%)] max-w-2xl mx-auto mb-16">
            Ferramentas desligadas, dados dispersos, equipas sem visibilidade. A fragmentação gera perda de controlo, oportunidades e eficiência.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {problems.map((item, i) => (
            <motion.div
              key={item.text}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="flex items-center gap-4 p-5 rounded-xl border border-[hsl(217,33%,17%)] bg-[hsl(222,47%,6%)] text-left"
            >
              <div className="shrink-0 w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <item.icon className="h-5 w-5 text-destructive" />
              </div>
              <span className="text-sm font-medium">{item.text}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
