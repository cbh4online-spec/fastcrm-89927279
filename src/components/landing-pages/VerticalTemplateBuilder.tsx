import { useState, useCallback, useMemo } from "react";
import { ArrowLeft, Eye, Save, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  useCreateVerticalTemplate,
  useUpdateVerticalTemplate,
  useVerticalTemplate,
  type VerticalTemplateRow,
} from "@/hooks/useVerticalTemplates";
import { VerticalLandingTemplate } from "@/components/vertical-landing/VerticalLandingTemplate";
import type { VerticalConfig } from "@/config/verticalConfigs";

interface Props {
  templateId?: string | null;
  onBack: () => void;
}

const ICON_OPTIONS = [
  "Users", "Zap", "MessageSquare", "Brain", "BarChart3", "Clock",
  "Shield", "DollarSign", "Target", "Mail", "Star", "Package",
];

const defaultForm = (): FormData => ({
  nome: "",
  slug: "",
  dor_principal: "",
  resultado_prometido: "",
  dores: ["", "", "", ""],
  modulos_ativos: [
    { nome: "", desc: "", icon: "Users" },
    { nome: "", desc: "", icon: "Zap" },
    { nome: "", desc: "", icon: "Brain" },
  ],
  antes_depois: { antes: ["", "", "", ""], depois: ["", "", "", ""] },
  roi_exemplo: { clientes_extra: 10, valor_medio: 500, periodo: "mês" },
  cores: { primaria: "hsl(221, 83%, 53%)", accent: "hsl(250, 83%, 60%)" },
  cta_principal: "Agendar Diagnóstico Estratégico",
  cta_secundario: "Receber Plano Personalizado",
  ai_persona_nome: "",
  seo: { title: "", description: "", canonical: "" },
});

