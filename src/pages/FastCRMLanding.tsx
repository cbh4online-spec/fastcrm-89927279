import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { HeaderV2 } from "@/components/landing-fastcrm-v2/HeaderV2";
import { HeroV2 } from "@/components/landing-fastcrm-v2/HeroV2";
import {
  SocialProofV2,
  ProblemV2,
  SolutionV2,
  ModulesV2,
} from "@/components/landing-fastcrm-v2/Sections1";
import {
  MetricsV2,
  AIV2,
  MethodPareV2,
  CasesV2,
} from "@/components/landing-fastcrm-v2/Sections2";
import {
  TestimonialsV2,
  FAQV2,
  CTAV2,
  FooterV2,
} from "@/components/landing-fastcrm-v2/Sections3";
import { StoreCookieConsent } from "@/components/store/StoreCookieConsent";

export default function FastCRMLanding() {
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || hash.length < 2) {
      window.scrollTo(0, 0);
      return;
    }
    const id = decodeURIComponent(hash.slice(1));
    const scrollToTarget = () => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    const timer = window.setTimeout(scrollToTarget, 120);
    return () => window.clearTimeout(timer);
  }, []);


  return (
    <>
      <Helmet>
        <title>FastCRM — CRM inteligente para vender, automatizar e decidir</title>
        <meta
          name="description"
          content="O FastCRM combina CRM, automação, dados e IA para dar à sua empresa mais controlo, velocidade e previsibilidade comercial. Agende uma demonstração."
        />
        <meta property="og:title" content="FastCRM — Venda melhor. Automatize mais. Decida mais rápido." />
        <meta
          property="og:description"
          content="Plataforma CRM premium com automação e inteligência artificial para equipas que querem crescer com método."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://fastcrm.metodopare.ai/" />
        <meta property="og:image" content="https://fastcrm.metodopare.ai/og/og-home.jpg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://fastcrm.metodopare.ai/og/og-home.jpg" />
        <link rel="canonical" href="https://fastcrm.metodopare.ai/" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "FastCRM",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            description:
              "CRM inteligente com automação e IA para equipas que querem vender melhor, automatizar mais e decidir mais rápido.",
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "EUR",
              description: "Demonstração gratuita",
            },
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-background text-foreground antialiased">
        <HeaderV2 />
        <main>
          <HeroV2 />
          <SocialProofV2 />
          <ProblemV2 />
          <SolutionV2 />
          <ModulesV2 />
          <MetricsV2 />
          <AIV2 />
          <MethodPareV2 />
          <CasesV2 />
          <TestimonialsV2 />
          <FAQV2 />
          <CTAV2 />
        </main>
        <FooterV2 />
        <StoreCookieConsent />
      </div>
    </>
  );
}
