import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUpdateFunnelStep, FunnelStep } from "@/hooks/useFunnels";
import { Save } from "lucide-react";
import { toast } from "sonner";

interface FunnelStepEditorProps {
  step: FunnelStep;
}

export function FunnelStepEditor({ step }: FunnelStepEditorProps) {
  const updateStep = useUpdateFunnelStep();
  const content = (step.content || {}) as Record<string, string>;

  const [headline, setHeadline] = useState(content.headline || "");
  const [subheadline, setSubheadline] = useState(content.subheadline || "");
  const [bodyText, setBodyText] = useState(content.body || "");
  const [ctaText, setCtaText] = useState(content.cta_text || "Começar Agora");
  const [ctaColor, setCtaColor] = useState(content.cta_color || "#3b82f6");

  useEffect(() => {
    const c = (step.content || {}) as Record<string, string>;
    setHeadline(c.headline || "");
    setSubheadline(c.subheadline || "");
    setBodyText(c.body || "");
    setCtaText(c.cta_text || "Começar Agora");
    setCtaColor(c.cta_color || "#3b82f6");
  }, [step.id]);

  const handleSave = () => {
    updateStep.mutate({
      id: step.id,
      content: { headline, subheadline, body: bodyText, cta_text: ctaText, cta_color: ctaColor },
    });
    toast.success("Step guardado");
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Editor */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Conteúdo do Step</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Título</Label>
            <Input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Título principal" />
          </div>
          <div>
            <Label>Subtítulo</Label>
            <Input value={subheadline} onChange={(e) => setSubheadline(e.target.value)} placeholder="Subtítulo" />
          </div>
          <div>
            <Label>Corpo</Label>
            <Textarea value={bodyText} onChange={(e) => setBodyText(e.target.value)} rows={6} placeholder="Conteúdo da página..." />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Texto do CTA</Label>
              <Input value={ctaText} onChange={(e) => setCtaText(e.target.value)} />
            </div>
            <div>
              <Label>Cor do CTA</Label>
              <div className="flex gap-2">
                <Input type="color" value={ctaColor} onChange={(e) => setCtaColor(e.target.value)} className="w-12 h-9 p-1" />
                <Input value={ctaColor} onChange={(e) => setCtaColor(e.target.value)} className="flex-1" />
              </div>
            </div>
          </div>
          <Button onClick={handleSave} disabled={updateStep.isPending}>
            <Save className="h-4 w-4 mr-2" />
            Guardar
          </Button>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Pré-visualização</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-6 bg-background min-h-[300px] space-y-4">
            {headline && <h2 className="text-2xl font-bold">{headline}</h2>}
            {subheadline && <p className="text-lg text-muted-foreground">{subheadline}</p>}
            {bodyText && <p className="text-sm whitespace-pre-wrap">{bodyText}</p>}
            {ctaText && (
              <button
                className="px-6 py-3 rounded-lg text-white font-medium"
                style={{ backgroundColor: ctaColor }}
              >
                {ctaText}
              </button>
            )}
            {!headline && !subheadline && !bodyText && (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-sm gap-2">
                <span className="text-3xl">✏️</span>
                <p>Preenche o editor para ver a pré-visualização</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
