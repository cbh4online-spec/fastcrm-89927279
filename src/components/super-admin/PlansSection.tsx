import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "lucide-react";

interface PlanFeature {
  id: string;
  plan_id: string;
  leads_limit: number;
  contacts_limit: number;
  companies_limit: number;
  opportunities_limit: number;
  templates_limit: number;
  automations_limit: number;
  automation_executions_limit: number;
  emails_limit: number;
  whatsapp_limit: number;
  instagram_limit: number;
  ai_calls_limit: number;
  storage_limit_mb: number;
  users_limit: number;
  inbox_enabled: boolean;
  automations_enabled: boolean;
  form_studio_enabled: boolean;
  templates_enabled: boolean;
  proposals_enabled: boolean;
  ai_suggestions_enabled: boolean;
  landing_pages_enabled: boolean;
  integrations_enabled: boolean;
}

const defaultPlanFeature: Partial<PlanFeature> = {
  leads_limit: 100,
  contacts_limit: 100,
  companies_limit: 50,
  opportunities_limit: 50,
  templates_limit: 10,
  automations_limit: 5,
  automation_executions_limit: 100,
  emails_limit: 500,
  whatsapp_limit: 100,
  instagram_limit: 100,
  ai_calls_limit: 100,
  storage_limit_mb: 500,
  users_limit: 1,
  inbox_enabled: true,
  automations_enabled: false,
  form_studio_enabled: false,
  templates_enabled: true,
  proposals_enabled: false,
  ai_suggestions_enabled: false,
  landing_pages_enabled: false,
  integrations_enabled: false,
};

