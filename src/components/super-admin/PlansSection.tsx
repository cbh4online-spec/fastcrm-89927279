import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  Package,
  Edit,
  Plus,
  Check,
  X,
  RefreshCw,
  Users,
  Mail,
  MessageSquare,
  Brain,
  Zap,
  Sparkles,
  Loader2,
  Infinity,
  Save,
  LayoutDashboard,
  PanelLeft,
  Crown,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────

interface PlanFeatureRow {
  id: string;
  plan: string;
  feature_key: string;
  enabled: boolean;
  limit_value: number | null;
  updated_at: string | null;
}

type PlanId = "free" | "basic" | "pro" | "agency";
type GroupedFeatures = Record<PlanId, PlanFeatureRow[]>;

// ── Feature labels & categories ────────────────────────────────────

const featureLabels: Record<string, string> = {
  max_users: "Utilizadores",
  max_leads: "Leads",
  max_contacts: "Contactos",
  max_companies: "Empresas",
  max_opportunities: "Oportunidades",
  max_emails_month: "Emails / mês",
  max_whatsapp_month: "WhatsApp / mês",
  max_instagram_month: "Instagram / mês",
  max_templates: "Templates",
  max_automations: "Automações",
  max_ai_calls: "IA Calls / mês",
  inbox: "Inbox",
  automations: "Automações",
  form_studio: "Form Studio",
  templates: "Templates",
  proposals: "Propostas",
  ai_suggestions: "Sugestões IA",
  ai_insights: "IA Insights",
  landing_pages: "Landing Pages",
  integrations: "Integrações",
  dashboard_customization: "Personalização Dashboard",
  sidebar_customization: "Personalização Sidebar",
  white_label: "White Label",
};

interface FeatureCategory {
  label: string;
  icon: React.ReactNode;
  keys: string[];
  type: "limit" | "toggle";
}

const categories: FeatureCategory[] = [
  {
    label: "Limites de Dados",
    icon: <Package className="h-4 w-4" />,
    keys: ["max_leads", "max_contacts", "max_companies", "max_opportunities"],
    type: "limit",
  },
  {
    label: "Limites de Comunicação",
    icon: <Mail className="h-4 w-4" />,
    keys: ["max_emails_month", "max_whatsapp_month", "max_instagram_month"],
    type: "limit",
  },
  {
    label: "Limites de Plataforma",
    icon: <Users className="h-4 w-4" />,
    keys: ["max_users", "max_templates", "max_automations", "max_ai_calls"],
    type: "limit",
  },
  {
    label: "Módulos",
    icon: <Zap className="h-4 w-4" />,
    keys: ["inbox", "automations", "form_studio", "templates", "proposals", "landing_pages", "integrations"],
    type: "toggle",
  },
  {
    label: "IA",
    icon: <Brain className="h-4 w-4" />,
    keys: ["ai_suggestions", "ai_insights"],
    type: "toggle",
  },
  {
    label: "Personalização",
    icon: <LayoutDashboard className="h-4 w-4" />,
    keys: ["dashboard_customization", "sidebar_customization", "white_label"],
    type: "toggle",
  },
];

const PLAN_ORDER: PlanId[] = ["free", "basic", "pro", "agency"];

// ── Helpers ────────────────────────────────────────────────────────

function groupByPlan(rows: PlanFeatureRow[]): GroupedFeatures {
  const grouped: GroupedFeatures = { free: [], basic: [], pro: [], agency: [] };
  for (const row of rows) {
    const plan = row.plan as PlanId;
    if (grouped[plan]) grouped[plan].push(row);
  }
  return grouped;
}

function getFeatureRow(features: PlanFeatureRow[], key: string): PlanFeatureRow | undefined {
  return features.find((f) => f.feature_key === key);
}

