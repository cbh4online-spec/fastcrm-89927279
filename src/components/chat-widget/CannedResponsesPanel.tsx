import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, MessageSquare, Copy } from "lucide-react";
import { toast } from "sonner";

interface CannedResponse {
  id: string;
  shortcut: string;
  title: string;
  content: string;
  category: string;
}

export function CannedResponsesPanel() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [shortcut, setShortcut] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("geral");

  const { data: responses = [], isLoading } = useQuery({
    queryKey: ["chat_canned_responses", currentWorkspace?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("chat_canned_responses")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .order("shortcut");
      if (error) throw error;
      return (data || []) as CannedResponse[];
    },
    enabled: !!currentWorkspace?.id,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from("chat_canned_responses")
        .insert({
          workspace_id: currentWorkspace!.id,
          shortcut,
          title,
          content,
          category,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat_canned_responses"] });
      toast.success("Resposta rápida criada");
      setDialogOpen(false);
      setShortcut("");
      setTitle("");
      setContent("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("chat_canned_responses")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat_canned_responses"] });
      toast.success("Resposta eliminada");
    },
  });

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Respostas Rápidas
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Nova
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Resposta Rápida</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Atalho (ex: /ola)</Label>
                  <Input value={shortcut} onChange={e => setShortcut(e.target.value)} placeholder="/ola" />
                </div>
                <div className="space-y-1.5">
                  <Label>Categoria</Label>
                  <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="geral" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Título</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Saudação inicial" />
              </div>
              <div className="space-y-1.5">
                <Label>Conteúdo</Label>
                <Textarea value={content} onChange={e => setContent(e.target.value)} rows={3} placeholder="Olá! Como posso ajudar?" />
              </div>
              <Button onClick={() => saveMutation.mutate()} disabled={!shortcut || !content || saveMutation.isPending} className="w-full">
                Criar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">A carregar...</p>
        ) : responses.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Sem respostas rápidas. Usa "/" no chat para as inserir.
          </p>
        ) : (
          <div className="space-y-2">
            {responses.map(r => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/20 transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-[10px]">{r.shortcut}</Badge>
                    <span className="text-sm font-medium truncate">{r.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{r.content}</p>
                </div>
                <div className="flex items-center gap-1 ml-2 shrink-0">
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7"
                    onClick={() => { navigator.clipboard.writeText(r.content); toast.success("Copiado"); }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(r.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
