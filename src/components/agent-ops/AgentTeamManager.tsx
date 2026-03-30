import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Users, Pencil, Trash2, Loader2 } from "lucide-react";
import { useAgentTeams } from "@/hooks/useAgentOperations";
import { useBots, type Bot } from "@/hooks/useBots";

export function AgentTeamManager() {
  const { teams, isLoading, create, update, remove } = useAgentTeams();
  const { bots } = useBots();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", objective_type: "" });

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: "", description: "", objective_type: "" });
    setDialogOpen(true);
  };

  const openEdit = (team: { id: string; name: string; description: string | null; objective_type: string | null }) => {
    setEditingId(team.id);
    setForm({ name: team.name, description: team.description || "", objective_type: team.objective_type || "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    if (editingId) {
      await update.mutateAsync({ id: editingId, ...form });
    } else {
      await create.mutateAsync(form);
    }
    setDialogOpen(false);
  };

  const getTeamBots = (teamId: string): Bot[] =>
    bots.filter((b: Bot) => (b as any).team_id === teamId);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="w-4 h-4" /> Equipas de Agentes
          </CardTitle>
          <CardDescription>Organiza os agentes em equipas com objetivos definidos.</CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openCreate}>
              <Plus className="w-3 h-3 mr-1" /> Nova Equipa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Equipa" : "Nova Equipa"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1">
                <Label>Nome</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Revenue Recovery Team" />
              </div>
              <div className="space-y-1">
                <Label>Descrição</Label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
              </div>
              <div className="space-y-1">
                <Label>Tipo de objetivo</Label>
                <Input value={form.objective_type} onChange={e => setForm(f => ({ ...f, objective_type: e.target.value }))} placeholder="Ex: revenue_recovery, sales_followup" />
              </div>
              <Button onClick={handleSave} disabled={create.isPending || update.isPending} className="w-full">
                {(create.isPending || update.isPending) && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                {editingId ? "Guardar" : "Criar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">A carregar...</p>
        ) : teams.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhuma equipa criada.</p>
        ) : (
          <div className="space-y-3">
            {teams.map(team => {
              const teamBots = getTeamBots(team.id);
              return (
                <div key={team.id} className="border border-border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm">{team.name}</h4>
                      {!team.is_active && <Badge variant="secondary" className="text-[10px]">Inativa</Badge>}
                      {team.objective_type && <Badge variant="outline" className="text-[10px]">{team.objective_type}</Badge>}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(team)}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove.mutate(team.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  {team.description && <p className="text-xs text-muted-foreground">{team.description}</p>}
                  <div className="flex flex-wrap gap-1">
                    {teamBots.length === 0 ? (
                      <span className="text-[11px] text-muted-foreground">Sem agentes associados</span>
                    ) : (
                      teamBots.map(bot => (
                        <Badge key={bot.id} variant="secondary" className="text-[10px]">
                          {bot.name} {(bot as any).role && `(${(bot as any).role})`}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
