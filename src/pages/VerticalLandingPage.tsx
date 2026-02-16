import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { getVerticalBySlug } from "@/config/verticalConfigs";
import { VerticalLandingTemplate } from "@/components/vertical-landing/VerticalLandingTemplate";
import { fetchPublishedTemplateBySlug, type VerticalTemplateRow } from "@/hooks/useVerticalTemplates";
import type { VerticalConfig } from "@/config/verticalConfigs";
import NotFound from "./NotFound";

function rowToConfig(row: VerticalTemplateRow): VerticalConfig {
  return {
    slug: row.slug,
    nome: row.nome,
    dor_principal: row.dor_principal,
    resultado_prometido: row.resultado_prometido,
    dores: row.dores as string[],
    modulos_ativos: row.modulos_ativos as VerticalConfig["modulos_ativos"],
    antes_depois: row.antes_depois as VerticalConfig["antes_depois"],
    roi_exemplo: row.roi_exemplo as VerticalConfig["roi_exemplo"],
    cores: row.cores as VerticalConfig["cores"],
    cta_principal: row.cta_principal,
    cta_secundario: row.cta_secundario,
    ai_persona_nome: row.ai_persona_nome,
    seo: row.seo as VerticalConfig["seo"],
  };
}

export default function VerticalLandingPage() {
  const location = useLocation();
  const params = useParams<{ slug?: string }>();
  // Support both /slug (static) and /v/:slug (dynamic) routes
  const slug = params.slug || location.pathname.replace("/", "");
  const staticConfig = getVerticalBySlug(slug);

  const [dynamicConfig, setDynamicConfig] = useState<VerticalConfig | null>(null);
  const [loading, setLoading] = useState(!staticConfig);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!staticConfig) {
      setLoading(true);
      fetchPublishedTemplateBySlug(slug).then((row) => {
        if (row) setDynamicConfig(rowToConfig(row));
        else setNotFound(true);
        setLoading(false);
      });
    }
  }, [slug, staticConfig]);

  const config = staticConfig || dynamicConfig;

  if (loading) return <div className="min-h-screen bg-[hsl(222,47%,4%)]" />;
  if (!config || notFound) return <NotFound />;

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
