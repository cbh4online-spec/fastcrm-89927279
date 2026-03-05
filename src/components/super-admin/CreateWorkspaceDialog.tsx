import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { emitKernelEvent } from "@/lib/kernelEmitter";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Search, User, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CreateWorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface UserSearchResult {
  id: string;
  email: string;
}

export function CreateWorkspaceDialog({ open, onOpenChange }: CreateWorkspaceDialogProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [plan, setPlan] = useState<string>("free");
  const [ownerSearch, setOwnerSearch] = useState("");
  const [selectedOwner, setSelectedOwner] = useState<UserSearchResult | null>(null);
  
  const queryClient = useQueryClient();

  // Search for users by email
  const { data: userResults, isLoading: searchLoading } = useQuery({
    queryKey: ["user-search", ownerSearch],
    queryFn: async () => {
      if (!ownerSearch || ownerSearch.length < 3) return [];
      
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email")
        .ilike("email", `%${ownerSearch}%`)
        .limit(5);
      
      if (error) throw error;
      return data as UserSearchResult[];
    },
    enabled: ownerSearch.length >= 3,
  });

  // Auto-generate slug from name
  const handleNameChange = (value: string) => {
    setName(value);
    const generatedSlug = value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setSlug(generatedSlug);
  };

  const createWorkspace = useMutation({
    mutationFn: async () => {
      if (!selectedOwner) throw new Error("Selecione um owner");
      
      const { data, error } = await supabase.rpc("create_workspace_for_user", {
        p_name: name,
        p_slug: slug,
        p_owner_user_id: selectedOwner.id,
        p_plan: plan,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const workspaceId = data as string;
      queryClient.invalidateQueries({ queryKey: ["super-admin-workspaces"] });
      toast.success(`Workspace "${name}" criado com sucesso`);

      console.log(`[WORKSPACES] Admin created workspace: ${workspaceId}`);
      emitKernelEvent({
        workspace_id: workspaceId || 'unknown',
        type: 'WORKSPACE.CREATED',
        entity_kind: 'workspace',
        entity_id: workspaceId || 'unknown',
        source_module: 'admin-workspaces',
        payload: { name, slug, plan, owner_email: selectedOwner?.email },
      });

      supabase.rpc("log_admin_action", {
        p_action_type: "workspace_created",
        p_target_type: "workspace",
        p_target_id: workspaceId || null,
        p_details: { name, slug, plan, owner_email: selectedOwner?.email },
      });

      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.warn('[WORKSPACES] ADMIN_CREATE_FAILED', error.message);
      toast.error("Erro ao criar workspace: " + error.message);
    },
  });

  const resetForm = () => {
    setName("");
    setSlug("");
    setPlan("free");
    setOwnerSearch("");
    setSelectedOwner(null);
  };

  const handleClose = (open: boolean) => {
    if (!open) resetForm();
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Criar Novo Workspace
          </DialogTitle>
          <DialogDescription>
            Cria um novo workspace e atribui um owner.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Nome do Workspace */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Workspace</Label>
            <Input
              id="name"
              placeholder="Ex: Empresa ABC"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
            />
          </div>

          {/* Slug */}
          <div className="space-y-2">
            <Label htmlFor="slug">Slug (URL)</Label>
            <Input
              id="slug"
              placeholder="empresa-abc"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Identificador único para URLs
            </p>
          </div>

          {/* Plano */}
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

          {/* Owner */}
          <div className="space-y-2">
            <Label>Owner (Proprietário)</Label>
            
            {selectedOwner ? (
              <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 text-sm">{selectedOwner.email}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedOwner(null)}
                >
                  Alterar
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Pesquisar por email..."
                    value={ownerSearch}
                    onChange={(e) => setOwnerSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                
                {searchLoading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground p-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    A pesquisar...
                  </div>
                )}
                
                {userResults && userResults.length > 0 && (
                  <div className="border rounded-md divide-y max-h-40 overflow-y-auto">
                    {userResults.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        className="w-full p-2 text-left hover:bg-accent text-sm flex items-center gap-2"
                        onClick={() => {
                          setSelectedOwner(user);
                          setOwnerSearch("");
                        }}
                      >
                        <User className="h-4 w-4 text-muted-foreground" />
                        {user.email}
                      </button>
                    ))}
                  </div>
                )}
                
                {ownerSearch.length >= 3 && !searchLoading && userResults?.length === 0 && (
                  <p className="text-sm text-muted-foreground p-2">
                    Nenhum utilizador encontrado
                  </p>
                )}
                
                {ownerSearch.length > 0 && ownerSearch.length < 3 && (
                  <p className="text-xs text-muted-foreground">
                    Digite pelo menos 3 caracteres para pesquisar
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={() => createWorkspace.mutate()}
            disabled={!name || !slug || !selectedOwner || createWorkspace.isPending}
          >
            {createWorkspace.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Criar Workspace
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
