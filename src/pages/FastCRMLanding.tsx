import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { LandingHeroSection } from "@/components/landing-fastcrm/LandingHeroSection";
import { LandingProblemSection } from "@/components/landing-fastcrm/LandingProblemSection";
import { LandingSolutionSection } from "@/components/landing-fastcrm/LandingSolutionSection";
import { LandingArchitectureSection } from "@/components/landing-fastcrm/LandingArchitectureSection";
import { LandingPositioningSection } from "@/components/landing-fastcrm/LandingPositioningSection";
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
        <title>FastCRM — AI-Native Revenue CRM Platform</title>
        <meta
          name="description"
          content="Build your CRM. Grow your revenue. FastCRM adapts to your business with smart extensions, revenue intelligence, and automations that scale."
        />
        <meta property="og:title" content="FastCRM — AI-Native Revenue CRM" />
        <meta
          property="og:description"
          content="Build your CRM. Grow your revenue. Simple core, smart extensions, revenue intelligence built in."
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
              "AI-Native Revenue CRM with smart extensions, revenue intelligence, and automations that scale.",
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
          <LandingArchitectureSection />
          <LandingPositioningSection />
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
