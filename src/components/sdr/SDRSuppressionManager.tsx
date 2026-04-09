import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { KPIGrid, KPICard } from "@/components/design-system/KPICard";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ShieldBan, Plus, Trash2, Search, Loader2, Ban, AlertTriangle, UserX, Mail,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

const REASON_LABELS: Record<string, { label: string; color: string }> = {
  hard_bounce: { label: "Hard Bounce", color: "destructive" },
  complaint: { label: "Reclamação", color: "destructive" },
  manual_optout: { label: "Opt-out Manual", color: "secondary" },
  unsubscribe: { label: "Unsubscribe", color: "default" },
};

export function SDRSuppressionManager() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [reasonFilter, setReasonFilter] = useState<string>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newReason, setNewReason] = useState("manual_optout");
  const [newNotes, setNewNotes] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: suppressions = [], isLoading } = useQuery({
    queryKey: ["sdr-suppressions", currentWorkspace?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sdr_suppressions")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentWorkspace?.id,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("sdr_suppressions")
        .insert({
          workspace_id: currentWorkspace!.id,
          email: newEmail.trim().toLowerCase(),
          reason: newReason,
          notes: newNotes.trim() || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sdr-suppressions"] });
      toast.success("Email adicionado à lista de supressão");
      setShowAdd(false);
      setNewEmail("");
      setNewNotes("");
    },
    onError: (err: Error) => {
      if (err.message?.includes("duplicate")) {
        toast.error("Este email já está na lista de supressão");
      } else {
        toast.error("Erro ao adicionar supressão");
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("sdr_suppressions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sdr-suppressions"] });
      toast.success("Supressão removida");
      setDeleteId(null);
    },
    onError: () => toast.error("Erro ao remover supressão"),
  });

  // Filtered list
  const filtered = suppressions.filter((s: any) => {
    if (reasonFilter !== "all" && s.reason !== reasonFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return s.email.toLowerCase().includes(q) || (s.notes || "").toLowerCase().includes(q);
    }
    return true;
  });

  // KPI counts
  const byReason = suppressions.reduce((acc: Record<string, number>, s: any) => {
    acc[s.reason] = (acc[s.reason] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <KPIGrid columns={4}>
        <KPICard
          title="Total Suprimidos"
          value={suppressions.length}
          icon={<ShieldBan className="h-4 w-4" />}
          variant="destructive"
        />
        <KPICard
          title="Hard Bounces"
          value={byReason.hard_bounce || 0}
          icon={<AlertTriangle className="h-4 w-4" />}
          variant="destructive"
        />
        <KPICard
          title="Opt-outs"
          value={(byReason.manual_optout || 0) + (byReason.unsubscribe || 0)}
          icon={<UserX className="h-4 w-4" />}
          variant="warning"
        />
        <KPICard
          title="Reclamações"
          value={byReason.complaint || 0}
          icon={<Ban className="h-4 w-4" />}
          variant="destructive"
        />
      </KPIGrid>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={reasonFilter} onValueChange={setReasonFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar motivo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os motivos</SelectItem>
            <SelectItem value="hard_bounce">Hard Bounce</SelectItem>
            <SelectItem value="complaint">Reclamação</SelectItem>
            <SelectItem value="manual_optout">Opt-out Manual</SelectItem>
            <SelectItem value="unsubscribe">Unsubscribe</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setShowAdd(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Adicionar
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <Mail className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">
                {search || reasonFilter !== "all"
                  ? "Nenhum resultado encontrado"
                  : "Lista de supressão vazia"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Notas</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s: any) => {
                  const reason = REASON_LABELS[s.reason] || { label: s.reason, color: "secondary" };
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-sm">{s.email}</TableCell>
                      <TableCell>
                        <Badge variant={reason.color as any}>{reason.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {s.notes || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(s.created_at), "dd MMM yyyy", { locale: pt })}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setDeleteId(s.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Supressão</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="email@exemplo.com"
                type="email"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Motivo</label>
              <Select value={newReason} onValueChange={setNewReason}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual_optout">Opt-out Manual</SelectItem>
                  <SelectItem value="hard_bounce">Hard Bounce</SelectItem>
                  <SelectItem value="complaint">Reclamação</SelectItem>
                  <SelectItem value="unsubscribe">Unsubscribe</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Notas (opcional)</label>
              <Textarea
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Motivo adicional..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button
              onClick={() => addMutation.mutate()}
              disabled={!newEmail.trim() || addMutation.isPending}
            >
              {addMutation.isPending ? "A adicionar..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover supressão?</AlertDialogTitle>
            <AlertDialogDescription>
              Este email voltará a receber comunicações SDR. Tem a certeza?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
