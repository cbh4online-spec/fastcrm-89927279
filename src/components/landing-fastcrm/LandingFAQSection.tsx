import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "O que diferencia o FastCRM de outros CRMs?",
    a: "O FastCRM não é apenas um CRM — é uma infraestrutura digital completa. Integra CRM, IA nativa, automação avançada, comunicação omnicanal, marketplace de módulos e gestão multi-workspace numa única plataforma, eliminando a necessidade de ferramentas fragmentadas.",
  },
  {
    q: "Preciso de conhecimentos técnicos para usar?",
    a: "Não. O FastCRM foi desenhado para equipas comerciais e de gestão. A interface é intuitiva e toda a configuração é feita sem código. Os assistentes de IA ajudam a optimizar processos automaticamente.",
  },
  {
    q: "Como funciona o modelo de workspace?",
    a: "Cada empresa ou unidade de negócio pode ter o seu próprio workspace com isolamento total de dados, permissões por role e configurações independentes. Ideal para grupos empresariais, agências e franchises.",
  },
  {
    q: "Os dados estão seguros?",
    a: "Sim. Implementamos Row Level Security (RLS) em 100% das tabelas, isolamento multi-tenant por workspace, encriptação de dados sensíveis e autenticação robusta. A plataforma é auditada regularmente.",
  },
  {
    q: "Posso integrar com ferramentas que já uso?",
    a: "Sim. O FastCRM integra nativamente com Stripe, WhatsApp Business, Instagram, email (SMTP/Zoho), Google Places e muitos outros. O marketplace de módulos permite expandir funcionalidades continuamente.",
  },
  {
    q: "Quanto custa?",
    a: "Pode começar gratuitamente com um workspace. Os planos pagos escalam conforme as necessidades da sua operação — número de utilizadores, módulos activos e volume de IA utilizada.",
  },
  {
    q: "Existe suporte em português?",
    a: "Sim. Toda a plataforma, documentação e suporte estão disponíveis em português. A equipa de produto é portuguesa e compreende as necessidades do mercado local e europeu.",
  },
];

export function LandingFAQSection() {
  return (
    <section id="faq" className="relative py-28 lg:py-36">
      <div className="relative max-w-3xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Perguntas Frequentes
          </h2>
          <p className="text-[hsl(215,20%,65%)]">
            Tudo o que precisa de saber antes de começar.
          </p>
        </motion.div>

        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <AccordionItem
                value={`faq-${i}`}
                className="rounded-xl border border-[hsl(217,33%,17%)] bg-[hsl(222,47%,6%)] px-5 data-[state=open]:border-primary/30"
              >
                <AccordionTrigger className="text-left text-sm font-semibold py-4 hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-[hsl(215,20%,65%)] pb-4 leading-relaxed">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            </motion.div>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
