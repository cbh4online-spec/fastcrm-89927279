import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, UserPlus, Building2, Eye, EyeOff } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface CreateUserWithWorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateUserWithWorkspaceDialog({ 
  open, 
  onOpenChange 
}: CreateUserWithWorkspaceDialogProps) {
  // User fields
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // Workspace fields
  const [createWorkspace, setCreateWorkspace] = useState(true);
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceSlug, setWorkspaceSlug] = useState("");
  const [plan, setPlan] = useState("free");
  const [requiresOnboarding, setRequiresOnboarding] = useState(true);

  const queryClient = useQueryClient();

  // Auto-generate slug from workspace name
  const handleWorkspaceNameChange = (value: string) => {
    setWorkspaceName(value);
    const generatedSlug = value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setWorkspaceSlug(generatedSlug);
  };

  // Auto-fill workspace name from user name
  const handleFullNameChange = (value: string) => {
    setFullName(value);
    if (createWorkspace && !workspaceName) {
      handleWorkspaceNameChange(value);
    }
  };

  const createUser = useMutation({
    mutationFn: async () => {
      // Validations
      if (!email || !fullName || !password) {
        throw new Error("Preencha todos os campos obrigatórios");
      }
      if (password !== confirmPassword) {
        throw new Error("As palavras-passe não coincidem");
      }
      if (password.length < 6) {
        throw new Error("A palavra-passe deve ter pelo menos 6 caracteres");
      }
      if (createWorkspace && (!workspaceName || !workspaceSlug)) {
        throw new Error("Preencha o nome e slug do workspace");
      }

      const { data, error } = await supabase.functions.invoke("admin-user-management", {
        body: {
          action: "create_user",
          email,
          password,
          fullName,
          workspaceName: createWorkspace ? workspaceName : undefined,
          workspaceSlug: createWorkspace ? workspaceSlug : undefined,
          plan: createWorkspace ? plan : undefined,
          requiresOnboarding: createWorkspace ? requiresOnboarding : false,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-workspaces"] });
      toast.success(`Utilizador "${fullName}" criado com sucesso!`, {
        description: createWorkspace 
          ? `Workspace "${workspaceName}" criado. ${requiresOnboarding ? "Onboarding ativo no primeiro login." : ""}`
          : undefined
      });

      supabase.rpc("log_admin_action", {
        p_action_type: "user_created",
        p_target_type: "user",
        p_target_id: data?.userId || null,
        p_details: { email, full_name: fullName, workspace_created: createWorkspace, workspace_name: createWorkspace ? workspaceName : null, plan: createWorkspace ? plan : null },
      });

      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error("Erro ao criar utilizador: " + error.message);
    },
  });

  const resetForm = () => {
    setEmail("");
    setFullName("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setCreateWorkspace(true);
    setWorkspaceName("");
    setWorkspaceSlug("");
    setPlan("free");
    setRequiresOnboarding(true);
  };

  const handleClose = (open: boolean) => {
    if (!open) resetForm();
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Criar Novo Utilizador
          </DialogTitle>
          <DialogDescription>
            Cria um utilizador com workspace e onboarding configurado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* User Section */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Dados do Utilizador
            </h3>
            
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome Completo *</Label>
                <Input
                  id="fullName"
                  placeholder="João Silva"
                  value={fullName}
                  onChange={(e) => handleFullNameChange(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="joao@empresa.pt"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Palavra-passe *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Palavra-passe *</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Repetir palavra-passe"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                {password && confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-destructive">
                    As palavras-passe não coincidem
                  </p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Workspace Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Workspace
              </h3>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="createWorkspace"
                  checked={createWorkspace}
                  onCheckedChange={(checked) => setCreateWorkspace(checked === true)}
                />
                <Label htmlFor="createWorkspace" className="text-sm cursor-pointer">
                  Criar workspace
                </Label>
              </div>
            </div>

            {createWorkspace && (
              <div className="grid gap-4 animate-in fade-in-0 slide-in-from-top-2">
                <div className="space-y-2">
                  <Label htmlFor="workspaceName">Nome do Workspace *</Label>
                  <Input
                    id="workspaceName"
                    placeholder="Empresa ABC"
                    value={workspaceName}
                    onChange={(e) => handleWorkspaceNameChange(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="workspaceSlug">Slug (URL)</Label>
                  <Input
                    id="workspaceSlug"
                    placeholder="empresa-abc"
                    value={workspaceSlug}
                    onChange={(e) => setWorkspaceSlug(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Identificador único para URLs
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Plano Inicial</Label>
                  <Select value={plan} onValueChange={setPlan}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="agency">Agency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border">
                  <Checkbox
                    id="requiresOnboarding"
                    checked={requiresOnboarding}
                    onCheckedChange={(checked) => setRequiresOnboarding(checked === true)}
                    className="mt-0.5"
                  />
                  <div className="space-y-1">
                    <Label htmlFor="requiresOnboarding" className="cursor-pointer font-medium">
                      Ativar Onboarding Inteligente
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      O utilizador passará pelo assistente de configuração no primeiro login, 
                      personalizando pipelines, campos e automações.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={() => createUser.mutate()}
            disabled={
              !email || 
              !fullName || 
              !password || 
              password !== confirmPassword ||
              (createWorkspace && (!workspaceName || !workspaceSlug)) ||
              createUser.isPending
            }
          >
            {createUser.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Criar Utilizador
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
