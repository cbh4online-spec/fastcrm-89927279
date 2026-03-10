import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Eye, Edit3, Save, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useUpdateVision, type VisionProfile } from "@/hooks/useVision";

interface Props {
  vision: VisionProfile;
}

export function ManifestoEditor({ vision }: Props) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(vision.manifesto || "");
  const updateVision = useUpdateVision();

  const handleSave = () => {
    updateVision.mutate({ id: vision.id, manifesto: content }, {
      onSuccess: () => setEditing(false),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">O Meu Manifesto</h2>
        <Button variant="outline" size="sm" onClick={() => setEditing(!editing)} className="gap-2">
          {editing ? <><Eye className="h-4 w-4" />Pré-visualizar</> : <><Edit3 className="h-4 w-4" />Editar</>}
        </Button>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-6">
          {editing ? (
            <div className="space-y-4">
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} className="min-h-[400px] font-mono text-sm bg-background" placeholder="Escreve o teu manifesto em Markdown..." />
              <div className="flex justify-end">
                <Button size="sm" className="gap-2" onClick={handleSave} disabled={updateVision.isPending}>
                  {updateVision.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Guardar
                </Button>
              </div>
            </div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {content ? <ReactMarkdown>{content}</ReactMarkdown> : <p className="text-muted-foreground">Ainda não escreveste o teu manifesto. Clica em "Editar" para começar.</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
