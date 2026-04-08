import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function PublicEbookShortLink() {
  const { shortCode } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState(false);

  useEffect(() => {
    async function resolve() {
      if (!shortCode) return setError(true);

      const { data: ebook, error: err } = await (supabase as any)
        .from("ebooks")
        .select("slug")
        .eq("short_code", shortCode)
        .eq("status", "published")
        .single();

      if (err || !ebook?.slug) return setError(true);

      navigate(`/ebook/${ebook.slug}`, { replace: true });
    }
    resolve();
  }, [shortCode, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">eBook não encontrado</h1>
          <p className="text-muted-foreground">Este link curto não existe ou o eBook não está publicado.</p>
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
