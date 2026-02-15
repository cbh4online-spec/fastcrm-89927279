import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { getVerticalBySlug } from "@/config/verticalConfigs";
import { VerticalLandingTemplate } from "@/components/vertical-landing/VerticalLandingTemplate";
import NotFound from "./NotFound";

export default function VerticalLandingPage() {
  const location = useLocation();
  const slug = location.pathname.replace("/", "");
  const config = getVerticalBySlug(slug);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  if (!config) return <NotFound />;

  return (
    <>
      <Helmet>
        <title>{config.seo.title}</title>
        <meta name="description" content={config.seo.description} />
        <meta property="og:title" content={config.seo.title} />
        <meta property="og:description" content={config.seo.description} />
        <meta property="og:type" content="website" />
        <link rel="canonical" href={config.seo.canonical} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: `FastCRM para ${config.nome}`,
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            description: config.seo.description,
          })}
        </script>
      </Helmet>
      <VerticalLandingTemplate config={config} />
    </>
  );
}
