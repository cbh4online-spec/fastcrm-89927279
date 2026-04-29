import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import type { ProductContentData } from "./types";

interface Props {
  content: ProductContentData;
  onChange: (c: ProductContentData) => void;
  onGenerate: () => void;
}

export function StepContent({ content, onChange, onGenerate }: Props) {
  const set = <K extends keyof ProductContentData>(k: K, v: ProductContentData[K]) =>
    onChange({ ...content, [k]: v });

  const setList = (k: "benefits" | "seo_keywords" | "tags", v: string) =>
    set(k, v.split(",").map((s) => s.trim()).filter(Boolean));

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Passo 4 — Conteúdo para loja e catálogo</CardTitle>
          <CardDescription>Conteúdo gerado pela IA. Edita livremente antes de criar o produto.</CardDescription>
        </div>
        <Button onClick={onGenerate} variant="secondary" size="sm">
          <Sparkles className="h-4 w-4 mr-1" /> Gerar com IA
        </Button>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div>
          <Label className="text-xs">Título curto</Label>
          <Input value={content.short_title} onChange={(e) => set("short_title", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Título SEO</Label>
          <Input value={content.seo_title} onChange={(e) => set("seo_title", e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <Label className="text-xs">Descrição curta</Label>
          <Textarea rows={2} value={content.short_description} onChange={(e) => set("short_description", e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <Label className="text-xs">Descrição longa</Label>
          <Textarea rows={5} value={content.long_description} onChange={(e) => set("long_description", e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <Label className="text-xs">Benefícios (separados por vírgula)</Label>
          <Textarea rows={2} value={content.benefits.join(", ")} onChange={(e) => setList("benefits", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Modo de utilização</Label>
          <Textarea rows={3} value={content.usage_instructions} onChange={(e) => set("usage_instructions", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Precauções</Label>
          <Textarea rows={3} value={content.precautions} onChange={(e) => set("precautions", e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <Label className="text-xs">Meta description</Label>
          <Textarea rows={2} value={content.meta_description} onChange={(e) => set("meta_description", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Palavras-chave SEO</Label>
          <Input value={content.seo_keywords.join(", ")} onChange={(e) => setList("seo_keywords", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Tags comerciais</Label>
          <Input value={content.tags.join(", ")} onChange={(e) => setList("tags", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Texto para catálogo</Label>
          <Textarea rows={3} value={content.catalog_text} onChange={(e) => set("catalog_text", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Texto para proposta</Label>
          <Textarea rows={3} value={content.proposal_text} onChange={(e) => set("proposal_text", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Texto para WhatsApp</Label>
          <Textarea rows={3} value={content.whatsapp_text} onChange={(e) => set("whatsapp_text", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Texto para atendimento em loja</Label>
          <Textarea rows={3} value={content.in_store_text} onChange={(e) => set("in_store_text", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Experiência sensorial</Label>
          <Textarea rows={2} value={content.sensory_experience} onChange={(e) => set("sensory_experience", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Experiência olfativa</Label>
          <Textarea rows={2} value={content.olfactory_experience} onChange={(e) => set("olfactory_experience", e.target.value)} />
        </div>
      </CardContent>
    </Card>
  );
}
