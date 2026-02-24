import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "What's included in the free plan?",
    a: "The Starter plan includes CRM core with objects, contacts, companies, and deals. You get 1 pipeline, basic health scores, 3 automations, and a shared inbox. Up to 3 users — perfect to get started and see if FastCRM is right for you.",
  },
  {
    q: "How do extensions work?",
    a: "Extensions are official add-ons that expand FastCRM's capabilities. Things like Proposals, Invoicing, B2B Client Portal. You can activate them individually or as bundles (which come with a discount). All extensions include a 14-day free trial.",
  },
  {
    q: "What's the difference between extensions and bundles?",
    a: "Extensions are individual feature packs (e.g., Proposals Pack at €19/mo). Bundles group related extensions at a discount — for example, the SMB Revenue Bundle includes Proposals + Finance for €29/mo instead of €38/mo.",
  },
  {
    q: "Can I switch plans anytime?",
    a: "Yes. Upgrade instantly, downgrade at the end of your billing period. No lock-in contracts. You can also start with Starter (free) and upgrade when your team is ready.",
  },
  {
    q: "How is FastCRM different from traditional CRMs?",
    a: "Traditional CRMs store contacts. FastCRM tells you what to do with them. Every deal gets a health score, every stage has benchmarks, and the system surfaces actionable insights — not just dashboards.",
  },
  {
    q: "Do I need technical knowledge to use FastCRM?",
    a: "No. FastCRM is designed for sales teams and founders, not developers. The interface is intuitive, onboarding is conversational, and intelligence is built in. No code required.",
  },
  {
    q: "Is my data secure?",
    a: "Yes. We implement row-level security on every table, workspace isolation, encrypted sensitive data, and robust authentication. The platform is regularly audited.",
  },
  {
    q: "Can I integrate with tools I already use?",
    a: "FastCRM integrates natively with Stripe, WhatsApp Business, Instagram, email providers (SMTP/Zoho), and more. The Scale plan includes API access for custom integrations.",
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
            Frequently Asked Questions
          </h2>
          <p className="text-[hsl(215,20%,65%)]">
            Everything you need to know before getting started.
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
