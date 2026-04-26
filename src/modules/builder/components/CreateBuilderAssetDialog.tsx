import { useRef, useState } from "react";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { extractZipHtml } from "../lib/extractZipHtml";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, ClipboardPaste, Upload, Link2, Sparkles, Layout } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { BUILDER_ASSET_TYPES, type BuilderAssetType } from "../types";
import { useCreateBuilderAsset } from "../hooks/useBuilderAssets";
import { BuilderPreviewFrame } from "./BuilderPreviewFrame";

const createSchema = z.object({
  name: z.string().trim().min(2, "Nome demasiado curto").max(160, "Máx. 160 caracteres"),
  type: z.enum(["site", "landing", "funnel", "form", "newsletter"]),
  description: z.string().trim().max(1000).optional(),
  html: z.string().trim().min(10, "HTML demasiado curto").max(2_000_000, "HTML demasiado grande"),
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: BuilderAssetType;
}

export function CreateBuilderAssetDialog({ open, onOpenChange, defaultType = "landing" }: Props) {
  const navigate = useNavigate();
  const create = useCreateBuilderAsset();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState<BuilderAssetType>(defaultType);
  const [description, setDescription] = useState("");
  const [html, setHtml] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<"paste" | "upload" | "url">("paste");

  // Upload
  const [uploading, setUploading] = useState(false);
  const [uploadInfo, setUploadInfo] = useState<string | null>(null);

  // URL import
  const [urlValue, setUrlValue] = useState("");
  const [importingUrl, setImportingUrl] = useState(false);

  const reset = () => {
    setName("");
    setType(defaultType);
    setDescription("");
    setHtml("");
    setErrors({});
    setTab("paste");
    setUploading(false);
    setUploadInfo(null);
    setUrlValue("");
    setImportingUrl(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFile = async (file: File) => {
    setErrors({});
    setUploading(true);
    setUploadInfo(null);
    try {
      const lower = file.name.toLowerCase();
      const isZip = lower.endsWith(".zip") || file.type === "application/zip";
      const isHtml = lower.endsWith(".html") || lower.endsWith(".htm") || file.type === "text/html";
      const isMjml = lower.endsWith(".mjml");

      if (file.size > 10 * 1024 * 1024) {
        throw new Error("Ficheiro demasiado grande (máx. 10 MB)");
      }

      if (isZip) {
        const bundle = await extractZipHtml(file);
        setHtml(bundle.html);
        setUploadInfo(`ZIP importado · entry ${bundle.entryName} · ${bundle.files} ficheiros`);
      } else if (isHtml || isMjml) {
        const text = await file.text();
        setHtml(text);
        setUploadInfo(
          isMjml
            ? `MJML carregado (${(file.size / 1024).toFixed(1)} KB) — será tratado como HTML`
            : `HTML carregado (${(file.size / 1024).toFixed(1)} KB)`,
        );
      } else {
        throw new Error("Formato não suportado. Usa .html, .zip ou .mjml");
      }

      if (!name.trim()) setName(file.name.replace(/\.[^.]+$/, "").slice(0, 160));
      setTab("paste"); // foca o painel onde se vê o resultado
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Falha ao ler ficheiro";
      toast({ title: "Upload falhou", description: msg, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleImportUrl = async () => {
    setErrors({});
    const v = urlValue.trim();
    if (!/^https?:\/\//i.test(v)) {
      setErrors({ url: "URL deve começar por http:// ou https://" });
      return;
    }
    setImportingUrl(true);
    try {
      const { data, error } = await supabase.functions.invoke("builder-import-url", {
        body: { url: v },
      });
      if (error) throw error;
      const payload = data as { html?: string; title?: string | null; error?: string };
      if (payload?.error) throw new Error(payload.error);
      if (!payload?.html) throw new Error("Resposta vazia");
      setHtml(payload.html);
      if (!name.trim() && payload.title) setName(payload.title.slice(0, 160));
      toast({ title: "Página importada", description: "Conteúdo pronto para revisão." });
      setTab("paste");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      toast({ title: "Import falhou", description: msg, variant: "destructive" });
    } finally {
      setImportingUrl(false);
    }
  };

  const handleSubmit = async () => {
    const parsed = createSchema.safeParse({ name, type, description, html });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        fieldErrors[i.path.join(".")] = i.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    try {
      const asset = await create.mutateAsync({
        name: parsed.data.name,
        type: parsed.data.type,
        description: parsed.data.description,
        html: parsed.data.html,
      });
      toast({
        title: "Asset criado",
        description: `"${asset.name}" foi guardado como rascunho.`,
      });
      reset();
      onOpenChange(false);
      navigate(`/dashboard/builder/${asset.id}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      toast({ title: "Não foi possível criar", description: msg, variant: "destructive" });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Criar novo asset</DialogTitle>
          <DialogDescription>
            Constrói sites, landings, funis, formulários ou newsletters a partir de várias fontes.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="paste" className="gap-2">
              <ClipboardPaste className="h-4 w-4" /> Colar HTML
            </TabsTrigger>
            <TabsTrigger value="upload" className="gap-2">
              <Upload className="h-4 w-4" /> Upload
            </TabsTrigger>
            <TabsTrigger value="url" className="gap-2">
              <Link2 className="h-4 w-4" /> URL
            </TabsTrigger>
            <TabsTrigger value="templates" disabled className="gap-2">
              <Layout className="h-4 w-4" /> Templates
            </TabsTrigger>
            <TabsTrigger value="ai" disabled className="gap-2">
              <Sparkles className="h-4 w-4" /> IA
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="mt-4">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) handleFile(f);
              }}
              className="border-2 border-dashed rounded-lg p-8 text-center bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium">Arrasta um ficheiro ou clica para escolher</p>
              <p className="text-sm text-muted-foreground mt-1">
                Formatos suportados: <code>.html</code>, <code>.zip</code>, <code>.mjml</code> (máx. 10 MB)
              </p>
              {uploading && (
                <p className="text-xs text-muted-foreground mt-3 flex items-center justify-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" /> A processar…
                </p>
              )}
              {uploadInfo && !uploading && (
                <p className="text-xs text-primary mt-3">{uploadInfo}</p>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".html,.htm,.zip,.mjml,text/html,application/zip"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Após carregar, podes rever e ajustar o resultado no separador <strong>Colar HTML</strong>.
            </p>
          </TabsContent>

          <TabsContent value="url" className="mt-4">
            <div className="space-y-3 max-w-2xl">
              <div>
                <Label htmlFor="builder-url">URL pública</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="builder-url"
                    value={urlValue}
                    onChange={(e) => setUrlValue(e.target.value)}
                    placeholder="https://exemplo.com/landing"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleImportUrl();
                    }}
                  />
                  <Button onClick={handleImportUrl} disabled={importingUrl}>
                    {importingUrl ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Importar"
                    )}
                  </Button>
                </div>
                {errors.url && <p className="text-xs text-destructive mt-1">{errors.url}</p>}
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Apenas páginas públicas (sem login).</p>
                <p>• Limite 5 MB e 15s de timeout.</p>
                <p>• Scripts são removidos; URLs relativas são absolutizadas.</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="paste" className="flex-1 overflow-hidden mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
              <div className="flex flex-col gap-3 overflow-y-auto pr-1">
                <div>
                  <Label htmlFor="builder-name">Nome *</Label>
                  <Input
                    id="builder-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Landing Black Friday 2026"
                    maxLength={160}
                  />
                  {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
                </div>

                <div>
                  <Label htmlFor="builder-type">Tipo *</Label>
                  <Select value={type} onValueChange={(v) => setType(v as BuilderAssetType)}>
                    <SelectTrigger id="builder-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BUILDER_ASSET_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          <div className="flex flex-col">
                            <span className="font-medium">{t.label}</span>
                            <span className="text-xs text-muted-foreground">{t.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="builder-desc">Descrição</Label>
                  <Textarea
                    id="builder-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    maxLength={1000}
                    placeholder="Para uso interno (opcional)"
                  />
                </div>

                <div className="flex-1 flex flex-col">
                  <Label htmlFor="builder-html">HTML *</Label>
                  <Textarea
                    id="builder-html"
                    value={html}
                    onChange={(e) => setHtml(e.target.value)}
                    placeholder="<html><body>...</body></html>"
                    className="flex-1 font-mono text-xs min-h-[280px]"
                  />
                  {errors.html && <p className="text-xs text-destructive mt-1">{errors.html}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    Scripts e handlers inline são removidos automaticamente ao guardar.
                  </p>
                </div>
              </div>

              <div className="hidden lg:block min-h-0">
                <BuilderPreviewFrame html={html} />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={create.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={create.isPending}>
            {create.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Criar rascunho
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
