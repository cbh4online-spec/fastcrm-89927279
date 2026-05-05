import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Check, ChefHat, Loader2, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

type WizardStep = 1 | 2 | 3;
type CreatorRole = "owner" | "admin";
type InviteRole = "admin" | "agent" | "viewer";

interface InviteRow {
  email: string;
  role: InviteRole;
}

const CREATOR_ROLES: Array<{ value: CreatorRole; title: string; description: string }> = [
  {
    value: "owner",
    title: "Proprietário",
    description: "Acesso total ao workspace, faturação e eliminação de dados.",
  },
  {
    value: "admin",
    title: "Administrador",
    description: "Gere utilizadores e configurações, sem acesso a faturação sensível.",
  },
];

const INVITE_ROLES: Array<{ value: InviteRole; label: string; hint: string }> = [
  { value: "admin", label: "Administrador", hint: "Gere o workspace" },
  { value: "agent", label: "Agente", hint: "Trabalha leads e clientes" },
  { value: "viewer", label: "Visualizador", hint: "Apenas leitura" },
];

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LeadChefOnboardingWizard() {
  const { user, loading: authLoading } = useAuth();
  const { createWorkspace, refreshWorkspaces, setCurrentWorkspace } = useWorkspace();
  const navigate = useNavigate();

  const [step, setStep] = useState<WizardStep>(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1
  const [workspaceName, setWorkspaceName] = useState("");

  // Step 2
  const [creatorRole, setCreatorRole] = useState<CreatorRole>("owner");

  // Step 3
  const [invites, setInvites] = useState<InviteRow[]>([{ email: "", role: "agent" }]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login", { replace: true });
  }, [authLoading, user, navigate]);

  const canAdvance = useMemo(() => {
    if (step === 1) return workspaceName.trim().length >= 2;
    if (step === 2) return creatorRole === "owner" || creatorRole === "admin";
    return true;
  }, [step, workspaceName, creatorRole]);

  const validInvites = useMemo(
    () => invites.filter((i) => EMAIL_RX.test(i.email.trim())),
    [invites]
  );

  const updateInvite = (idx: number, patch: Partial<InviteRow>) => {
    setInvites((prev) => prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  };

  const addInviteRow = () => setInvites((prev) => [...prev, { email: "", role: "agent" }]);
  const removeInviteRow = (idx: number) =>
    setInvites((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)));

  const handleCreate = async () => {
    if (!user) return;
    setSubmitting(true);

    try {
      // 1. Create workspace via existing RPC (creator becomes 'owner' automatically)
      const { workspace, error } = await createWorkspace(workspaceName.trim());
      if (error || !workspace) {
        throw new Error(error?.message || "Falha a criar workspace");
      }

      // 2. If user chose 'admin' instead of 'owner', downgrade their membership
      if (creatorRole === "admin") {
        const { error: roleErr } = await supabase
          .from("workspace_members")
          .update({ role: "admin" })
          .eq("workspace_id", workspace.id)
          .eq("user_id", user.id);
        if (roleErr) console.warn("[LeadChef Onboarding] role downgrade failed", roleErr.message);
      }

      // 3. Mark workspace as LeadChef-scoped
      const { error: settingsErr } = await supabase
        .from("workspace_settings")
        .upsert(
          { workspace_id: workspace.id, primary_module: "leadchef" },
          { onConflict: "workspace_id" }
        );
      if (settingsErr) console.warn("[LeadChef Onboarding] settings upsert failed", settingsErr.message);

      // 4. Send invites (best-effort)
      if (validInvites.length > 0) {
        const inviteRows = validInvites.map((i) => ({
          workspace_id: workspace.id,
          email: i.email.trim().toLowerCase(),
          role: i.role,
          invited_by: user.id,
        }));
        const { error: inviteErr } = await supabase.from("workspace_invites").insert(inviteRows);
        if (inviteErr) {
          toast.warning(`Workspace criado, mas alguns convites falharam: ${inviteErr.message}`);
        } else {
          toast.success(`${validInvites.length} convite(s) enviado(s).`);
        }
      }

      await refreshWorkspaces();
      setCurrentWorkspace({ ...workspace, role: creatorRole });
      toast.success(`Workspace "${workspace.name}" criado!`);
      navigate("/dashboard/leadchef/today", { replace: true });
    } catch (e) {
      console.error("[LeadChef Onboarding]", e);
      toast.error((e as Error).message || "Erro ao criar workspace");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <ChefHat className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">LeadChef</h1>
            <p className="text-sm text-muted-foreground">Configura o teu workspace em 3 passos</p>
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex-1 flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border ${
                  step === n
                    ? "bg-primary text-primary-foreground border-primary"
                    : step > n
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-muted text-muted-foreground border-border"
                }`}
              >
                {step > n ? <Check className="w-4 h-4" /> : n}
              </div>
              {n < 3 && <div className={`flex-1 h-px ${step > n ? "bg-primary/40" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        <Card>
          {step === 1 && (
            <>
              <CardHeader>
                <CardTitle>Nome do workspace</CardTitle>
                <CardDescription>
                  Vai aparecer na barra lateral e nos emails enviados aos teus colaboradores.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ws-name">Nome</Label>
                  <Input
                    id="ws-name"
                    autoFocus
                    placeholder="Ex.: LeadChef Demo"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    maxLength={80}
                  />
                  <p className="text-xs text-muted-foreground">
                    Mínimo 2 caracteres. Podes mudar depois nas definições.
                  </p>
                </div>
              </CardContent>
            </>
          )}

          {step === 2 && (
            <>
              <CardHeader>
                <CardTitle>O teu papel neste workspace</CardTitle>
                <CardDescription>
                  Define que permissões queres ter. És sempre membro fundador.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={creatorRole}
                  onValueChange={(v) => setCreatorRole(v as CreatorRole)}
                  className="space-y-3"
                >
                  {CREATOR_ROLES.map((r) => (
                    <label
                      key={r.value}
                      htmlFor={`role-${r.value}`}
                      className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                        creatorRole === r.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <RadioGroupItem value={r.value} id={`role-${r.value}`} className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{r.title}</span>
                          {r.value === "owner" && (
                            <Badge variant="secondary" className="text-xs">
                              Recomendado
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">{r.description}</p>
                      </div>
                    </label>
                  ))}
                </RadioGroup>
              </CardContent>
            </>
          )}

          {step === 3 && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Convidar a tua equipa
                </CardTitle>
                <CardDescription>
                  Opcional. Recebem um email para se juntarem ao workspace.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {invites.map((row, idx) => {
                  const invalid = row.email.length > 0 && !EMAIL_RX.test(row.email.trim());
                  return (
                    <div key={idx} className="flex items-start gap-2">
                      <div className="flex-1 space-y-1">
                        <Input
                          type="email"
                          placeholder="email@empresa.com"
                          value={row.email}
                          onChange={(e) => updateInvite(idx, { email: e.target.value })}
                          aria-invalid={invalid}
                          className={invalid ? "border-destructive" : ""}
                        />
                        {invalid && (
                          <p className="text-xs text-destructive">Email inválido</p>
                        )}
                      </div>
                      <Select
                        value={row.role}
                        onValueChange={(v) => updateInvite(idx, { role: v as InviteRole })}
                      >
                        <SelectTrigger className="w-[160px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {INVITE_ROLES.map((r) => (
                            <SelectItem key={r.value} value={r.value}>
                              {r.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeInviteRow(idx)}
                        disabled={invites.length === 1}
                        aria-label="Remover linha"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}

                <Button type="button" variant="outline" size="sm" onClick={addInviteRow}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar mais
                </Button>

                <p className="text-xs text-muted-foreground pt-2">
                  Podes saltar este passo e convidar mais tarde em <strong>Definições → People</strong>.
                </p>
              </CardContent>
            </>
          )}
        </Card>

        {/* Footer nav */}
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setStep((s) => (s > 1 ? ((s - 1) as WizardStep) : s))}
            disabled={step === 1 || submitting}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Anterior
          </Button>

          {step < 3 ? (
            <Button
              type="button"
              onClick={() => setStep((s) => (s + 1) as WizardStep)}
              disabled={!canAdvance}
            >
              Continuar
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button type="button" onClick={handleCreate} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />A criar…
                </>
              ) : (
                <>
                  Criar workspace
                  <Check className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