function formatLimit(value: number | null | undefined) {
  if (value === undefined || value === null) return "-";
  if (value === -1) return "∞";
  if (value >= 1000000) return `${(value / 1000000).toFixed(0)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toString();
}

function getPlanBadge(planId: string) {
  switch (planId) {
    case "agency": return <Badge className="bg-primary text-primary-foreground">Agency</Badge>;
    case "pro": return <Badge className="bg-info text-info-foreground">Pro</Badge>;
    case "basic": return <Badge variant="secondary">Basic</Badge>;
    default: return <Badge variant="outline">Free</Badge>;
  }
}

function getLabel(key: string) {
  return featureLabels[key] || key;
}

// ── All known feature_keys (union of DB + hardcoded) ───────────────

function getAllFeatureKeys(grouped: GroupedFeatures): string[] {
  const set = new Set<string>();
  // Add from categories first (preserves order)
  for (const cat of categories) {
    for (const k of cat.keys) set.add(k);
  }
  // Add any extra from DB
  for (const plan of PLAN_ORDER) {
    for (const row of grouped[plan]) {
      set.add(row.feature_key);
    }
  }
  return Array.from(set);
}

// ── Component ──────────────────────────────────────────────────────

export function PlansSection() {
  const [editPlanId, setEditPlanId] = useState<PlanId | null>(null);
  const [editBuffer, setEditBuffer] = useState<Record<string, { enabled: boolean; limit_value: number | null }>>({});
  const [newFeatureKey, setNewFeatureKey] = useState("");
  const [newFeatureType, setNewFeatureType] = useState<"limit" | "toggle">("limit");
  const [showAddFeature, setShowAddFeature] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showSuggestionsDialog, setShowSuggestionsDialog] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any[] | null>(null);
  const queryClient = useQueryClient();

  // ── Query ──────────────────────────────────────────────────────

  const { data: rawFeatures, isLoading, refetch } = useQuery({
    queryKey: ["super-admin-plan-features"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plan_features")
        .select("*")
        .order("plan")
        .order("feature_key");
      if (error) throw error;
      return (data || []) as PlanFeatureRow[];
    },
  });

  const grouped = useMemo(() => groupByPlan(rawFeatures || []), [rawFeatures]);
  const allKeys = useMemo(() => getAllFeatureKeys(grouped), [grouped]);

  // ── Mutations ──────────────────────────────────────────────────

  const updateFeature = useMutation({
    mutationFn: async (row: { id: string; enabled: boolean; limit_value: number | null }) => {
      const { error } = await supabase
        .from("plan_features")
        .update({ enabled: row.enabled, limit_value: row.limit_value })
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-plan-features"] });
    },
  });

  const addFeatureToAllPlans = useMutation({
    mutationFn: async ({ featureKey, type }: { featureKey: string; type: "limit" | "toggle" }) => {
      const rows = PLAN_ORDER.map((plan) => ({
        plan,
        feature_key: featureKey,
        enabled: type === "toggle" ? false : true,
        limit_value: type === "limit" ? 0 : null,
      }));
      const { error } = await supabase.from("plan_features").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-plan-features"] });
      setShowAddFeature(false);
      setNewFeatureKey("");
      toast.success("Feature adicionada a todos os planos");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });

  // ── Edit handlers ──────────────────────────────────────────────

  const openEditDialog = (planId: PlanId) => {
    const features = grouped[planId];
    const buffer: Record<string, { enabled: boolean; limit_value: number | null }> = {};
    for (const f of features) {
      buffer[f.feature_key] = { enabled: f.enabled, limit_value: f.limit_value };
    }
    setEditBuffer(buffer);
    setEditPlanId(planId);
  };

  const saveEditPlan = async () => {
    if (!editPlanId) return;
    const features = grouped[editPlanId];
    const promises: Promise<void>[] = [];
    for (const f of features) {
      const buf = editBuffer[f.feature_key];
      if (!buf) continue;
      if (buf.enabled !== f.enabled || buf.limit_value !== f.limit_value) {
        promises.push(
          updateFeature.mutateAsync({ id: f.id, enabled: buf.enabled, limit_value: buf.limit_value })
        );
      }
    }
    if (promises.length === 0) {
      toast.info("Sem alterações");
      setEditPlanId(null);
      return;
    }
    try {
      await Promise.all(promises);
      toast.success(`Plano ${editPlanId} atualizado (${promises.length} alterações)`);
      setEditPlanId(null);

      await supabase.rpc("log_admin_action", {
        p_action_type: "plan_updated",
        p_target_type: "plan_features",
        p_target_id: editPlanId,
        p_details: { changes: promises.length },
      }).catch(() => {});
    } catch (e: any) {
      toast.error("Erro ao guardar: " + e.message);
    }
  };

  // ── Inline bulk edit (table row) ───────────────────────────────

  const [inlineEditing, setInlineEditing] = useState<string | null>(null);
  const [inlineValues, setInlineValues] = useState<Record<PlanId, { enabled: boolean; limit_value: number | null }>>({
    free: { enabled: false, limit_value: null },
    basic: { enabled: false, limit_value: null },
    pro: { enabled: false, limit_value: null },
    agency: { enabled: false, limit_value: null },
  });

  const startInlineEdit = (featureKey: string) => {
    const vals = {} as any;
    for (const plan of PLAN_ORDER) {
      const row = getFeatureRow(grouped[plan], featureKey);
      vals[plan] = row
        ? { enabled: row.enabled, limit_value: row.limit_value }
        : { enabled: false, limit_value: null };
    }
    setInlineValues(vals);
    setInlineEditing(featureKey);
  };

  const saveInlineEdit = async () => {
    if (!inlineEditing) return;
    const promises: Promise<void>[] = [];
    for (const plan of PLAN_ORDER) {
      const row = getFeatureRow(grouped[plan], inlineEditing);
      if (!row) continue;
      const val = inlineValues[plan];
      if (val.enabled !== row.enabled || val.limit_value !== row.limit_value) {
        promises.push(updateFeature.mutateAsync({ id: row.id, enabled: val.enabled, limit_value: val.limit_value }));
      }
    }
    try {
      await Promise.all(promises);
      toast.success(`${getLabel(inlineEditing)} atualizado em ${promises.length} planos`);
      setInlineEditing(null);
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    }
  };

  // ── AI Suggest ─────────────────────────────────────────────────

  const handleSuggestAllLimits = async () => {
    if (!rawFeatures?.length) return;
    setIsSuggesting(true);
    try {
      const context = PLAN_ORDER.map((plan) => {
        const features = grouped[plan];
        const map: Record<string, any> = { plan_id: plan };
        for (const f of features) {
          map[f.feature_key] = f.limit_value ?? f.enabled;
        }
        return map;
      });
      const { data, error } = await supabase.functions.invoke("pricing-ai-assistant", {
        body: { action: "suggest_plan_limits", context },
      });
      if (error) throw error;
      const result = data?.result;
      if (result?.plans) {
        setAiSuggestions(result.plans);
        setShowSuggestionsDialog(true);
      } else {
        toast.error("Resposta IA inesperada");
      }
    } catch (e: any) {
      toast.error("Erro IA: " + (e.message || "Tente novamente"));
    } finally {
      setIsSuggesting(false);
    }
  };

  // ── Determine if a feature_key is a limit (has limit_value set) or toggle ──

  const isLimitFeature = (featureKey: string): boolean => {
    for (const cat of categories) {
      if (cat.keys.includes(featureKey)) return cat.type === "limit";
    }
    // Check DB: if any plan has a non-null limit_value, it's a limit
    for (const plan of PLAN_ORDER) {
      const row = getFeatureRow(grouped[plan], featureKey);
      if (row && row.limit_value !== null) return true;
    }
    return false;
  };

  // ── Category for a feature_key ─────────────────────────────────

  const getCategoryForKey = (key: string): FeatureCategory | null => {
    return categories.find((c) => c.keys.includes(key)) || null;
  };

  // Build categories with uncategorized
  const categorizedKeys = useMemo(() => {
    const result: { category: FeatureCategory | { label: string; icon: React.ReactNode; keys: string[]; type: "limit" | "toggle" }; keys: string[] }[] = [];
    const used = new Set<string>();

    for (const cat of categories) {
      const present = cat.keys.filter((k) => allKeys.includes(k));
      if (present.length > 0) {
        result.push({ category: cat, keys: present });
        present.forEach((k) => used.add(k));
      }
    }

    const uncategorized = allKeys.filter((k) => !used.has(k));
    if (uncategorized.length > 0) {
      result.push({
        category: { label: "Outros", icon: <Package className="h-4 w-4" />, keys: uncategorized, type: "limit" },
        keys: uncategorized,
      });
    }

    return result;
  }, [allKeys]);

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Planos</h1>
          <p className="text-muted-foreground">Configurar limites e funcionalidades por plano</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowAddFeature(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Feature
          </Button>
          <Button variant="outline" size="sm" onClick={handleSuggestAllLimits} disabled={isSuggesting || !rawFeatures?.length}>
            {isSuggesting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Sugerir Limites IA
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Plan Cards Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLAN_ORDER.map((planId) => {
          const features = grouped[planId];
          const limitKeys = categories.filter((c) => c.type === "limit").flatMap((c) => c.keys);
          const toggleKeys = categories.filter((c) => c.type === "toggle").flatMap((c) => c.keys);
          const enabledToggles = toggleKeys.filter((k) => getFeatureRow(features, k)?.enabled);

          return (
            <Card key={planId} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  {getPlanBadge(planId)}
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(planId)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
                <CardTitle className="capitalize">{planId}</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-24" />
                ) : (
                  <div className="space-y-2 text-sm">
                    {["max_users", "max_leads", "max_ai_calls"].map((key) => {
                      const row = getFeatureRow(features, key);
                      return (
                        <div key={key} className="flex justify-between">
                          <span className="text-muted-foreground">{getLabel(key)}</span>
                          <span className="font-medium font-mono">{formatLimit(row?.limit_value)}</span>
                        </div>
                      );
                    })}
                    <div className="flex justify-between pt-1 border-t">
                      <span className="text-muted-foreground">Módulos ativos</span>
                      <span className="font-medium">{enabledToggles.length}/{toggleKeys.length}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Full Comparison Table by Category */}
      {categorizedKeys.map(({ category, keys }) => (
        <Card key={category.label}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              {category.icon}
              {category.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-32" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Recurso</TableHead>
                    {PLAN_ORDER.map((p) => (
                      <TableHead key={p} className="text-center">{getPlanBadge(p)}</TableHead>
                    ))}
                    <TableHead className="w-[80px] text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keys.map((key) => {
                    const isLimit = isLimitFeature(key);
                    const isEditing = inlineEditing === key;

                    return (
                      <TableRow key={key}>
                        <TableCell className="font-medium">{getLabel(key)}</TableCell>
                        {PLAN_ORDER.map((plan) => {
                          const row = getFeatureRow(grouped[plan], key);

                          if (isEditing) {
                            const val = inlineValues[plan];
                            if (isLimit) {
                              const isUnlimited = val.limit_value === -1;
                              return (
                                <TableCell key={plan} className="text-center">
                                  <div className="flex flex-col items-center gap-1">
                                    <div className="flex items-center gap-1">
                                      <Input
                                        type="number"
                                        value={isUnlimited ? "" : (val.limit_value ?? 0)}
                                        disabled={isUnlimited}
                                        onChange={(e) => setInlineValues((prev) => ({
                                          ...prev,
                                          [plan]: { ...prev[plan], limit_value: parseInt(e.target.value) || 0 },
                                        }))}
                                        className="w-20 h-8 text-xs text-center"
                                      />
                                    </div>
                                    <button
                                      onClick={() => setInlineValues((prev) => ({
                                        ...prev,
                                        [plan]: { ...prev[plan], limit_value: isUnlimited ? 0 : -1 },
                                      }))}
                                      className={`text-[10px] px-1.5 py-0.5 rounded ${isUnlimited ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
                                    >
                                      {isUnlimited ? "∞ Ilimitado" : "Ilimitado?"}
                                    </button>
                                  </div>
                                </TableCell>
                              );
                            } else {
                              return (
                                <TableCell key={plan} className="text-center">
                                  <Switch
                                    checked={val.enabled}
                                    onCheckedChange={(checked) => setInlineValues((prev) => ({
                                      ...prev,
                                      [plan]: { ...prev[plan], enabled: checked },
                                    }))}
                                  />
                                </TableCell>
                              );
                            }
                          }

                          // Display mode
                          if (isLimit) {
                            return (
                              <TableCell key={plan} className="text-center font-mono">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="cursor-default">{formatLimit(row?.limit_value)}</span>
                                    </TooltipTrigger>
                                    {row?.updated_at && (
                                      <TooltipContent>
                                        <p className="text-xs">Atualizado: {new Date(row.updated_at).toLocaleString("pt-PT")}</p>
                                      </TooltipContent>
                                    )}
                                  </Tooltip>
                                </TooltipProvider>
                              </TableCell>
                            );
                          } else {
                            return (
                              <TableCell key={plan} className="text-center">
                                {row?.enabled ? (
                                  <Check className="h-4 w-4 text-success mx-auto" />
                                ) : (
                                  <X className="h-4 w-4 text-muted-foreground mx-auto" />
                                )}
                              </TableCell>
                            );
                          }
                        })}
                        <TableCell className="text-center">
                          {isEditing ? (
                            <div className="flex gap-1 justify-center">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={saveInlineEdit}>
                                <Save className="h-3.5 w-3.5 text-success" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setInlineEditing(null)}>
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startInlineEdit(key)}>
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Edit Plan Dialog */}
      <Dialog open={!!editPlanId} onOpenChange={() => setEditPlanId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Editar Plano — {editPlanId && getPlanBadge(editPlanId)}
            </DialogTitle>
            <DialogDescription>Alterações afetam novos workspaces. Existentes mantêm limites atuais.</DialogDescription>
          </DialogHeader>

          {editPlanId && (
            <Tabs defaultValue="limits" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="limits" className="flex-1">Limites</TabsTrigger>
                <TabsTrigger value="modules" className="flex-1">Módulos</TabsTrigger>
                <TabsTrigger value="customization" className="flex-1">Personalização</TabsTrigger>
              </TabsList>

              <TabsContent value="limits" className="space-y-4 mt-4">
                {categories.filter((c) => c.type === "limit").map((cat) => (
                  <div key={cat.label}>
                    <h4 className="font-medium mb-3 flex items-center gap-2">{cat.icon} {cat.label}</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {cat.keys.map((key) => {
                        const val = editBuffer[key];
                        if (!val) return null;
                        const isUnlimited = val.limit_value === -1;
                        return (
                          <div key={key} className="space-y-1">
                            <Label className="text-xs">{getLabel(key)}</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={isUnlimited ? "" : (val.limit_value ?? 0)}
                                disabled={isUnlimited}
                                onChange={(e) => setEditBuffer((prev) => ({
                                  ...prev,
                                  [key]: { ...prev[key], limit_value: parseInt(e.target.value) || 0 },
                                }))}
                                className="h-9"
                              />
                              <button
                                onClick={() => setEditBuffer((prev) => ({
                                  ...prev,
                                  [key]: { ...prev[key], limit_value: isUnlimited ? 0 : -1 },
                                }))}
                                className={`shrink-0 text-xs px-2 py-1 rounded border ${isUnlimited ? "bg-primary/10 text-primary border-primary/30" : "text-muted-foreground border-border hover:border-primary/30"}`}
                              >
                                ∞
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="modules" className="space-y-3 mt-4">
                {["Módulos", "IA"].map((catLabel) => {
                  const cat = categories.find((c) => c.label === catLabel);
                  if (!cat) return null;
                  return (
                    <div key={catLabel}>
                      <h4 className="font-medium mb-3 flex items-center gap-2">{cat.icon} {cat.label}</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {cat.keys.map((key) => {
                          const val = editBuffer[key];
                          if (!val) return null;
                          return (
                            <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                              <Label>{getLabel(key)}</Label>
                              <Switch
                                checked={val.enabled}
                                onCheckedChange={(checked) => setEditBuffer((prev) => ({
                                  ...prev,
                                  [key]: { ...prev[key], enabled: checked },
                                }))}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </TabsContent>

              <TabsContent value="customization" className="space-y-3 mt-4">
                {(() => {
                  const cat = categories.find((c) => c.label === "Personalização");
                  if (!cat) return null;
                  return (
                    <div className="grid grid-cols-1 gap-3">
                      {cat.keys.map((key) => {
                        const val = editBuffer[key];
                        if (!val) return null;
                        return (
                          <div key={key} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                              {key === "white_label" ? <Crown className="h-4 w-4 text-primary" /> :
                               key === "sidebar_customization" ? <PanelLeft className="h-4 w-4" /> :
                               <LayoutDashboard className="h-4 w-4" />}
                              <Label className="text-base">{getLabel(key)}</Label>
                            </div>
                            <Switch
                              checked={val.enabled}
                              onCheckedChange={(checked) => setEditBuffer((prev) => ({
                                ...prev,
                                [key]: { ...prev[key], enabled: checked },
                              }))}
                            />
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPlanId(null)}>Cancelar</Button>
            <Button onClick={saveEditPlan}>Guardar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Feature Dialog */}
      <Dialog open={showAddFeature} onOpenChange={setShowAddFeature}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Nova Feature</DialogTitle>
            <DialogDescription>Será adicionada a todos os 4 planos.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Feature Key</Label>
              <Input
                placeholder="ex: max_reports, custom_domains"
                value={newFeatureKey}
                onChange={(e) => setNewFeatureKey(e.target.value.toLowerCase().replace(/\s/g, "_"))}
              />
            </div>
            <div>
              <Label>Tipo</Label>
              <div className="flex gap-3 mt-2">
                <Button
                  variant={newFeatureType === "limit" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setNewFeatureType("limit")}
                >
                  Limite (numérico)
                </Button>
                <Button
                  variant={newFeatureType === "toggle" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setNewFeatureType("toggle")}
                >
                  Toggle (on/off)
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddFeature(false)}>Cancelar</Button>
            <Button
              onClick={() => addFeatureToAllPlans.mutate({ featureKey: newFeatureKey, type: newFeatureType })}
              disabled={!newFeatureKey || addFeatureToAllPlans.isPending}
            >
              {addFeatureToAllPlans.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Suggestions Dialog */}
      <Dialog open={showSuggestionsDialog} onOpenChange={setShowSuggestionsDialog}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Sugestões IA — Limites por Plano
            </DialogTitle>
            <DialogDescription>
              Baseadas em benchmarks de mercado. Selecione um plano para editar com valores sugeridos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {aiSuggestions?.map((suggestion: any) => (
              <Card key={suggestion.plan_id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    {getPlanBadge(suggestion.plan_id)}
                    <Button size="sm" variant="outline" onClick={() => {
                      openEditDialog(suggestion.plan_id as PlanId);
                      // Apply suggestions to buffer
                      if (suggestion.suggestions) {
                        setEditBuffer((prev) => {
                          const updated = { ...prev };
                          for (const [key, val] of Object.entries(suggestion.suggestions)) {
                            if (updated[key]) {
                              if (typeof val === "boolean") {
                                updated[key] = { ...updated[key], enabled: val };
                              } else if (typeof val === "number") {
                                updated[key] = { ...updated[key], limit_value: val };
                              }
                            }
                          }
                          return updated;
                        });
                      }
                      setShowSuggestionsDialog(false);
                    }}>
                      Editar com sugestões
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {suggestion.reasoning && (
                    <p className="text-xs text-muted-foreground italic mb-3">{suggestion.reasoning}</p>
                  )}
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-xs">
                    {Object.entries(suggestion.suggestions || {}).map(([key, val]) => {
                      const row = getFeatureRow(grouped[suggestion.plan_id as PlanId] || [], key);
                      const current = row?.limit_value;
                      const suggested = val as number;
                      const changed = current !== suggested;
                      return (
                        <div key={key} className={`p-2 rounded border ${changed ? "border-primary/40 bg-primary/5" : "border-border"}`}>
                          <div className="text-muted-foreground">{getLabel(key)}</div>
                          <div className="font-mono font-medium">
                            {changed && current !== null && current !== undefined && (
                              <span className="text-destructive line-through mr-1">{formatLimit(current)}</span>
                            )}
                            <span className={changed ? "text-primary" : ""}>{formatLimit(suggested)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSuggestionsDialog(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
