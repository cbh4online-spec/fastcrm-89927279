import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Quote, ArrowRight } from "lucide-react";
import { Section, SectionHeader, Reveal, BrandGlow } from "./_shared";

const TESTIMONIALS = [
  {
    quote: "Passámos a ter uma visão clara do pipeline e das prioridades comerciais.",
    name: "André S.",
    role: "Diretor Comercial",
    initials: "AS",
  },
  {
    quote: "Automatizámos follow-ups e reduzimos o tempo perdido em tarefas repetitivas.",
    name: "Marta L.",
    role: "CEO",
    initials: "ML",
  },
  {
    quote: "O sistema trouxe organização, previsibilidade e uma nova forma de gerir a equipa.",
    name: "João R.",
    role: "Empresário",
    initials: "JR",
  },
];

export function TestimonialsV2() {
  return (
    <Section id="testemunhos">
      <SectionHeader
        eyebrow="Testemunhos"
        title={<>Resultados que se sentem na <span className="text-brand">operação.</span></>}
      />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {TESTIMONIALS.map((t, i) => (
          <Reveal key={t.name} delay={i * 0.1}>
            <figure className="group relative flex h-full flex-col rounded-3xl border border-navy-100 bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_-20px_hsl(218_70%_14%/0.18)]">
              <Quote className="h-8 w-8 text-brand/30" />
              <blockquote className="mt-4 flex-1 font-display text-lg leading-snug text-navy">
                "{t.quote}"
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3 border-t border-navy-100 pt-5">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-brand to-cyan text-sm font-semibold text-white">
                  {t.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-navy">{t.name}</p>
                  <p className="text-xs text-navy-500">{t.role}</p>
                </div>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

const FAQS = [
  {
    q: "O FastCRM substitui o meu CRM atual?",
    a: "Depende da sua realidade. O FastCRM pode funcionar como CRM principal ou como camada inteligente para centralizar processos, automações e decisões.",
  },
  {
    q: "Preciso de conhecimentos técnicos?",
    a: "Não. A plataforma é pensada para utilização simples por equipas comerciais, gestores e administradores.",
  },
  {
    q: "O FastCRM inclui inteligência artificial?",
    a: "Sim. A IA apoia recomendações, análise, automações e produtividade, sempre com o utilizador no controlo.",
  },
  {
    q: "É possível adaptar à minha área de negócio?",
    a: "Sim. O FastCRM é configurável por setor, equipa, funis, campos, automações e processos.",
  },
  {
    q: "Como começo?",
    a: "O primeiro passo é agendar uma demonstração para percebermos os objetivos, processos e prioridades da sua empresa.",
  },
];

export function FAQV2() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Section id="faq" className="bg-brand-ice">
      <SectionHeader
        eyebrow="Perguntas frequentes"
        title={<>O que costumam perguntar antes de <span className="text-brand">avançar.</span></>}
      />
      <div className="mx-auto max-w-3xl divide-y divide-navy-100 overflow-hidden rounded-3xl border border-navy-100 bg-white">
        {FAQS.map((item, i) => {
          const isOpen = open === i;
          return (
            <div key={item.q}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-6 px-6 py-5 text-left transition-colors hover:bg-brand-ice/60"
                aria-expanded={isOpen}
              >
                <span className="font-display text-base font-semibold text-navy md:text-lg">
                  {item.q}
                </span>
                <span
                  className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-navy-100 text-navy-500 transition-all duration-300 ${
                    isOpen ? "rotate-45 border-brand bg-brand text-white" : ""
                  }`}
                >
                  <Plus className="h-4 w-4" />
                </span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <p className="px-6 pb-6 text-sm leading-relaxed text-navy-500 md:text-base">
                      {item.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

export function CTAV2() {
  return (
    <section id="cta" className="relative overflow-hidden px-6 py-24 md:px-10 md:py-32">
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(218_100%_54%/0.1),transparent_60%),linear-gradient(180deg,hsl(214_40%_97%),hsl(0_0%_100%))]"
      />
      <BrandGlow className="left-1/2 top-1/2 h-[500px] w-[900px] -translate-x-1/2 -translate-y-1/2" variant="mix" />
      <div className="relative mx-auto max-w-4xl">
        <Reveal>
          <div className="relative overflow-hidden rounded-[32px] border border-navy-100 bg-white p-10 text-center shadow-[0_40px_100px_-30px_hsl(218_70%_14%/0.2)] md:p-16">
            <div
              aria-hidden
              className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-brand/15 to-cyan/10 blur-2xl"
            />
            <div
              aria-hidden
              className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-gradient-to-br from-cyan/15 to-brand/10 blur-2xl"
            />

            <div className="relative mx-auto inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/5 px-3.5 py-1.5 text-xs font-medium uppercase tracking-[0.14em] text-brand">
              Próximo passo
            </div>
            <h2 className="relative mt-5 font-display text-4xl font-semibold leading-[1.1] tracking-tight text-navy md:text-5xl">
              Pronto para transformar a forma como a sua empresa{" "}
              <span className="bg-gradient-to-r from-brand to-cyan bg-clip-text text-transparent">
                vende e decide?
              </span>
            </h2>
            <p className="relative mx-auto mt-5 max-w-2xl text-lg text-navy-500">
              Agende uma demonstração e descubra como o FastCRM pode dar mais controlo, velocidade e
              previsibilidade ao seu negócio.
            </p>
            <div className="relative mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href="/contacto?tipo=demo"

                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-navy px-6 py-3.5 text-base font-semibold text-white shadow-[0_12px_32px_-10px_hsl(218_100%_54%/0.45)] transition-all hover:-translate-y-0.5 hover:bg-navy-900"
              >
                Agendar demonstração
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
              <a
                href="/contacto"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-navy-100 bg-white px-6 py-3.5 text-base font-semibold text-navy transition-all hover:border-brand/40 hover:text-brand"
              >
                Falar com a equipa
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

import { Link } from "react-router-dom";
import { FastCRMLogo } from "@/components/brand/FastCRMLogo";

export function FooterV2() {
  return (
    <footer className="border-t border-navy-100 bg-white">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 py-14 md:grid-cols-4 md:px-10">
        <div className="md:col-span-2">
          <Link
            to="/"
            aria-label="FastCRM — página inicial"
            className="inline-flex items-center transition-transform hover:-translate-y-[1px]"
          >
            <FastCRMLogo variant="full" size="lg" />
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-navy-500">
            CRM inteligente, automação e IA para equipas que querem vender melhor, automatizar mais
            e decidir mais rápido.
          </p>
        </div>
        <div>
          <h4 className="font-display text-sm font-semibold text-navy">Produto</h4>
          <ul className="mt-3 space-y-2 text-sm text-navy-500">
            <li><Link to="/funcionalidades" className="hover:text-brand">Funcionalidades</Link></li>
            <li><Link to="/fastcrm-whatsapp-sales" className="hover:text-brand">WhatsApp Sales</Link></li>
            <li><Link to="/#metodo" className="hover:text-brand">Método PARE</Link></li>
            <li><Link to="/casos" className="hover:text-brand">Casos de Uso</Link></li>
            <li><Link to="/precos" className="hover:text-brand">Preços</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-display text-sm font-semibold text-navy">Empresa</h4>
          <ul className="mt-3 space-y-2 text-sm text-navy-500">
            <li><Link to="/sobre" className="hover:text-brand">Sobre</Link></li>
            <li><Link to="/contacto" className="hover:text-brand">Contacto</Link></li>
            <li><Link to="/auth" className="hover:text-brand">Entrar</Link></li>
            <li><Link to="/contacto?tipo=demo" className="hover:text-brand">Agendar demonstração</Link></li>
          </ul>
        </div>

      </div>
      <div className="border-t border-navy-100">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-6 text-xs text-navy-300 md:flex-row md:px-10">
          <p>© {new Date().getFullYear()} FastCRM. Todos os direitos reservados.</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link to="/privacy" className="hover:text-brand">Privacidade</Link>
            <Link to="/terms" className="hover:text-brand">Termos</Link>
            <Link to="/cookies" className="hover:text-brand">Cookies</Link>
            <span>Feito com método em Portugal.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

