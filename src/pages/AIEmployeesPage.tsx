import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useBots } from "@/hooks/useBots";
import { BotCard } from "@/components/ai-employees/BotCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Bot, Plus, Search, Users, Zap, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

export default function AIEmployeesPage() {
  const navigate = useNavigate();
  const { bots, isLoading, toggleStatus, deleteBot, activeBots } = useBots();
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = bots.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    (b.description || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bot className="h-6 w-6 text-primary" />
              AI Employees
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Operadores digitais integrados ao teu CRM, Inbox e Automações
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1 text-emerald-500 border-emerald-500/30">
              <Zap className="h-3 w-3" />
              {activeBots.length} Ativos
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Users className="h-3 w-3" />
              {bots.length} Total
            </Badge>
            <Button onClick={() => navigate("/dashboard/ai-employees/new")} className="gap-2">
              <Plus className="h-4 w-4" />
              Criar AI Employee
            </Button>
          </div>
        </div>

        {/* Info banner */}
        {bots.length === 0 && !isLoading && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
            <div className="flex items-start gap-3">
              <Bot className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <h4 className="font-medium text-primary">Cria o teu primeiro AI Employee</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Um AI Employee é um operador digital que responde automaticamente em canais como WhatsApp, Instagram
                  e Widget — integrado com o teu CRM, calendário e automações.
                </p>
                <Button className="mt-3" size="sm" onClick={() => navigate("/dashboard/ai-employees/new")}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" /> Criar agora
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Search + filter */}
        {bots.length > 0 && (
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar bots..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        )}

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(bot => (
              <BotCard
                key={bot.id}
                bot={bot}
                onToggleStatus={(id, status) => toggleStatus.mutate({ id, status })}
                onDelete={id => setDeleteId(id)}
              />
            ))}
          </div>
        ) : bots.length > 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Search className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Nenhum bot encontrado para "{search}"</p>
          </div>
        ) : null}
      </div>

      {/* Delete dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar AI Employee?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. Todos os dados deste bot serão eliminados permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { deleteBot.mutate(deleteId!); setDeleteId(null); }}
            >
              {deleteBot.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
