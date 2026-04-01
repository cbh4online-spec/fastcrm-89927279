import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link as LinkIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SectionAIAssistButton } from "@/components/proposals/SectionAIAssistButton";
import { toast } from "sonner";
import { useState } from "react";

interface StoreIdentitySettingsProps {
  form: {
    store_name: string;
    store_description: string;
    store_slug: string;
    custom_domain: string;
    footer_text: string;
    show_categories: boolean;
    show_search: boolean;
  };
  setForm: React.Dispatch<React.SetStateAction<any>>;
  slugError: string | null;
}

export function StoreIdentitySettings({ form, setForm, slugError }: StoreIdentitySettingsProps) {
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informações Gerais</CardTitle>
        <CardDescription>Nome e descrição da loja</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Nome da Loja</Label>
          <Input
            value={form.store_name}
            onChange={(e) => setForm((p: any) => ({ ...p, store_name: e.target.value }))}
            placeholder="A minha loja"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Descrição</Label>
            <SectionAIAssistButton
              onClick={async () => {
                if (!form.store_name.trim()) {
                  toast.error("Preencha o nome da loja primeiro");
                  return;
                }
                const doGenerate = async () => {
                  setIsGeneratingDesc(true);
                  try {
                    const { data, error } = await supabase.functions.invoke("ai-product-assistant", {
                      body: { mode: "generate-store-description", storeName: form.store_name },
                    });
                    if (error) throw error;
                    if (!data.success) throw new Error(data.error);
                    setForm((p: any) => ({ ...p, store_description: data.data.fullDescription || data.data.metaDescription }));
                    toast.success("Descrição gerada com IA!");
                  } catch (err: any) {
                    toast.error("Erro ao gerar descrição: " + (err.message || "Erro desconhecido"));
                  } finally {
                    setIsGeneratingDesc(false);
                  }
                };
                if (form.store_description.trim()) {
                  toast("Já existe uma descrição. Substituir?", {
                    action: { label: "Substituir", onClick: doGenerate },
                  });
                  return;
                }
                doGenerate();
              }}
              isLoading={isGeneratingDesc}
              disabled={!form.store_name.trim()}
              tooltip="Gerar descrição SEO com IA baseada no nome da loja"
            />
          </div>
          <Textarea
            value={form.store_description}
            onChange={(e) => setForm((p: any) => ({ ...p, store_description: e.target.value }))}
            placeholder="Descrição da loja para SEO"
            rows={3}
          />
        </div>
        <Separator />
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <LinkIcon className="h-3.5 w-3.5 text-muted-foreground" />
            Link Personalizado da Loja
          </Label>
          <div className="flex items-center gap-0">
            <span className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-l-md border border-r-0 border-input h-10 flex items-center whitespace-nowrap">
              {form.custom_domain.trim() ? `https://${form.custom_domain.trim()}` : "https://fastcrm.metodopare.ai"}/store/
            </span>
            <Input
              value={form.store_slug}
              onChange={(e) => setForm((p: any) => ({ ...p, store_slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
              placeholder="minha-loja"
              className="rounded-l-none"
            />
          </div>
          {slugError && (
            <p className="text-sm text-destructive">{slugError}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Deixe vazio para usar o link padrão. Apenas letras minúsculas, números e hífens.
          </p>
        </div>
        <Separator />
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            🌐 Domínio Próprio (opcional)
          </Label>
          <Input
            value={form.custom_domain}
            onChange={(e) => setForm((p: any) => ({ ...p, custom_domain: e.target.value.trim().replace(/^https?:\/\//, "") }))}
            placeholder="loja.minhaempresa.pt"
          />
          <p className="text-xs text-muted-foreground">
            Para usar um domínio próprio, configure um registo A no seu DNS a apontar para <code className="bg-muted px-1 rounded">185.158.133.1</code>. Deixe vazio para usar o domínio padrão.
          </p>
        </div>
        <Separator />
        <div className="space-y-2">
          <Label>Texto do Rodapé</Label>
          <Input
            value={form.footer_text}
            onChange={(e) => setForm((p: any) => ({ ...p, footer_text: e.target.value }))}
            placeholder="© 2026 A minha empresa"
          />
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div>
            <Label>Mostrar Categorias</Label>
            <p className="text-xs text-muted-foreground">Filtros de categoria na loja</p>
          </div>
          <Switch
            checked={form.show_categories}
            onCheckedChange={(v) => setForm((p: any) => ({ ...p, show_categories: v }))}
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label>Mostrar Pesquisa</Label>
            <p className="text-xs text-muted-foreground">Barra de pesquisa de produtos</p>
          </div>
          <Switch
            checked={form.show_search}
            onCheckedChange={(v) => setForm((p: any) => ({ ...p, show_search: v }))}
          />
        </div>
      </CardContent>
    </Card>
  );
}
