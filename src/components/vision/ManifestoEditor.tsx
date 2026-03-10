import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Eye, Edit3, Save } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { mockVisionProfile } from "./mockData";

export function ManifestoEditor() {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(mockVisionProfile.manifesto || "");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">O Meu Manifesto</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setEditing(!editing)}
          className="gap-2"
        >
          {editing ? <><Eye className="h-4 w-4" />Pré-visualizar</> : <><Edit3 className="h-4 w-4" />Editar</>}
        </Button>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-6">
          {editing ? (
            <div className="space-y-4">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[400px] font-mono text-sm bg-background"
                placeholder="Escreve o teu manifesto em Markdown..."
              />
              <div className="flex justify-end">
                <Button size="sm" className="gap-2">
                  <Save className="h-4 w-4" />Guardar
                </Button>
              </div>
            </div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
