import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  useHelpdeskAutomations,
  TRIGGER_LABELS,
  ACTION_LABELS,
  type HelpdeskAutomation,
} from "@/hooks/useHelpdeskAutomations";
import { AutomationRuleDialog, AUTOMATION_TEMPLATES } from "@/components/helpdesk/AutomationRuleDialog";
import { Plus, Zap, Trash2, Pencil, Sparkles, Play } from "lucide-react";
import Skeleton from "react-loading-skeleton";
import TimeAgo from "react-timeago";
import { motion, AnimatePresence } from "framer-motion";
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

export default function HelpdeskAutomations() {
  const { automations, isLoading, create, update, remove, toggleActive } = useHelpdeskAutomations();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRule, setEditRule] = useState<HelpdeskAutomation | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleSave = (rule: Parameters<typeof create.mutateAsync>[0]) => {
    if (editRule) {
      update.mutate({ id: editRule.id, ...rule });
    } else {
      create.mutate(rule);
    }
    setEditRule(null);
  };

  const handleEdit = (r: HelpdeskAutomation) => {
    setEditRule(r);
    setDialogOpen(true);
  };

  const handleTemplateClick = (template: (typeof AUTOMATION_TEMPLATES)[number]) => {
    create.mutate({ ...template, is_active: true });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Automações do Helpdesk</h1>
            <p className="text-muted-foreground text-sm">Regras automáticas para atribuição, escalação e notificações</p>
          </div>
          <Button onClick={() => { setEditRule(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Automação
          </Button>
        </div>

        {/* Templates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4" />
              Templates Pré-definidos
            </CardTitle>
            <CardDescription>Clique para criar rapidamente uma automação a partir de um template.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {AUTOMATION_TEMPLATES.map((t) => (
                <Button
                  key={t.name}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => handleTemplateClick(t)}
                  disabled={create.isPending}
                >
                  <Zap className="h-3 w-3 mr-1" />
                  {t.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Automations List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Regras Ativas
            </CardTitle>
            <CardDescription>{automations.length} automação(ões) configurada(s)</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} height={48} />)}
              </div>
            ) : automations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Zap className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Sem automações configuradas</p>
                <p className="text-xs mt-1">Crie uma automação ou use um template acima.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead className="text-center">Execuções</TableHead>
                    <TableHead>Última execução</TableHead>
                    <TableHead className="w-[80px]">Ativa</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {automations.map((rule) => (
                      <motion.tr
                        key={rule.id}
                        layout
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="border-b transition-colors hover:bg-muted/50"
                      >
                        <TableCell className="font-medium text-sm">{rule.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {TRIGGER_LABELS[rule.trigger_event] || rule.trigger_event}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {ACTION_LABELS[rule.action_type] || rule.action_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-sm tabular-nums">
                          {rule.execution_count}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {rule.last_executed_at ? <TimeAgo date={rule.last_executed_at} /> : "—"}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={rule.is_active}
                            onCheckedChange={(v) => toggleActive.mutate({ id: rule.id, is_active: v })}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(rule)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(rule.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <AutomationRuleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSave}
        editRule={editRule}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar automação?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser revertida.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteId) remove.mutate(deleteId); setDeleteId(null); }}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
