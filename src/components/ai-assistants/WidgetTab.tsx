/**
 * Widget Tab - Multi-Widget Management
 * Lists all widgets, allows create/edit/delete/duplicate
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plus,
  MessageCircle,
  Copy,
  Trash2,
  Play,
  Settings2,
  Globe,
  RefreshCw,
  Bot,
} from "lucide-react";
import { WidgetConfigPanel } from "@/components/chat-widget/WidgetConfigPanel";
import { WidgetTestChat } from "@/components/chat-widget/WidgetTestChat";
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

interface WidgetListItem {
  id: string;
  name: string;
  primary_color: string;
  is_active: boolean;
  allowed_domains: string[];
  default_agent_id: string | null;
  company_name: string | null;
  welcome_message: string;
}

export function WidgetTab() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [editingWidgetId, setEditingWidgetId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [testWidgetId, setTestWidgetId] = useState<string | null>(null);
  const [deleteWidgetId, setDeleteWidgetId] = useState<string | null>(null);

  // Fetch all widgets
  const { data: widgets, isLoading } = useQuery({
    queryKey: ["widget-list", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from("widget_configurations" as any)
        .select("id, name, primary_color, is_active, allowed_domains, default_agent_id, company_name, welcome_message")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as WidgetListItem[]) || [];
    },
    enabled: !!currentWorkspace?.id,
  });

  // Fetch agents for display
  const { data: agents } = useQuery({
    queryKey: ["agents-map", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data } = await supabase
        .from("ai_agents" as any)
        .select("id, name, channel")
        .eq("workspace_id", currentWorkspace.id)
        .eq("is_active", true);
      return (data as any[]) || [];
    },
    enabled: !!currentWorkspace?.id,
  });

  const agentMap = new Map((agents || []).map((a: any) => [a.id, a.name]));

  // Duplicate widget
  const duplicateMutation = useMutation({
    mutationFn: async (widgetId: string) => {
      if (!currentWorkspace?.id) throw new Error("No workspace");
      const { data: original, error: fetchErr } = await supabase
        .from("widget_configurations" as any)
        .select("*")
        .eq("id", widgetId)
        .single();
      if (fetchErr || !original) throw new Error("Widget not found");

      const { id, created_at, updated_at, ...rest } = original as any;
      const { error } = await supabase
        .from("widget_configurations" as any)
        .insert({ ...rest, name: `${rest.name} (cópia)`, is_active: false });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Widget duplicado");
      queryClient.invalidateQueries({ queryKey: ["widget-list"] });
    },
    onError: () => toast.error("Erro ao duplicar widget"),
  });

  // Delete widget
  const deleteMutation = useMutation({
    mutationFn: async (widgetId: string) => {
      const { error } = await supabase
        .from("widget_configurations" as any)
        .delete()
        .eq("id", widgetId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Widget eliminado");
      setDeleteWidgetId(null);
      queryClient.invalidateQueries({ queryKey: ["widget-list"] });
    },
    onError: () => toast.error("Erro ao eliminar widget"),
  });

  // Get test config for a widget
  const testWidget = widgets?.find((w) => w.id === testWidgetId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Widgets de chat que podem ser embebidos em qualquer website.
        </p>
        <Button onClick={() => setIsCreating(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Criar Widget
        </Button>
      </div>

      {/* Widget Cards */}
      {(!widgets || widgets.length === 0) ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold text-lg mb-1">Nenhum widget criado</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Crie o seu primeiro widget de chat para embeber no seu website.
            </p>
            <Button onClick={() => setIsCreating(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Criar Widget
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {widgets.map((w) => (
            <Card
              key={w.id}
              className="group hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setEditingWidgetId(w.id)}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: w.primary_color || "#6366f1" }}
                    >
                      <MessageCircle className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">{w.name}</h3>
                      {w.company_name && (
                        <p className="text-xs text-muted-foreground">{w.company_name}</p>
                      )}
                    </div>
                  </div>
                  <Badge variant={w.is_active ? "default" : "secondary"} className="text-xs">
                    {w.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>

                {/* Agent */}
                {w.default_agent_id && agentMap.has(w.default_agent_id) && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Bot className="h-3.5 w-3.5" />
                    <span>{agentMap.get(w.default_agent_id)}</span>
                  </div>
                )}

                {/* Domains */}
                {w.allowed_domains?.length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Globe className="h-3.5 w-3.5" />
                    <span>{w.allowed_domains.slice(0, 2).join(", ")}{w.allowed_domains.length > 2 ? ` +${w.allowed_domains.length - 2}` : ""}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-1 pt-1" onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 gap-1 text-xs"
                    onClick={() => setEditingWidgetId(w.id)}
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 gap-1 text-xs"
                    onClick={() => setTestWidgetId(w.id)}
                  >
                    <Play className="h-3.5 w-3.5" />
                    Testar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 gap-1 text-xs"
                    onClick={() => duplicateMutation.mutate(w.id)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 gap-1 text-xs text-destructive hover:text-destructive"
                    onClick={() => setDeleteWidgetId(w.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit/Create Dialog */}
      <Dialog
        open={!!editingWidgetId || isCreating}
        onOpenChange={(open) => {
          if (!open) {
            setEditingWidgetId(null);
            setIsCreating(false);
            queryClient.invalidateQueries({ queryKey: ["widget-list"] });
          }
        }}
      >
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <WidgetConfigPanel
            widgetId={editingWidgetId || undefined}
            onClose={() => {
              setEditingWidgetId(null);
              setIsCreating(false);
              queryClient.invalidateQueries({ queryKey: ["widget-list"] });
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Test Chat */}
      {testWidgetId && testWidget && (
        <WidgetTestChat
          widgetId={testWidgetId}
          config={{
            primary_color: testWidget.primary_color || "#6366f1",
            secondary_color: "#f1f5f9",
            text_color: "#1e293b",
            welcome_message: testWidget.welcome_message || "Olá!",
            placeholder_text: "Escreva a sua mensagem...",
            company_name: testWidget.company_name || null,
            avatar_url: null,
            show_branding: true,
          }}
          onClose={() => setTestWidgetId(null)}
        />
      )}

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteWidgetId} onOpenChange={() => setDeleteWidgetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Widget</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. O widget deixará de funcionar nos sites onde está embebido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteWidgetId && deleteMutation.mutate(deleteWidgetId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
