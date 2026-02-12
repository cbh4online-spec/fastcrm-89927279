import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { LandingHeroSection } from "@/components/landing-fastcrm/LandingHeroSection";
import { LandingProblemSection } from "@/components/landing-fastcrm/LandingProblemSection";
import { LandingSolutionSection } from "@/components/landing-fastcrm/LandingSolutionSection";
import { LandingArchitectureSection } from "@/components/landing-fastcrm/LandingArchitectureSection";
import { LandingMetricsSection } from "@/components/landing-fastcrm/LandingMetricsSection";
import { LandingPositioningSection } from "@/components/landing-fastcrm/LandingPositioningSection";
import { LandingFinalCTA } from "@/components/landing-fastcrm/LandingFinalCTA";
import { LandingFAQSection } from "@/components/landing-fastcrm/LandingFAQSection";
import { LandingFooter } from "@/components/landing-fastcrm/LandingFooter";
import { LandingStickyHeader } from "@/components/landing-fastcrm/LandingStickyHeader";

export default function FastCRMLanding() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <Helmet>
        <title>FastCRM — Infraestrutura Digital Empresarial com IA</title>
        <meta
          name="description"
          content="O FastCRM integra CRM, IA, automação, comunicação omnicanal, marketplace de módulos e gestão multi-workspace numa única plataforma SaaS empresarial."
        />
        <meta property="og:title" content="FastCRM — Infraestrutura Digital Empresarial com IA" />
        <meta
          property="og:description"
          content="Não é apenas um CRM. É a Infraestrutura Digital da Sua Empresa."
        />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://fastcrm.metodopare.ai/fastcrm" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "FastCRM",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            description:
              "Infraestrutura digital empresarial com CRM, IA, automação e comunicação omnicanal integrada.",
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "EUR",
              description: "Workspace gratuito para começar",
            },
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-[hsl(222,47%,4%)] text-[hsl(210,40%,98%)] overflow-x-hidden">
        <LandingStickyHeader />
        <main>
          <LandingHeroSection />
          <LandingProblemSection />
          <LandingSolutionSection />
          <LandingArchitectureSection />
          <LandingMetricsSection />
          <LandingPositioningSection />
          <LandingFinalCTA />
          <LandingFAQSection />
        </main>
        <LandingFooter />
      </div>
    </>
  );
}
