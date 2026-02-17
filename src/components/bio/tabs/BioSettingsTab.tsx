import { useBioPage, useUpdateBioPage } from "@/hooks/useBioPages";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BioSettingsTabProps {
  pageId: string;
}

export function BioSettingsTab({ pageId }: BioSettingsTabProps) {
  const { data: page } = useBioPage(pageId);
  const updatePage = useUpdateBioPage();
  const [form, setForm] = useState({ seo_title: "", seo_description: "", primary_color: "#6366f1", custom_css: "" });
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (page) {
      setForm({
        seo_title: page.seo_title || "",
        seo_description: page.seo_description || "",
        primary_color: page.primary_color || "#6366f1",
        custom_css: page.custom_css || "",
      });
    }
  }, [page]);

  const handleSave = () => {
    updatePage.mutate({ id: pageId, ...form });
  };

  const handleGenerateAI = async () => {
    if (!page) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("bio-seo-copy", {
        body: { pageName: page.name, vertical: page.seo_description || "" },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      setForm((f) => ({
        ...f,
        seo_title: data.seo_title || f.seo_title,
        seo_description: data.seo_description || f.seo_description,
      }));
      toast.success("Título e descrição gerados com IA!");
    } catch (e: any) {
      toast.error("Erro ao gerar com IA: " + (e.message || "erro desconhecido"));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4 mt-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">SEO</CardTitle>
            <Button variant="outline" size="sm" onClick={handleGenerateAI} disabled={generating}>
              {generating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
              {generating ? "A gerar..." : "Gerar com IA"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-sm font-medium">Título SEO</label>
            <Input value={form.seo_title} onChange={(e) => setForm((f) => ({ ...f, seo_title: e.target.value }))} placeholder="Título da página" />
          </div>
          <div>
            <label className="text-sm font-medium">Descrição SEO</label>
            <Input value={form.seo_description} onChange={(e) => setForm((f) => ({ ...f, seo_description: e.target.value }))} placeholder="Descrição para motores de busca" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Tema</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-sm font-medium">Cor primária</label>
            <div className="flex items-center gap-2">
              <input type="color" value={form.primary_color} onChange={(e) => setForm((f) => ({ ...f, primary_color: e.target.value }))} className="h-10 w-10 rounded border cursor-pointer" />
              <Input value={form.primary_color} onChange={(e) => setForm((f) => ({ ...f, primary_color: e.target.value }))} className="flex-1" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">CSS Personalizado</label>
            <textarea
              className="w-full border rounded-md p-2 text-sm min-h-[80px] font-mono bg-background"
              value={form.custom_css}
              onChange={(e) => setForm((f) => ({ ...f, custom_css: e.target.value }))}
              placeholder=".bio-page { }"
            />
          </div>
        </CardContent>
      </Card>
      <Button onClick={handleSave} disabled={updatePage.isPending}>
        {updatePage.isPending ? "A guardar..." : "Guardar Definições"}
      </Button>
    </div>
  );
}
