import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, AlertCircle, Image } from "lucide-react";

const ALL_IMAGE_IDS = [
  "hero",
  "solution-pipeline",
  "solution-analytics",
  "solution-automation",
  "solution-marketplace",
  "positioning-founders",
  "positioning-teams",
  "positioning-leaders",
];

const LABELS: Record<string, string> = {
  hero: "Hero — Dashboard CRM futurista",
  "solution-pipeline": "Solution 1 — Pipeline de deals",
  "solution-analytics": "Solution 2 — Analytics dashboard",
  "solution-automation": "Solution 3 — Workflow automação",
  "solution-marketplace": "Solution 4 — Marketplace extensões",
  "positioning-founders": "Positioning — Founders",
  "positioning-teams": "Positioning — Teams",
  "positioning-leaders": "Positioning — Leaders",
};

export default function GenerateLandingImages() {
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [total, setTotal] = useState(0);

  const generateAll = async () => {
    setGenerating(true);
    setResults({});
    setErrors({});
    setTotal(ALL_IMAGE_IDS.length);

    // Generate one by one to show progress
    for (let i = 0; i < ALL_IMAGE_IDS.length; i++) {
      setCurrentIndex(i + 1);
      const id = ALL_IMAGE_IDS[i];

      try {
        const { data, error } = await supabase.functions.invoke("landing-generate-images", {
          body: { imageIds: [id] },
        });

        if (error) {
          setErrors((prev) => ({ ...prev, [id]: error.message }));
        } else {
          if (data.results?.[id]) {
            setResults((prev) => ({ ...prev, [id]: data.results[id] }));
          }
          if (data.errors?.[id]) {
            setErrors((prev) => ({ ...prev, [id]: data.errors[id] }));
          }
        }
      } catch (e) {
        setErrors((prev) => ({ ...prev, [id]: e instanceof Error ? e.message : "Erro" }));
      }
    }

    setGenerating(false);
  };

  const generateSingle = async (id: string) => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("landing-generate-images", {
        body: { imageIds: [id] },
      });

      if (error) {
        setErrors((prev) => ({ ...prev, [id]: error.message }));
      } else {
        if (data.results?.[id]) {
          setResults((prev) => ({ ...prev, [id]: data.results[id] }));
          setErrors((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
        }
        if (data.errors?.[id]) {
          setErrors((prev) => ({ ...prev, [id]: data.errors[id] }));
        }
      }
    } catch (e) {
      setErrors((prev) => ({ ...prev, [id]: e instanceof Error ? e.message : "Erro" }));
    }
    setGenerating(false);
  };

  const progress = total > 0 ? (currentIndex / total) * 100 : 0;

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Gerar Imagens Landing Page</h1>
          <p className="text-muted-foreground">
            Gera 8 imagens com IA para a landing page FastCRM. As imagens são guardadas no storage e ficam disponíveis nos componentes.
          </p>
        </div>

        <div className="flex gap-4">
          <Button onClick={generateAll} disabled={generating} size="lg">
            {generating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Gerar Todas as Imagens
          </Button>
        </div>

        {generating && total > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              A gerar imagem {currentIndex} de {total}...
            </p>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {ALL_IMAGE_IDS.map((id) => (
            <div key={id} className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">{LABELS[id]}</h3>
                {results[id] && <CheckCircle className="h-4 w-4 text-green-500" />}
                {errors[id] && <AlertCircle className="h-4 w-4 text-red-500" />}
              </div>

              {results[id] ? (
                <div className="space-y-2">
                  <img
                    src={results[id]}
                    alt={LABELS[id]}
                    className="w-full rounded-lg aspect-video object-cover"
                  />
                  <input
                    readOnly
                    value={results[id]}
                    className="w-full text-xs bg-muted p-2 rounded font-mono"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                </div>
              ) : (
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                  <Image className="h-8 w-8 text-muted-foreground/30" />
                </div>
              )}

              {errors[id] && (
                <p className="text-xs text-red-400">{errors[id]}</p>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => generateSingle(id)}
                disabled={generating}
              >
                {generating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                Regenerar
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
