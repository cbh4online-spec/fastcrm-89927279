import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function PublicBioShortLink() {
  const { shortCode } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState(false);

  useEffect(() => {
    async function resolve() {
      if (!shortCode) return setError(true);

      // Get bio_page by short_code
      const { data: page, error: pageErr } = await supabase
        .from("bio_pages")
        .select("slug, workspace_id")
        .eq("short_code", shortCode)
        .eq("status", "live")
        .single();

      if (pageErr || !page) return setError(true);

      // Get workspace slug
      const { data: ws, error: wsErr } = await supabase
        .from("workspaces")
        .select("slug")
        .eq("id", page.workspace_id)
        .single();

      if (wsErr || !ws) return setError(true);

      navigate(`/bio/${ws.slug}/${page.slug}`, { replace: true });
    }
    resolve();
  }, [shortCode, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Link não encontrado</h1>
          <p className="text-muted-foreground">Este link curto não existe ou a página não está publicada.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-pulse text-muted-foreground">A redirecionar...</div>
    </div>
  );
}
