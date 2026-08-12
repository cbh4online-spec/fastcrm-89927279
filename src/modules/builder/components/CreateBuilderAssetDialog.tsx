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
import { Loader2, ClipboardPaste, Upload, Link2, Sparkles, Layout, Globe2, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { BUILDER_ASSET_TYPES, type BuilderAssetType } from "../types";
import { useCreateBuilderAsset } from "../hooks/useBuilderAssets";
import { useSiteClone } from "../hooks/useSiteClone";
import { BuilderPreviewFrame } from "./BuilderPreviewFrame";
import { BUILDER_TEMPLATES, type BuilderTemplate } from "../lib/templates";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";

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
  const [tab, setTab] = useState<"paste" | "upload" | "url" | "clone" | "templates" | "ai">("paste");

  // Site clone
  const siteClone = useSiteClone();
  const [cloneUrl, setCloneUrl] = useState("");
  const [cloneIncludeSub, setCloneIncludeSub] = useState(false);
  const [cloneKeepScripts, setCloneKeepScripts] = useState(false);
  const [cloneSelected, setCloneSelected] = useState<Set<string>>(new Set());
  const [cloneName, setCloneName] = useState("");
  const [cloneExtraPages, setCloneExtraPages] = useState<string[]>([]);
  const [manualUrls, setManualUrls] = useState("");

  // Upload
  const [uploading, setUploading] = useState(false);
  const [uploadInfo, setUploadInfo] = useState<string | null>(null);

  // IA
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiTone, setAiTone] = useState("persuasivo");
  const [aiLang, setAiLang] = useState("pt");
  const [aiBusy, setAiBusy] = useState(false);

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
    setAiPrompt("");
    setAiTone("persuasivo");
    setAiLang("pt");
    setAiBusy(false);
    setCloneUrl("");
    setCloneIncludeSub(false);
    setCloneKeepScripts(false);
    setCloneSelected(new Set());
    setCloneName("");
    setCloneExtraPages([]);
    setManualUrls("");
    siteClone.reset();
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

  const handleGenerateAI = async () => {
    const prompt = aiPrompt.trim();
    if (prompt.length < 10) {
      setErrors({ ai: "Descreve com mais detalhe o que queres criar (mín. 10 caracteres)" });
      return;
    }
    setErrors({});
    setAiBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("builder-ai", {
        body: {
          mode: type === "newsletter" ? "generate_email" : "generate_page",
          prompt,
          tone: aiTone,
          lang: aiLang,
          assetType: type,
        },
      });
      if (error) throw new Error(error.message);
      const payload = data as { html?: string; error?: string; message?: string };
      if (payload?.error) throw new Error(payload.message || payload.error);
      if (!payload?.html) throw new Error("A IA não devolveu HTML");
      setHtml(payload.html);
      if (!name.trim()) setName(prompt.slice(0, 60));
      setTab("paste");
      toast({ title: "Página gerada", description: "Revê o resultado antes de criar." });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      toast({ title: "Geração falhou", description: msg, variant: "destructive" });
    } finally {
      setAiBusy(false);
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
          <TabsList className="grid grid-cols-6 w-full">
            <TabsTrigger value="paste" className="gap-2">
              <ClipboardPaste className="h-4 w-4" /> Colar HTML
            </TabsTrigger>
            <TabsTrigger value="upload" className="gap-2">
              <Upload className="h-4 w-4" /> Upload
            </TabsTrigger>
            <TabsTrigger value="url" className="gap-2">
              <Link2 className="h-4 w-4" /> URL
            </TabsTrigger>
            <TabsTrigger value="clone" className="gap-2">
              <Globe2 className="h-4 w-4" /> Clonar site
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <Layout className="h-4 w-4" /> Templates
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-2">
              <Sparkles className="h-4 w-4" /> IA
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ai" className="mt-4">
            <div className="space-y-4 max-w-2xl">
              <div>
                <Label htmlFor="ai-prompt">Descreve o que queres criar</Label>
                <Textarea
                  id="ai-prompt"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  rows={6}
                  className="mt-1"
                  placeholder="Ex: landing page para uma clínica dentária em Lisboa, com hero, 3 benefícios, testemunhos, FAQ e formulário de marcação."
                  disabled={aiBusy}
                />
                {errors.ai && <p className="text-xs text-destructive mt-1">{errors.ai}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tom</Label>
                  <Select value={aiTone} onValueChange={setAiTone} disabled={aiBusy}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="persuasivo">Persuasivo</SelectItem>
                      <SelectItem value="profissional">Profissional</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="direto">Direto</SelectItem>
                      <SelectItem value="entusiasta">Entusiasta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Idioma</Label>
                  <Select value={aiLang} onValueChange={setAiLang} disabled={aiBusy}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pt">Português (PT)</SelectItem>
                      <SelectItem value="en">Inglês</SelectItem>
                      <SelectItem value="es">Espanhol</SelectItem>
                      <SelectItem value="fr">Francês</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleGenerateAI} disabled={aiBusy}>
                {aiBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Gerar com IA
              </Button>
              <p className="text-xs text-muted-foreground">
                Depois de criar, podes continuar a conversar com a IA dentro do editor para ajustar a página.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="templates" className="flex-1 overflow-hidden mt-4">
            <ScrollArea className="h-full pr-2">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {BUILDER_TEMPLATES.filter((t) => t.type === type || type === undefined).map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => {
                      setHtml(tpl.html);
                      if (!name.trim()) setName(tpl.name);
                      setType(tpl.type);
                      setTab("paste");
                      toast({ title: "Template aplicado", description: `"${tpl.name}" carregado.` });
                    }}
                    className="text-left border rounded-xl overflow-hidden hover:border-primary/60 hover:shadow-md transition-all flex flex-col bg-card"
                  >
                    <div className="aspect-[16/10] bg-muted/40 border-b overflow-hidden relative">
                      <iframe
                        srcDoc={tpl.html}
                        title={tpl.name}
                        sandbox=""
                        className="w-[200%] h-[200%] origin-top-left scale-50 pointer-events-none border-0"
                      />
                    </div>
                    <div className="p-3 flex-1 flex flex-col gap-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-medium text-sm">{tpl.name}</h3>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {BUILDER_ASSET_TYPES.find((b) => b.value === tpl.type)?.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{tpl.description}</p>
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground text-center mt-4">
                A escolher um template carrega o HTML para o separador "Colar HTML" para revisão antes de criar.
              </p>
            </ScrollArea>
          </TabsContent>

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

          <TabsContent value="clone" className="flex-1 overflow-hidden mt-4">
            <ScrollArea className="h-full pr-2">
              <div className="space-y-4 max-w-3xl">
                <div className="space-y-2">
                  <Label htmlFor="clone-url">URL do site a clonar</Label>
                  <div className="flex gap-2">
                    <Input
                      id="clone-url"
                      value={cloneUrl}
                      onChange={(e) => setCloneUrl(e.target.value)}
                      placeholder="https://exemplo.com"
                      disabled={siteClone.discovering || siteClone.cloning}
                    />
                    <Button
                      onClick={() =>
                        siteClone
                          .discover(cloneUrl.trim(), cloneIncludeSub)
                          .then((d) => {
                            setCloneSelected(new Set(d.pages));
                            if (!cloneName) setCloneName(d.host);
                          })
                          .catch((err) =>
                            toast({
                              title: "Falha na descoberta",
                              description: err instanceof Error ? err.message : String(err),
                              variant: "destructive",
                            }),
                          )
                      }
                      disabled={!cloneUrl.trim() || siteClone.discovering || siteClone.cloning}
                    >
                      {siteClone.discovering ? <Loader2 className="h-4 w-4 animate-spin" /> : "Descobrir páginas"}
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="clone-subdomains"
                      checked={cloneIncludeSub}
                      onCheckedChange={(c) => setCloneIncludeSub(!!c)}
                      disabled={siteClone.discovering || siteClone.cloning}
                    />
                    <label htmlFor="clone-subdomains" className="text-xs text-muted-foreground cursor-pointer">
                      Incluir subdomínios (blog., shop., …)
                    </label>
                </div>

                {/* Lista manual de URLs (funciona com ou sem descoberta automática — útil p/ SPAs) */}
                <div className="space-y-2 border rounded-lg p-3 bg-muted/10">
                  <Label htmlFor="clone-manual" className="text-xs font-medium">
                    Lista manual de URLs (uma por linha)
                  </Label>
                  <Textarea
                    id="clone-manual"
                    value={manualUrls}
                    onChange={(e) => setManualUrls(e.target.value)}
                    rows={4}
                    placeholder={"https://exemplo.com/sobre\nhttps://exemplo.com/contactos\nhttps://exemplo.com/blog"}
                    className="font-mono text-xs"
                    disabled={siteClone.cloning}
                  />
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] text-muted-foreground">
                      Útil para sites de página única (SPA) ou quando a descoberta automática não encontra tudo. Fragmentos <code>#secção</code> são tratados como páginas separadas (cada secção fica num ficheiro próprio).
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!manualUrls.trim() || siteClone.cloning}
                      onClick={() => {
                        const lines = manualUrls
                          .split(/\r?\n/)
                          .map((l) => l.trim())
                          .filter(Boolean);
                        const valid: string[] = [];
                        const seen = new Set<string>([
                          ...(siteClone.discovery?.pages ?? []),
                          ...cloneExtraPages,
                        ]);
                        for (const l of lines) {
                          try {
                            const u = new URL(l);
                            if (!["http:", "https:"].includes(u.protocol)) continue;
                            const clean = `${u.origin}${u.pathname}${u.search}${u.hash}`;
                            if (seen.has(clean)) continue;
                            seen.add(clean);
                            valid.push(clean);
                          } catch {
                            /* ignora linha inválida */
                          }
                        }
                        if (valid.length === 0) {
                          toast({
                            title: "Nenhuma URL nova",
                            description: "Verifica se começam por http:// ou https:// e não estão duplicadas.",
                            variant: "destructive",
                          });
                          return;
                        }
                        setCloneExtraPages((p) => [...p, ...valid]);
                        setCloneSelected((prev) => {
                          const next = new Set(prev);
                          for (const v of valid) next.add(v);
                          return next;
                        });
                        setManualUrls("");
                        if (!cloneName) {
                          try {
                            setCloneName(new URL(valid[0]).hostname);
                          } catch { /* ignore */ }
                        }
                        toast({
                          title: `${valid.length} URL${valid.length > 1 ? "s" : ""} adicionada${valid.length > 1 ? "s" : ""}`,
                          description: "Já estão selecionadas para clone.",
                        });
                      }}
                    >
                      Adicionar à lista
                    </Button>
                  </div>
                </div>
                </div>

                {/* Painel manual-only: quando há URLs adicionadas mas ainda sem descoberta */}
                {!siteClone.discovery && cloneExtraPages.length > 0 && (
                  <div className="space-y-3 border rounded-lg p-4 bg-muted/20">
                    <h3 className="font-medium text-sm flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      {cloneExtraPages.length} URL{cloneExtraPages.length > 1 ? "s" : ""} pronta{cloneExtraPages.length > 1 ? "s" : ""} a clonar
                    </h3>

                    <div>
                      <Label htmlFor="clone-name-manual" className="text-xs">Nome do site</Label>
                      <Input
                        id="clone-name-manual"
                        value={cloneName}
                        onChange={(e) => setCloneName(e.target.value)}
                        placeholder="meu-site"
                        maxLength={160}
                        className="mt-1"
                      />
                    </div>

                    <div className="max-h-48 overflow-y-auto border rounded-md bg-background divide-y">
                      {cloneExtraPages.map((p) => (
                        <div key={p} className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs">
                          <span className="truncate font-mono">{p}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs"
                            onClick={() => {
                              setCloneExtraPages((prev) => prev.filter((x) => x !== p));
                              setCloneSelected((prev) => {
                                const next = new Set(prev);
                                next.delete(p);
                                return next;
                              });
                            }}
                          >
                            Remover
                          </Button>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="clone-keep-scripts-manual"
                        checked={cloneKeepScripts}
                        onCheckedChange={(c) => setCloneKeepScripts(!!c)}
                      />
                      <label htmlFor="clone-keep-scripts-manual" className="text-xs text-muted-foreground cursor-pointer">
                        Manter scripts JS originais (não recomendado)
                      </label>
                    </div>

                    <Button
                      className="w-full"
                      disabled={cloneExtraPages.length === 0 || siteClone.cloning}
                      onClick={async () => {
                        try {
                          const sourceUrl = (() => {
                            try { return new URL(cloneExtraPages[0]).origin; } catch { return cloneExtraPages[0]; }
                          })();
                          const res = await siteClone.startClone({
                            sourceUrl,
                            pages: cloneExtraPages,
                            name: cloneName.trim() || sourceUrl,
                            keepScripts: cloneKeepScripts,
                            includeSubdomains: cloneIncludeSub,
                          });
                          toast({
                            title: "Clone iniciado",
                            description: `${res.pages_total} páginas em processamento.`,
                          });
                        } catch (err) {
                          toast({
                            title: "Falha ao iniciar clone",
                            description: err instanceof Error ? err.message : String(err),
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      {siteClone.cloning ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          A clonar…
                        </>
                      ) : (
                        `Clonar ${cloneExtraPages.length} página${cloneExtraPages.length > 1 ? "s" : ""}`
                      )}
                    </Button>
                  </div>
                )}

                {siteClone.discovery && (
                  <div className="space-y-3 border rounded-lg p-4 bg-muted/20">
                    <h3 className="font-medium text-sm flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      {siteClone.discovery.pagesCount} páginas em <code>{siteClone.discovery.host}</code>
                    </h3>

                    {(siteClone.discovery.branding.colors.length > 0 ||
                      siteClone.discovery.branding.fonts.length > 0 ||
                      siteClone.discovery.branding.logo) && (
                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        {siteClone.discovery.branding.logo && (
                          <img
                            src={siteClone.discovery.branding.logo}
                            alt="logo"
                            className="h-8 w-auto object-contain border rounded bg-background p-1"
                          />
                        )}
                        {siteClone.discovery.branding.colors.slice(0, 6).map((c) => (
                          <div key={c} className="h-6 w-6 rounded border" style={{ background: c }} title={c} />
                        ))}
                        {siteClone.discovery.branding.fonts.slice(0, 3).map((f) => (
                          <Badge key={f} variant="outline">{f}</Badge>
                        ))}
                      </div>
                    )}

                    <div>
                      <Label htmlFor="clone-name" className="text-xs">Nome do site</Label>
                      <Input
                        id="clone-name"
                        value={cloneName}
                        onChange={(e) => setCloneName(e.target.value)}
                        placeholder={siteClone.discovery.host}
                        maxLength={160}
                        className="mt-1"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">
                          Páginas a clonar ({cloneSelected.size}/{siteClone.discovery.pages.length})
                        </Label>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => setCloneSelected(new Set(siteClone.discovery!.pages))}>
                            Todas
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setCloneSelected(new Set())}>
                            Nenhuma
                          </Button>
                        </div>
                      </div>
                      <div className="max-h-56 overflow-y-auto border rounded-md bg-background divide-y">
                        {siteClone.discovery.pages.map((p) => {
                          const checked = cloneSelected.has(p);
                          return (
                            <label key={p} className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted/50 cursor-pointer">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(c) => {
                                  setCloneSelected((prev) => {
                                    const next = new Set(prev);
                                    if (c) next.add(p);
                                    else next.delete(p);
                                    return next;
                                  });
                                }}
                              />
                              <span className="truncate font-mono">{p}</span>
                            </label>
                          );
                        })}
                      </div>
                      {cloneSelected.size > 50 && (
                        <p className="text-xs text-amber-600 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Mais de 50 páginas pode demorar vários minutos.
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="clone-keep-scripts"
                        checked={cloneKeepScripts}
                        onCheckedChange={(c) => setCloneKeepScripts(!!c)}
                      />
                      <label htmlFor="clone-keep-scripts" className="text-xs text-muted-foreground cursor-pointer">
                        Manter scripts JS originais (não recomendado)
                      </label>
                    </div>

                    <Button
                      className="w-full"
                      disabled={cloneSelected.size === 0 || siteClone.cloning}
                      onClick={async () => {
                        try {
                          const res = await siteClone.startClone({
                            sourceUrl: siteClone.discovery!.sourceUrl,
                            pages: Array.from(cloneSelected),
                            name: cloneName.trim() || siteClone.discovery!.host,
                            keepScripts: cloneKeepScripts,
                            includeSubdomains: cloneIncludeSub,
                            designTokens: {
                              colors: siteClone.discovery!.branding.colors,
                              fonts: siteClone.discovery!.branding.fonts,
                              logo: siteClone.discovery!.branding.logo,
                            },
                          });
                          toast({
                            title: "Clone iniciado",
                            description: `${res.pages_total} páginas em processamento.`,
                          });
                        } catch (err) {
                          toast({
                            title: "Falha ao iniciar clone",
                            description: err instanceof Error ? err.message : String(err),
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      {siteClone.cloning ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          A clonar…
                        </>
                      ) : (
                        `Clonar ${cloneSelected.size} páginas`
                      )}
                    </Button>
                  </div>
                )}

                {siteClone.progress && siteClone.siteId && (
                  <div className="space-y-2 border rounded-lg p-4 bg-card">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Progresso do clone</span>
                      <Badge variant={siteClone.progress.status === "completed" ? "default" : "secondary"}>
                        {siteClone.progress.status}
                      </Badge>
                    </div>
                    <Progress
                      value={
                        siteClone.progress.pages_total > 0
                          ? ((siteClone.progress.pages_done + siteClone.progress.pages_failed) /
                              siteClone.progress.pages_total) *
                            100
                          : 0
                      }
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        {siteClone.progress.pages_done}/{siteClone.progress.pages_total} concluídas
                        {siteClone.progress.pages_failed > 0 && ` · ${siteClone.progress.pages_failed} falharam`}
                      </span>
                      {siteClone.assetId && siteClone.progress.status === "completed" && (
                        <Button
                          size="sm"
                          variant="link"
                          className="h-auto p-0"
                          onClick={() => {
                            onOpenChange(false);
                            navigate(`/dashboard/builder/${siteClone.assetId}`);
                          }}
                        >
                          Abrir no editor →
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• Faz scrape de cada página, descarrega imagens/CSS para o teu workspace e re-escreve links internos.</p>
                  <p>• Páginas SPA podem perder interactividade.</p>
                  <p>• Limite recomendado: 50 páginas por clone.</p>
                </div>
              </div>
            </ScrollArea>
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
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={create.isPending || siteClone.cloning}>
            Cancelar
          </Button>
          {tab === "clone" ? (
            <Button
              disabled={
                siteClone.cloning ||
                siteClone.discovering ||
                (cloneSelected.size === 0 && cloneExtraPages.length === 0)
              }
              onClick={async () => {
                try {
                  const pages =
                    cloneSelected.size > 0
                      ? Array.from(cloneSelected)
                      : cloneExtraPages;
                  if (pages.length === 0) {
                    toast({
                      title: "Sem páginas para clonar",
                      description: "Descobre páginas ou cola URLs na lista manual.",
                      variant: "destructive",
                    });
                    return;
                  }
                  const sourceUrl =
                    siteClone.discovery?.sourceUrl ??
                    (() => {
                      try { return new URL(pages[0]).origin; } catch { return pages[0]; }
                    })();
                  const fallbackName =
                    siteClone.discovery?.host ??
                    (() => {
                      try { return new URL(pages[0]).hostname; } catch { return "site"; }
                    })();
                  const res = await siteClone.startClone({
                    sourceUrl,
                    pages,
                    name: cloneName.trim() || fallbackName,
                    keepScripts: cloneKeepScripts,
                    includeSubdomains: cloneIncludeSub,
                    designTokens: siteClone.discovery
                      ? {
                          colors: siteClone.discovery.branding.colors,
                          fonts: siteClone.discovery.branding.fonts,
                          logo: siteClone.discovery.branding.logo,
                        }
                      : undefined,
                  });
                  toast({
                    title: "Clone iniciado",
                    description: `${res.pages_total} página${(res.pages_total ?? 0) > 1 ? "s" : ""} em processamento.`,
                  });
                } catch (err) {
                  toast({
                    title: "Falha ao iniciar clone",
                    description: err instanceof Error ? err.message : String(err),
                    variant: "destructive",
                  });
                }
              }}
            >
              {siteClone.cloning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  A clonar…
                </>
              ) : (
                `Clonar ${cloneSelected.size > 0 ? cloneSelected.size : cloneExtraPages.length} página${(cloneSelected.size > 0 ? cloneSelected.size : cloneExtraPages.length) > 1 ? "s" : ""}`
              )}
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={create.isPending}>
              {create.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar rascunho
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
