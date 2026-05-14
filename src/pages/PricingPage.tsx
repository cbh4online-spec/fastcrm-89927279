import { Helmet } from "react-helmet-async";
import { LandingStickyHeader } from "@/components/landing-fastcrm/LandingStickyHeader";
import { LandingPricingSection } from "@/components/landing-fastcrm/LandingPricingSection";
import { LandingFinalCTA } from "@/components/landing-fastcrm/LandingFinalCTA";
import { LandingFAQSection } from "@/components/landing-fastcrm/LandingFAQSection";
import { LandingFooter } from "@/components/landing-fastcrm/LandingFooter";
import { useEffect } from "react";

export default function PricingPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <Helmet>
        <title>Pricing — FastCRM Plans & Bundles for Growing Teams</title>
        <meta
          name="description"
          content="Compare FastCRM plans: Starter (free), Growth and Scale. Flexible pricing with smart bundles for SaaS teams of any size."
        />
        <meta property="og:title" content="FastCRM Pricing — Plans & Bundles" />
        <meta
          property="og:description"
          content="Compare FastCRM plans: Starter (free), Growth and Scale. Flexible pricing with smart bundles for SaaS teams."
        />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://fastcrm.metodopare.ai/precos" />
      </Helmet>

      <div className="min-h-screen bg-[hsl(222,47%,4%)] text-[hsl(210,40%,98%)] overflow-x-hidden">
        <LandingStickyHeader />
        <main className="pt-20">
          <LandingPricingSection />
          <LandingFAQSection />
          <LandingFinalCTA />
        </main>
        <LandingFooter />
      </div>
    </>
  );
}
