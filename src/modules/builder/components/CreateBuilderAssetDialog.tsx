import { useState } from "react";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
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

  const [name, setName] = useState("");
  const [type, setType] = useState<BuilderAssetType>(defaultType);
  const [description, setDescription] = useState("");
  const [html, setHtml] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const reset = () => {
    setName("");
    setType(defaultType);
    setDescription("");
    setHtml("");
    setErrors({});
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
      const asset = await create.mutateAsync(parsed.data);
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

        <Tabs defaultValue="paste" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="paste" className="gap-2">
              <ClipboardPaste className="h-4 w-4" /> Colar HTML
            </TabsTrigger>
            <TabsTrigger value="upload" disabled className="gap-2">
              <Upload className="h-4 w-4" /> Upload
            </TabsTrigger>
            <TabsTrigger value="url" disabled className="gap-2">
              <Link2 className="h-4 w-4" /> URL
            </TabsTrigger>
            <TabsTrigger value="templates" disabled className="gap-2">
              <Layout className="h-4 w-4" /> Templates
            </TabsTrigger>
            <TabsTrigger value="ai" disabled className="gap-2">
              <Sparkles className="h-4 w-4" /> IA
            </TabsTrigger>
          </TabsList>

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
                    Scripts e handlers inline são removidos automaticamente.
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
