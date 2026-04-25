import { useState, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  Code2,
  Eye,
  EyeOff,
  ExternalLink,
  FileUp,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface CustomHtmlEditorProps {
  pageId: string;
  initialHtml?: string;
  onSave: (html: string) => void;
}

export function CustomHtmlEditor({ pageId, initialHtml = "", onSave }: CustomHtmlEditorProps) {
  const [html, setHtml] = useState(initialHtml);
  const [previewMode, setPreviewMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [charCount, setCharCount] = useState(initialHtml.length);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith(".html") && !file.name.endsWith(".htm")) {
      toast.error("Ficheiro inválido", { description: "Só são aceites ficheiros .html ou .htm" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ficheiro demasiado grande", { description: "Máximo 5MB" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = (e.target?.result as string) || "";
      setHtml(content);
      setCharCount(content.length);
      toast.success("Ficheiro importado", { description: file.name });
    };
    reader.readAsText(file, "UTF-8");
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const buildPreviewUrl = async (): Promise<string | null> => {
    const { data, error } = await supabase
      .from("landing_pages")
      .select("slug, workspace_id, workspaces:workspace_id(slug)")
      .eq("id", pageId)
      .maybeSingle();
    if (error || !data) return null;
    const wsSlug = (data as { workspaces?: { slug?: string | null } | null }).workspaces?.slug;
    const pageSlug = (data as { slug?: string | null }).slug;
    if (!wsSlug || !pageSlug) return null;
    return `/p/${wsSlug}/${pageSlug}`;
  };

  const openPreview = async () => {
    const url = await buildPreviewUrl();
    if (!url) {
      toast.error("Não foi possível abrir a pré-visualização", {
        description: "A página tem de ter slug e workspace definidos.",
      });
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleSave = async (openAfter = false) => {
    if (!html.trim()) {
      toast.error("HTML vazio", { description: "Adiciona conteúdo antes de guardar" });
      return;
    }
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("landing_pages")
        .update({
          custom_html: html,
          page_type: "custom_html",
          custom_html_updated_at: new Date().toISOString(),
        } as never)
        .eq("id", pageId);
      if (error) throw error;
      onSave(html);
      await queryClient.invalidateQueries({ queryKey: ["landing-page", pageId] });
      await queryClient.invalidateQueries({ queryKey: ["landing-pages"] });
      toast.success("HTML guardado com sucesso", { description: "A página está actualizada." });
      if (openAfter) {
        await openPreview();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error("Erro ao guardar", { description: message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = () => {
    if (confirm("Tens a certeza que queres limpar todo o HTML?")) {
      setHtml("");
      setCharCount(0);
    }
  };

  const kb = (charCount / 1024).toFixed(1);
  const hasContent = html.trim().length > 0;
  const lineCount = html ? html.split("\n").length : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Code2 className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Custom HTML</h3>
          {hasContent && (
            <Badge variant="secondary" className="text-[10px]">
              {kb} KB · {lineCount} linhas
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {hasContent && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewMode(!previewMode)}
              className="gap-1"
            >
              {previewMode ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {previewMode ? "Editor" : "Preview"}
            </Button>
          )}
          {hasContent && (
            <Button variant="outline" size="sm" onClick={handleClear} className="gap-1 text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {hasContent ? (
        <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4" />
          HTML carregado — clica em Guardar para publicar as alterações.
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          <AlertCircle className="h-4 w-4" />
          Sem HTML. Importa um ficheiro ou cola o código abaixo.
        </div>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
          isDragging
            ? "border-primary bg-primary/10"
            : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30"
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".html,.htm,text/html"
          className="hidden"
          onChange={handleFileInput}
        />
        <FileUp className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm font-medium">Arrasta o ficheiro .html aqui ou clica para seleccionar</p>
        <p className="text-xs text-muted-foreground mt-1">Suporta .html e .htm · Máximo 5MB</p>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        <span>ou cola o HTML directamente</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {previewMode ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Eye className="h-3.5 w-3.5" /> Preview (sandbox)
          </div>
          <iframe
            srcDoc={html}
            sandbox="allow-scripts"
            className="w-full min-h-[400px] rounded border border-border bg-white"
            title="Preview"
          />
        </div>
      ) : (
        <Textarea
          value={html}
          onChange={(e) => {
            setHtml(e.target.value);
            setCharCount(e.target.value.length);
          }}
          placeholder={`<!DOCTYPE html>\n<html lang="pt">\n<head>\n  <meta charset="UTF-8">\n  <title>Landing page</title>\n</head>\n<body>\n  <!-- Cola aqui o teu HTML completo -->\n</body>\n</html>`}
          className="font-mono text-xs min-h-[400px] resize-y bg-muted/30"
          spellCheck={false}
        />
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          onClick={() => handleSave(false)}
          disabled={!hasContent || isSaving}
          className="flex-1 gap-2"
          size="lg"
        >
          <Upload className="h-4 w-4" />
          {isSaving ? "A guardar..." : "Guardar HTML"}
        </Button>
        <Button
          onClick={() => handleSave(true)}
          disabled={!hasContent || isSaving}
          variant="secondary"
          className="gap-2"
          size="lg"
        >
          <ExternalLink className="h-4 w-4" />
          Guardar e pré-visualizar
        </Button>
        {hasContent && (
          <Button
            onClick={openPreview}
            disabled={isSaving}
            variant="outline"
            className="gap-2"
            size="lg"
            title="Abrir página pública"
          >
            <Eye className="h-4 w-4" />
            Abrir /p/...
          </Button>
        )}
      </div>

      <div className="rounded-md bg-muted/50 border border-border p-3 text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">💡 Dicas</p>
        <p>• O HTML é servido tal como está — inclui todos os teus estilos e scripts</p>
        <p>
          • Usa <code className="bg-muted px-1 rounded">{"{{workspace_id}}"}</code> no HTML para
          injecção dinâmica do workspace
        </p>
      </div>
    </div>
  );
}
