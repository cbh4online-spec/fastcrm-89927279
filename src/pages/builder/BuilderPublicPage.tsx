import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeBuilderHtml } from "@/modules/builder/lib/sanitizeBuilderHtml";

interface Resolved {
  asset_id: string;
  name: string;
  html: string;
  published_at: string;
}

export default function BuilderPublicPage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<Resolved | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!slug) {
        setError("Slug inválido");
        setLoading(false);
        return;
      }
      // Lookup público via RPC (SECURITY DEFINER, devolve só se status=published)
      // Sem workspace, tentamos resolver pelo hostname (custom domain) OU pelo
      // primeiro asset publicado com este slug.
      const hostname = window.location.hostname;
      const { data: rows, error: rpcError } = await supabase.rpc(
        "get_published_builder_asset",
        {
          _hostname: hostname,
          _path: window.location.pathname,
          _slug: slug,
          _workspace: null,
        },
      );
      if (cancelled) return;
      if (rpcError) {
        setError(rpcError.message);
      } else {
        const row = Array.isArray(rows) ? rows[0] : rows;
        if (row) setData(row as Resolved);
        else setError("Página não encontrada");
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        A carregar…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-2 p-6 text-center">
        <Helmet>
          <title>Página não encontrada</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <h1 className="text-5xl font-bold text-primary">404</h1>
        <p className="text-muted-foreground">{error ?? "Página não encontrada"}</p>
      </div>
    );
  }

  const safeHtml = sanitizeBuilderHtml(data.html);

  return (
    <>
      <Helmet>
        <title>{data.name}</title>
      </Helmet>
      <iframe
        title={data.name}
        sandbox="allow-same-origin allow-popups"
        srcDoc={safeHtml}
        className="w-full border-0"
        style={{ height: "100vh", display: "block" }}
      />
    </>
  );
}
