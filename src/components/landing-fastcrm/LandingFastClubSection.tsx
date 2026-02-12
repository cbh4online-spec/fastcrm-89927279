import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Lock, Shield, Users } from "lucide-react";

export function LandingFastClubSection() {
  return (
    <section id="fastclub" className="relative py-28 lg:py-36">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/5 blur-[150px]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-[hsl(217,33%,17%)] bg-[hsl(222,47%,6%)] px-4 py-1.5 text-xs font-medium text-[hsl(215,20%,75%)] tracking-wider uppercase mb-6">
            <Lock className="h-3 w-3" />
            Private Capital Circle
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-5">
            O círculo privado do{" "}
            <span className="bg-gradient-to-r from-primary to-[hsl(250,83%,60%)] bg-clip-text text-transparent">
              ecossistema FastCRM.
            </span>
          </h2>
          <p className="text-lg text-[hsl(215,20%,65%)] max-w-2xl mx-auto leading-relaxed">
            Um ambiente restrito onde empresários, investidores e decisores estratégicos alinham oportunidades com método, controlo e métricas reais.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-3 gap-4 mb-12">
          {[
            {
              icon: Shield,
              title: "Acesso Validado",
              desc: "Entrada sujeita a avaliação estratégica e limitação por setor.",
            },
            {
              icon: Users,
              title: "Matching Objetivo",
              desc: "Conexões baseadas em critérios reais, não em volume.",
            },
            {
              icon: Lock,
              title: "Confidencialidade Total",
              desc: "Dados protegidos, interações rastreáveis, sem exposição pública.",
            },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="group p-6 rounded-xl border border-[hsl(217,33%,17%)] bg-[hsl(222,47%,6%)] hover:border-primary/40 transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-sm mb-1.5">{item.title}</h3>
              <p className="text-xs text-[hsl(215,20%,65%)] leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center"
        >
          <Link to="/fastclub">
            <Button
              size="lg"
              className="gradient-primary shadow-glow text-primary-foreground px-10 h-14 text-base font-semibold gap-2"
            >
              Conhecer o Private Capital Circle
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <p className="text-xs text-[hsl(215,20%,55%)] mt-4">
            Acesso exclusivamente por convite ou candidatura validada.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
