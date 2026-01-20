import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  Globe,
  Plus,
  Trash2,
  Shield,
  AlertTriangle,
} from "lucide-react";

interface IPRestrictionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface IPRestriction {
  id: string;
  workspace_id: string;
  ip_address: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

interface WorkspaceSettings {
  id: string;
  workspace_id: string;
  ip_restrictions_enabled: boolean;
}

export function IPRestrictionsDialog({
  open,
  onOpenChange,
}: IPRestrictionsDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const [newIP, setNewIP] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [restrictionsEnabled, setRestrictionsEnabled] = useState(false);

  const { data: restrictions, isLoading } = useQuery({
    queryKey: ["ip-restrictions", currentWorkspace?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ip_restrictions")
        .select("*")
        .eq("workspace_id", currentWorkspace?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as IPRestriction[];
    },
    enabled: open && !!currentWorkspace?.id,
  });

  const { data: settings } = useQuery({
    queryKey: ["workspace-settings", currentWorkspace?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_settings")
        .select("*")
        .eq("workspace_id", currentWorkspace?.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      if (data) {
        const typedData = data as WorkspaceSettings;
        setRestrictionsEnabled(typedData.ip_restrictions_enabled ?? false);
      }
      return data as WorkspaceSettings | null;
    },
    enabled: open && !!currentWorkspace?.id,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const ipPattern = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
      if (!ipPattern.test(newIP)) {
        throw new Error("Formato de IP inválido. Use formato x.x.x.x ou x.x.x.x/xx");
      }

      const { error } = await supabase.from("ip_restrictions").insert({
        workspace_id: currentWorkspace?.id,
        ip_address: newIP,
        description: newDescription,
        is_active: true,
      } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ip-restrictions"] });
      setNewIP("");
      setNewDescription("");
      toast({ title: "IP adicionado com sucesso" });
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ip_restrictions")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ip-restrictions"] });
      setDeleteId(null);
      toast({ title: "IP removido com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao remover IP", variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("ip_restrictions")
        .update({ is_active: isActive } as any)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ip-restrictions"] });
    },
  });

  const toggleRestrictionsEnabled = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase
        .from("workspace_settings")
        .upsert({
          workspace_id: currentWorkspace?.id,
          ip_restrictions_enabled: enabled,
        } as any, { onConflict: "workspace_id" });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-settings"] });
      toast({
        title: restrictionsEnabled
          ? "Restrições de IP desativadas"
          : "Restrições de IP ativadas",
      });
    },
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Restrições por IP
            </DialogTitle>
            <DialogDescription>
              Limite o acesso ao sistema apenas a IPs autorizados.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Ativar restrições de IP</p>
                <p className="text-sm text-muted-foreground">
                  Quando ativo, apenas IPs listados podem aceder
                </p>
              </div>
            </div>
            <Switch
              checked={restrictionsEnabled}
              onCheckedChange={(checked) => {
                setRestrictionsEnabled(checked);
                toggleRestrictionsEnabled.mutate(checked);
              }}
            />
          </div>

          {restrictionsEnabled && (restrictions?.length ?? 0) === 0 && (
            <div className="flex items-center gap-2 p-3 border rounded-lg bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Atenção: Adicione pelo menos um IP antes de ativar as restrições.
              </p>
            </div>
          )}

          <div className="grid grid-cols-[1fr,1fr,auto] gap-2">
            <div>
              <Label htmlFor="new-ip">IP ou CIDR</Label>
              <Input
                id="new-ip"
                placeholder="192.168.1.1 ou 10.0.0.0/24"
                value={newIP}
                onChange={(e) => setNewIP(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                placeholder="Ex: Escritório Lisboa"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => addMutation.mutate()}
                disabled={!newIP || addMutation.isPending}
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[250px]">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : restrictions?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum IP configurado
              </div>
            ) : (
              <div className="space-y-2">
                {restrictions?.map((restriction) => (
                  <div
                    key={restriction.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={restriction.is_active}
                        onCheckedChange={(checked) =>
                          toggleMutation.mutate({ id: restriction.id, isActive: checked })
                        }
                      />
                      <div>
                        <p className="font-mono font-medium">
                          {restriction.ip_address}
                        </p>
                        {restriction.description && (
                          <p className="text-sm text-muted-foreground">
                            {restriction.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={restriction.is_active ? "default" : "secondary"}>
                        {restriction.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(restriction.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover IP?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O IP será removido da lista de
              permissões.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
