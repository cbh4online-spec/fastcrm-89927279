import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { LandingHeroSection } from "@/components/landing-fastcrm/LandingHeroSection";
import { LandingProblemSection } from "@/components/landing-fastcrm/LandingProblemSection";
import { LandingSolutionSection } from "@/components/landing-fastcrm/LandingSolutionSection";
import { LandingArchitectureSection } from "@/components/landing-fastcrm/LandingArchitectureSection";
import { LandingComparisonSection } from "@/components/landing-fastcrm/LandingComparisonSection";
import { LandingPositioningSection } from "@/components/landing-fastcrm/LandingPositioningSection";
import { LandingTestimonialsSection } from "@/components/landing-fastcrm/LandingTestimonialsSection";
import { LandingPricingSection } from "@/components/landing-fastcrm/LandingPricingSection";
import { LandingFastClubSection } from "@/components/landing-fastcrm/LandingFastClubSection";
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
        <title>FastCRM — Revenue Intelligence Platform for Growing Teams</title>
        <meta
          name="description"
          content="See your revenue before it happens. FastCRM combines flexible CRM, built-in intelligence, and smart extensions for SaaS teams."
        />
        <meta property="og:title" content="FastCRM — Revenue Intelligence Platform" />
        <meta
          property="og:description"
          content="See your revenue before it happens. Health scores, deal intelligence, and smart extensions for growing SaaS teams."
        />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://fastcrm.lovable.app" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "FastCRM",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            description:
              "Revenue Intelligence Platform with flexible CRM, built-in deal intelligence, and smart extensions for SaaS teams.",
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "EUR",
              description: "Free Starter plan to get started",
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
          <LandingComparisonSection />
          <LandingArchitectureSection />
          <LandingPositioningSection />
          <LandingTestimonialsSection />
          <LandingPricingSection />
          <LandingFastClubSection />
          <LandingFinalCTA />
          <LandingFAQSection />
        </main>
        <LandingFooter />
      </div>
    </>
  );
}
