import { useBioPage, useUpdateBioPage } from "@/hooks/useBioPages";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

interface BioSettingsTabProps {
  pageId: string;
}

export function BioSettingsTab({ pageId }: BioSettingsTabProps) {
  const { data: page } = useBioPage(pageId);
  const updatePage = useUpdateBioPage();
  const [form, setForm] = useState({ seo_title: "", seo_description: "", primary_color: "#6366f1", custom_css: "" });

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

  return (
    <div className="space-y-4 mt-4">
      <Card>
        <CardHeader><CardTitle className="text-base">SEO</CardTitle></CardHeader>
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