type FormData = Omit<VerticalTemplateRow, "id" | "workspace_id" | "created_at" | "updated_at" | "created_by" | "is_published">;

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function VerticalTemplateBuilder({ templateId, onBack }: Props) {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const { data: existing } = useVerticalTemplate(templateId ?? null);
  const createMut = useCreateVerticalTemplate();
  const updateMut = useUpdateVerticalTemplate();

  const [form, setForm] = useState<FormData>(() => {
    if (existing) {
      const { id, workspace_id, created_at, updated_at, created_by, is_published, ...rest } = existing;
      return rest;
    }
    return defaultForm();
  });
  const [preview, setPreview] = useState(false);
  const [tab, setTab] = useState("identidade");

  // Sync existing data when loaded
  const [loadedId, setLoadedId] = useState<string | null>(null);
  if (existing && existing.id !== loadedId) {
    const { id, workspace_id, created_at, updated_at, created_by, is_published, ...rest } = existing;
    setForm(rest);
    setLoadedId(existing.id);
  }

  const updateField = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateNome = useCallback((nome: string) => {
    setForm((prev) => ({
      ...prev,
      nome,
      slug: prev.slug || slugify(nome),
      ai_persona_nome: prev.ai_persona_nome || `AI CRM ${nome} Specialist`,
      seo: {
        ...prev.seo,
        title: prev.seo.title || `FastCRM para ${nome} — Sistema com IA`,
        description: prev.seo.description || `CRM com IA para ${nome.toLowerCase()}: automações, pipeline e comunicação omnicanal.`,
      },
    }));
  }, []);

  const handleSave = async (publish = false) => {
    if (!currentWorkspace?.id) return;
    const payload = {
      ...form,
      workspace_id: currentWorkspace.id,
      created_by: user?.id ?? null,
      is_published: publish,
    };
    if (templateId) {
      await updateMut.mutateAsync({ id: templateId, ...payload });
    } else {
      await createMut.mutateAsync(payload);
    }
    onBack();
  };

  const previewConfig = useMemo((): VerticalConfig => ({
    slug: form.slug || "preview",
    nome: form.nome || "Preview",
    dor_principal: form.dor_principal,
    resultado_prometido: form.resultado_prometido,
    dores: form.dores.filter(Boolean),
    modulos_ativos: form.modulos_ativos.filter((m) => m.nome),
    antes_depois: {
      antes: form.antes_depois.antes.filter(Boolean),
      depois: form.antes_depois.depois.filter(Boolean),
    },
    roi_exemplo: form.roi_exemplo,
    cores: form.cores,
    cta_principal: form.cta_principal,
    cta_secundario: form.cta_secundario,
    ai_persona_nome: form.ai_persona_nome,
    seo: {
      title: form.seo.title || `FastCRM para ${form.nome}`,
      description: form.seo.description || "",
      canonical: form.seo.canonical || "",
    },
  }), [form]);

  if (preview) {
    return (
      <div>
        <div className="sticky top-0 z-50 bg-background border-b p-3 flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setPreview(false)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar ao Editor
          </Button>
          <Badge variant="secondary">Preview</Badge>
        </div>
        <VerticalLandingTemplate config={previewConfig} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {templateId ? "Editar Template AIDA" : "Novo Template AIDA"}
            </h1>
            <p className="text-muted-foreground text-sm">
              Crie uma landing page vertical para qualquer área de negócio
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setPreview(true)}>
            <Eye className="h-4 w-4 mr-1" /> Preview
          </Button>
          <Button variant="outline" onClick={() => handleSave(false)} disabled={createMut.isPending || updateMut.isPending}>
            <Save className="h-4 w-4 mr-1" /> Guardar
          </Button>
          <Button onClick={() => handleSave(true)} disabled={createMut.isPending || updateMut.isPending}>
            <Globe className="h-4 w-4 mr-1" /> Publicar
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-7 w-full">
          <TabsTrigger value="identidade">Identidade</TabsTrigger>
          <TabsTrigger value="dores">Dores</TabsTrigger>
          <TabsTrigger value="solucao">Solução</TabsTrigger>
          <TabsTrigger value="transformacao">Transformação</TabsTrigger>
          <TabsTrigger value="roi">ROI</TabsTrigger>
          <TabsTrigger value="aparencia">Aparência</TabsTrigger>
          <TabsTrigger value="cta-seo">CTAs & SEO</TabsTrigger>
        </TabsList>

        {/* Tab: Identidade */}
        <TabsContent value="identidade">
          <Card>
            <CardHeader><CardTitle>Identidade da Vertical</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nome da Vertical *</Label>
                  <Input
                    placeholder="Ex: Restaurantes, Ginásios, Advocacia..."
                    value={form.nome}
                    onChange={(e) => updateNome(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Slug (URL)</Label>
                  <Input
                    placeholder="restaurantes"
                    value={form.slug}
                    onChange={(e) => updateField("slug", slugify(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">URL pública: /{form.slug || "..."}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Dor Principal do Público-Alvo *</Label>
                <Textarea
                  placeholder="Ex: Perdem clientes por falta de follow-up e processos manuais"
                  value={form.dor_principal}
                  onChange={(e) => updateField("dor_principal", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Resultado Prometido *</Label>
                <Input
                  placeholder="Ex: escalar sem perder qualidade no atendimento"
                  value={form.resultado_prometido}
                  onChange={(e) => updateField("resultado_prometido", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Nome da Persona AI</Label>
                <Input
                  placeholder="Ex: AI CRM Restaurantes Specialist"
                  value={form.ai_persona_nome}
                  onChange={(e) => updateField("ai_persona_nome", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Dores */}
        <TabsContent value="dores">
          <Card>
            <CardHeader><CardTitle>4 Dores do Público-Alvo</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {form.dores.map((dor, i) => (
                <div key={i} className="space-y-1">
                  <Label>Dor {i + 1}</Label>
                  <Textarea
                    placeholder={`Descreva a dor ${i + 1} do público-alvo...`}
                    value={dor}
                    onChange={(e) => {
                      const updated = [...form.dores];
                      updated[i] = e.target.value;
                      updateField("dores", updated);
                    }}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Solução (Módulos) */}
        <TabsContent value="solucao">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Módulos Activos (até 6)</CardTitle>
                {form.modulos_ativos.length < 6 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updateField("modulos_ativos", [
                        ...form.modulos_ativos,
                        { nome: "", desc: "", icon: "Package" },
                      ])
                    }
                  >
                    + Adicionar Módulo
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {form.modulos_ativos.map((mod, i) => (
                <div key={i} className="grid gap-3 md:grid-cols-[1fr_2fr_auto_auto] items-end border rounded-lg p-3">
                  <div className="space-y-1">
                    <Label>Nome</Label>
                    <Input
                      value={mod.nome}
                      onChange={(e) => {
                        const updated = [...form.modulos_ativos];
                        updated[i] = { ...mod, nome: e.target.value };
                        updateField("modulos_ativos", updated);
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Descrição</Label>
                    <Input
                      value={mod.desc}
                      onChange={(e) => {
                        const updated = [...form.modulos_ativos];
                        updated[i] = { ...mod, desc: e.target.value };
                        updateField("modulos_ativos", updated);
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Ícone</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={mod.icon}
                      onChange={(e) => {
                        const updated = [...form.modulos_ativos];
                        updated[i] = { ...mod, icon: e.target.value };
                        updateField("modulos_ativos", updated);
                      }}
                    >
                      {ICON_OPTIONS.map((ic) => (
                        <option key={ic} value={ic}>{ic}</option>
                      ))}
                    </select>
                  </div>
                  {form.modulos_ativos.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => {
                        const updated = form.modulos_ativos.filter((_, j) => j !== i);
                        updateField("modulos_ativos", updated);
                      }}
                    >
                      ✕
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Transformação */}
        <TabsContent value="transformacao">
          <Card>
            <CardHeader><CardTitle>Antes vs Depois</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <h3 className="font-semibold text-destructive">Antes (sem FastCRM)</h3>
                  {form.antes_depois.antes.map((item, i) => (
                    <div key={i} className="space-y-1">
                      <Label>Item {i + 1}</Label>
                      <Input
                        value={item}
                        onChange={(e) => {
                          const updated = { ...form.antes_depois };
                          updated.antes = [...updated.antes];
                          updated.antes[i] = e.target.value;
                          updateField("antes_depois", updated);
                        }}
                      />
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  <h3 className="font-semibold text-primary">Depois (com FastCRM)</h3>
                  {form.antes_depois.depois.map((item, i) => (
                    <div key={i} className="space-y-1">
                      <Label>Item {i + 1}</Label>
                      <Input
                        value={item}
                        onChange={(e) => {
                          const updated = { ...form.antes_depois };
                          updated.depois = [...updated.depois];
                          updated.depois[i] = e.target.value;
                          updateField("antes_depois", updated);
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: ROI */}
        <TabsContent value="roi">
          <Card>
            <CardHeader><CardTitle>Exemplo de ROI</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Clientes Extra / {form.roi_exemplo.periodo}</Label>
                  <Input
                    type="number"
                    value={form.roi_exemplo.clientes_extra}
                    onChange={(e) =>
                      updateField("roi_exemplo", {
                        ...form.roi_exemplo,
                        clientes_extra: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor Médio (€)</Label>
                  <Input
                    type="number"
                    value={form.roi_exemplo.valor_medio}
                    onChange={(e) =>
                      updateField("roi_exemplo", {
                        ...form.roi_exemplo,
                        valor_medio: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Período</Label>
                  <Input
                    value={form.roi_exemplo.periodo}
                    onChange={(e) =>
                      updateField("roi_exemplo", {
                        ...form.roi_exemplo,
                        periodo: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm text-muted-foreground">
                  ROI estimado:{" "}
                  <span className="font-bold text-foreground">
                    +{form.roi_exemplo.clientes_extra * form.roi_exemplo.valor_medio}€/{form.roi_exemplo.periodo}
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Aparência */}
        <TabsContent value="aparencia">
          <Card>
            <CardHeader><CardTitle>Cores do Template</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Cor Primária (HSL)</Label>
                  <Input
                    placeholder="hsl(221, 83%, 53%)"
                    value={form.cores.primaria}
                    onChange={(e) =>
                      updateField("cores", { ...form.cores, primaria: e.target.value })
                    }
                  />
                  <div
                    className="h-8 rounded-md border"
                    style={{ backgroundColor: form.cores.primaria }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cor Accent (HSL)</Label>
                  <Input
                    placeholder="hsl(250, 83%, 60%)"
                    value={form.cores.accent}
                    onChange={(e) =>
                      updateField("cores", { ...form.cores, accent: e.target.value })
                    }
                  />
                  <div
                    className="h-8 rounded-md border"
                    style={{ backgroundColor: form.cores.accent }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: CTAs & SEO */}
        <TabsContent value="cta-seo">
          <Card>
            <CardHeader><CardTitle>CTAs & SEO</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>CTA Principal</Label>
                  <Input
                    value={form.cta_principal}
                    onChange={(e) => updateField("cta_principal", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>CTA Secundário</Label>
                  <Input
                    value={form.cta_secundario}
                    onChange={(e) => updateField("cta_secundario", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>SEO Title (max 60 chars)</Label>
                <Input
                  maxLength={60}
                  value={form.seo.title}
                  onChange={(e) =>
                    updateField("seo", { ...form.seo, title: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">{form.seo.title.length}/60</p>
              </div>
              <div className="space-y-2">
                <Label>Meta Description (max 160 chars)</Label>
                <Textarea
                  maxLength={160}
                  value={form.seo.description}
                  onChange={(e) =>
                    updateField("seo", { ...form.seo, description: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">{form.seo.description.length}/160</p>
              </div>
              <div className="space-y-2">
                <Label>Canonical URL</Label>
                <Input
                  placeholder="https://fastcrm.metodopare.ai/restaurantes"
                  value={form.seo.canonical}
                  onChange={(e) =>
                    updateField("seo", { ...form.seo, canonical: e.target.value })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
