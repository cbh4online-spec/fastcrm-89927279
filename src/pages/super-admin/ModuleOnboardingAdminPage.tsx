import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit, ArrowUp, ArrowDown, Loader2, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Navigate } from "react-router-dom";

interface Slide {
  id: string;
  module_slug: string;
  slide_order: number;
  lang: string;
  heading: string;
  body: string | null;
  bullets: string[];
  image_url: string | null;
  cta_label: string | null;
  cta_url: string | null;
  min_duration_seconds: number;
  is_active: boolean;
}

const emptySlide: Partial<Slide> = {
  heading: "",
  body: "",
  bullets: [],
  image_url: "",
  cta_label: "",
  min_duration_seconds: 3,
  is_active: true,
  lang: "pt",
};

export default function ModuleOnboardingAdminPage() {
  const { isSuperAdmin } = useWorkspace();
  const queryClient = useQueryClient();
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [editing, setEditing] = useState<Partial<Slide> | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: modules } = useQuery({
    queryKey: ["marketplace-modules-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("marketplace_modules")
        .select("id, slug, name, icon")
        .eq("status", "active")
        .order("name");
      return data ?? [];
    },
    enabled: isSuperAdmin,
  });

  const { data: allSlides } = useQuery({
    queryKey: ["module-onboarding-admin-slides"],
    queryFn: async () => {
      const { data } = await supabase
        .from("module_onboarding_presentations")
        .select("*")
        .order("module_slug")
        .order("lang")
        .order("slide_order");
      return (data ?? []) as unknown as Slide[];
    },
    enabled: isSuperAdmin,
  });

  const slidesByModule = useMemo(() => {
    const map = new Map<string, Slide[]>();
    (allSlides ?? []).forEach((s) => {
      const k = s.module_slug;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(s);
    });
    return map;
  }, [allSlides]);

  const upsertMutation = useMutation({
    mutationFn: async (slide: Partial<Slide>) => {
      const payload = {
        module_slug: selectedSlug!,
        slide_order: slide.slide_order ?? ((slidesByModule.get(selectedSlug!)?.length ?? 0) + 1),
        lang: slide.lang || "pt",
        heading: slide.heading || "",
        body: slide.body || null,
        bullets: slide.bullets ?? [],
        image_url: slide.image_url || null,
        cta_label: slide.cta_label || null,
        cta_url: slide.cta_url || null,
        min_duration_seconds: slide.min_duration_seconds ?? 3,
        is_active: slide.is_active ?? true,
      };
      if (slide.id) {
        const { error } = await supabase.from("module_onboarding_presentations").update(payload).eq("id", slide.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("module_onboarding_presentations").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Slide guardado");
      queryClient.invalidateQueries({ queryKey: ["module-onboarding-admin-slides"] });
      queryClient.invalidateQueries({ queryKey: ["module-onboarding-slides"] });
      setSheetOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("module_onboarding_presentations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Slide eliminado");
      queryClient.invalidateQueries({ queryKey: ["module-onboarding-admin-slides"] });
      queryClient.invalidateQueries({ queryKey: ["module-onboarding-slides"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reorderMutation = useMutation({
    mutationFn: async ({ id, newOrder }: { id: string; newOrder: number }) => {
      const { error } = await supabase
        .from("module_onboarding_presentations")
        .update({ slide_order: newOrder })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["module-onboarding-admin-slides"] });
    },
  });

  if (!isSuperAdmin) return <Navigate to="/dashboard" replace />;

  const selectedSlides = selectedSlug ? slidesByModule.get(selectedSlug) ?? [] : [];

  const openNew = () => {
    setEditing({ ...emptySlide, slide_order: selectedSlides.length + 1 });
    setSheetOpen(true);
  };

  const openEdit = (s: Slide) => {
    setEditing(s);
    setSheetOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BookOpen className="w-7 h-7" /> Guias de Onboarding
          </h1>
          <p className="text-muted-foreground">Gere as apresentações de boas-vindas exibidas antes do primeiro acesso a cada módulo.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          {/* Lista de módulos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Módulos</CardTitle>
            </CardHeader>
            <CardContent className="p-0 max-h-[70vh] overflow-auto">
              {(modules ?? []).map((m) => {
                const count = slidesByModule.get(m.slug)?.length ?? 0;
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedSlug(m.slug)}
                    className={`w-full text-left px-4 py-3 border-b border-border hover:bg-muted/50 flex items-center justify-between ${
                      selectedSlug === m.slug ? "bg-muted" : ""
                    }`}
                  >
                    <div>
                      <p className="font-medium text-sm">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.slug}</p>
                    </div>
                    <Badge variant={count > 0 ? "default" : "outline"}>{count}</Badge>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* Slides do módulo selecionado */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{selectedSlug ? `Slides — ${selectedSlug}` : "Seleciona um módulo"}</CardTitle>
                <CardDescription>Ordem, idioma e conteúdo dos slides</CardDescription>
              </div>
              {selectedSlug && (
                <Button onClick={openNew}>
                  <Plus className="w-4 h-4 mr-1" /> Novo slide
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              {!selectedSlug && <p className="text-muted-foreground text-sm">Escolhe um módulo à esquerda.</p>}
              {selectedSlug && selectedSlides.length === 0 && (
                <p className="text-muted-foreground text-sm">Sem slides definidos. Cria o primeiro.</p>
              )}
              {selectedSlides.map((s, idx) => (
                <div key={s.id} className="border border-border rounded-lg p-3 flex items-start gap-3">
                  <div className="flex flex-col gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      disabled={idx === 0}
                      onClick={() => {
                        const prev = selectedSlides[idx - 1];
                        reorderMutation.mutate({ id: s.id, newOrder: prev.slide_order });
                        reorderMutation.mutate({ id: prev.id, newOrder: s.slide_order });
                      }}
                    >
                      <ArrowUp className="w-3 h-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      disabled={idx === selectedSlides.length - 1}
                      onClick={() => {
                        const next = selectedSlides[idx + 1];
                        reorderMutation.mutate({ id: s.id, newOrder: next.slide_order });
                        reorderMutation.mutate({ id: next.id, newOrder: s.slide_order });
                      }}
                    >
                      <ArrowDown className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">#{s.slide_order}</Badge>
                      <Badge variant="secondary">{s.lang}</Badge>
                      {!s.is_active && <Badge variant="destructive">inativo</Badge>}
                    </div>
                    <p className="font-medium truncate">{s.heading}</p>
                    {s.body && <p className="text-xs text-muted-foreground line-clamp-2">{s.body}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(s)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (confirm("Eliminar este slide?")) deleteMutation.mutate(s.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Editor lateral */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent className="overflow-y-auto sm:max-w-xl">
            <SheetHeader>
              <SheetTitle>{editing?.id ? "Editar slide" : "Novo slide"}</SheetTitle>
            </SheetHeader>
            {editing && (
              <div className="space-y-4 mt-6">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Ordem</Label>
                    <Input
                      type="number"
                      value={editing.slide_order ?? 1}
                      onChange={(e) => setEditing({ ...editing, slide_order: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <div>
                    <Label>Idioma</Label>
                    <Input value={editing.lang || "pt"} onChange={(e) => setEditing({ ...editing, lang: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Título *</Label>
                  <Input value={editing.heading || ""} onChange={(e) => setEditing({ ...editing, heading: e.target.value })} />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Textarea
                    rows={3}
                    value={editing.body || ""}
                    onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Bullets (uma por linha)</Label>
                  <Textarea
                    rows={4}
                    value={(editing.bullets ?? []).join("\n")}
                    onChange={(e) =>
                      setEditing({ ...editing, bullets: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })
                    }
                  />
                </div>
                <div>
                  <Label>URL da imagem</Label>
                  <Input
                    value={editing.image_url || ""}
                    onChange={(e) => setEditing({ ...editing, image_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>CTA (último slide)</Label>
                    <Input
                      value={editing.cta_label || ""}
                      onChange={(e) => setEditing({ ...editing, cta_label: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Tempo mínimo (s)</Label>
                    <Input
                      type="number"
                      value={editing.min_duration_seconds ?? 3}
                      onChange={(e) => setEditing({ ...editing, min_duration_seconds: parseInt(e.target.value) || 3 })}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label>Ativo</Label>
                  <Switch
                    checked={editing.is_active ?? true}
                    onCheckedChange={(v) => setEditing({ ...editing, is_active: v })}
                  />
                </div>
                <Button
                  className="w-full"
                  disabled={!editing.heading || upsertMutation.isPending}
                  onClick={() => upsertMutation.mutate(editing)}
                >
                  {upsertMutation.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                  Guardar
                </Button>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </DashboardLayout>
  );
}