export function PlansSection() {
  const [editPlan, setEditPlan] = useState<PlanFeature | null>(null);
  const queryClient = useQueryClient();

  const { data: plans, isLoading, refetch } = useQuery({
    queryKey: ["super-admin-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plan_features")
        .select("*")
        .order("plan");

      if (error) throw error;
      return (data || []).map((p: any) => ({
        ...p,
        plan_id: p.plan,
      })) as PlanFeature[];
    },
  });

  const updatePlan = useMutation({
    mutationFn: async (plan: PlanFeature) => {
      const { error } = await supabase
        .from("plan_features")
        .update(plan)
        .eq("id", plan.id);

      if (error) throw error;

      // Log action
      await supabase.rpc("log_admin_action", {
        p_action_type: "plan_updated",
        p_target_type: "plan_features",
        p_target_id: plan.id,
        p_details: { plan_id: plan.plan_id },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-plans"] });
      toast.success("Plano atualizado");
      setEditPlan(null);
    },
    onError: (error) => {
      toast.error("Erro: " + error.message);
    },
  });

  const getPlanBadge = (planId: string) => {
    switch (planId) {
      case "agency": return <Badge className="bg-primary text-primary-foreground">Agency</Badge>;
      case "pro": return <Badge className="bg-info text-info-foreground">Pro</Badge>;
      case "basic": return <Badge variant="secondary">Basic</Badge>;
      default: return <Badge variant="outline">Free</Badge>;
    }
  };

  const formatLimit = (value: number | undefined | null) => {
    if (value === undefined || value === null) return "-";
    if (value === -1) return "∞";
    if (value >= 1000000) return `${(value / 1000000).toFixed(0)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Planos</h1>
          <p className="text-muted-foreground">
            Configurar limites e funcionalidades por plano
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Plans Overview */}
      <div className="grid grid-cols-4 gap-4">
        {["free", "basic", "pro", "agency"].map((planId) => {
          const plan = plans?.find((p) => p.plan_id === planId);
          return (
            <Card key={planId} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  {getPlanBadge(planId)}
                  {plan && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditPlan(plan)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <CardTitle className="capitalize">{planId}</CardTitle>
              </CardHeader>
              <CardContent>
                {plan ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Leads</span>
                      <span className="font-medium">{formatLimit(plan.leads_limit)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Utilizadores</span>
                      <span className="font-medium">{formatLimit(plan.users_limit)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">IA Calls</span>
                      <span className="font-medium">{formatLimit(plan.ai_calls_limit)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Automações</span>
                      <span className="font-medium">
                        {plan.automations_enabled ? (
                          <Check className="h-4 w-4 text-success inline" />
                        ) : (
                          <X className="h-4 w-4 text-destructive inline" />
                        )}
                      </span>
                    </div>
                  </div>
                ) : (
                  <Skeleton className="h-20" />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Full Plans Table */}
      <Card>
        <CardHeader>
          <CardTitle>Comparação de Limites</CardTitle>
          <CardDescription>
            Visão detalhada de todos os limites por plano
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recurso</TableHead>
                  {plans?.map((p) => (
                    <TableHead key={p.id} className="text-center">
                      {getPlanBadge(p.plan_id)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="flex items-center gap-2">
                    <Users className="h-4 w-4" /> Utilizadores
                  </TableCell>
                  {plans?.map((p) => (
                    <TableCell key={p.id} className="text-center font-mono">
                      {formatLimit(p.users_limit)}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell>Leads</TableCell>
                  {plans?.map((p) => (
                    <TableCell key={p.id} className="text-center font-mono">
                      {formatLimit(p.leads_limit)}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell>Contactos</TableCell>
                  {plans?.map((p) => (
                    <TableCell key={p.id} className="text-center font-mono">
                      {formatLimit(p.contacts_limit)}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell>Empresas</TableCell>
                  {plans?.map((p) => (
                    <TableCell key={p.id} className="text-center font-mono">
                      {formatLimit(p.companies_limit)}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="flex items-center gap-2">
                    <Mail className="h-4 w-4" /> Emails/mês
                  </TableCell>
                  {plans?.map((p) => (
                    <TableCell key={p.id} className="text-center font-mono">
                      {formatLimit(p.emails_limit)}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" /> WhatsApp/mês
                  </TableCell>
                  {plans?.map((p) => (
                    <TableCell key={p.id} className="text-center font-mono">
                      {formatLimit(p.whatsapp_limit)}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="flex items-center gap-2">
                    <Brain className="h-4 w-4" /> IA Calls/mês
                  </TableCell>
                  {plans?.map((p) => (
                    <TableCell key={p.id} className="text-center font-mono">
                      {formatLimit(p.ai_calls_limit)}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="flex items-center gap-2">
                    <Zap className="h-4 w-4" /> Automações
                  </TableCell>
                  {plans?.map((p) => (
                    <TableCell key={p.id} className="text-center font-mono">
                      {formatLimit(p.automations_limit)}
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Features Table */}
      <Card>
        <CardHeader>
          <CardTitle>Funcionalidades por Plano</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Funcionalidade</TableHead>
                  {plans?.map((p) => (
                    <TableHead key={p.id} className="text-center">
                      {getPlanBadge(p.plan_id)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { key: "inbox_enabled", label: "Inbox" },
                  { key: "automations_enabled", label: "Automações" },
                  { key: "form_studio_enabled", label: "Form Studio" },
                  { key: "templates_enabled", label: "Templates" },
                  { key: "proposals_enabled", label: "Propostas" },
                  { key: "ai_suggestions_enabled", label: "IA Suggestions" },
                  { key: "landing_pages_enabled", label: "Landing Pages" },
                  { key: "integrations_enabled", label: "Integrações" },
                ].map((feature) => (
                  <TableRow key={feature.key}>
                    <TableCell>{feature.label}</TableCell>
                    {plans?.map((p) => (
                      <TableCell key={p.id} className="text-center">
                        {(p as any)[feature.key] ? (
                          <Check className="h-4 w-4 text-success mx-auto" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground mx-auto" />
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Plan Dialog */}
      <Dialog open={!!editPlan} onOpenChange={() => setEditPlan(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Plano {editPlan?.plan_id}</DialogTitle>
            <DialogDescription>
              Alterações afetam novos workspaces. Existentes mantêm limites atuais.
            </DialogDescription>
          </DialogHeader>
          {editPlan && (
            <div className="space-y-6">
              {/* Limits */}
              <div>
                <h4 className="font-medium mb-3">Limites</h4>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { key: "leads_limit", label: "Leads" },
                    { key: "contacts_limit", label: "Contactos" },
                    { key: "companies_limit", label: "Empresas" },
                    { key: "opportunities_limit", label: "Oportunidades" },
                    { key: "templates_limit", label: "Templates" },
                    { key: "automations_limit", label: "Automações" },
                    { key: "emails_limit", label: "Emails/mês" },
                    { key: "whatsapp_limit", label: "WhatsApp/mês" },
                    { key: "ai_calls_limit", label: "IA Calls/mês" },
                    { key: "users_limit", label: "Utilizadores" },
                    { key: "storage_limit_mb", label: "Storage (MB)" },
                  ].map((field) => (
                    <div key={field.key}>
                      <Label className="text-xs">{field.label}</Label>
                      <Input
                        type="number"
                        value={(editPlan as any)[field.key]}
                        onChange={(e) =>
                          setEditPlan({
                            ...editPlan,
                            [field.key]: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Features */}
              <div>
                <h4 className="font-medium mb-3">Funcionalidades</h4>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { key: "inbox_enabled", label: "Inbox" },
                    { key: "automations_enabled", label: "Automações" },
                    { key: "form_studio_enabled", label: "Form Studio" },
                    { key: "templates_enabled", label: "Templates" },
                    { key: "proposals_enabled", label: "Propostas" },
                    { key: "ai_suggestions_enabled", label: "IA Suggestions" },
                    { key: "landing_pages_enabled", label: "Landing Pages" },
                    { key: "integrations_enabled", label: "Integrações" },
                  ].map((feature) => (
                    <div
                      key={feature.key}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <Label>{feature.label}</Label>
                      <Switch
                        checked={(editPlan as any)[feature.key]}
                        onCheckedChange={(checked) =>
                          setEditPlan({
                            ...editPlan,
                            [feature.key]: checked,
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPlan(null)}>
              Cancelar
            </Button>
            <Button onClick={() => editPlan && updatePlan.mutate(editPlan)}>
              Guardar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
