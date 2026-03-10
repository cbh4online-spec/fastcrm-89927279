import { useState } from "react";
import {
  Globe, Plus, Trash2, Shield, AlertCircle, CheckCircle2,
  Clock, ExternalLink, MoreHorizontal, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
  useCustomDomains, useCreateCustomDomain, useDeleteCustomDomain
} from "@/hooks/useFunnelInstances";
import { DomainVerificationCard } from "./DomainVerificationCard";

export function DomainManager() {
  const { data: domains = [], isLoading } = useCustomDomains();
  const createDomain = useCreateCustomDomain();
  const deleteDomain = useDeleteCustomDomain();

  const [addOpen, setAddOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [newDomain, setNewDomain] = useState("");
  const [newSubdomain, setNewSubdomain] = useState("");

  const handleAdd = async () => {
    if (!newDomain) return;
    const fullDomain = newSubdomain ? `${newSubdomain}.${newDomain}` : newDomain;
    await createDomain.mutateAsync({
      domain: fullDomain,
      subdomain: newSubdomain || undefined,
      root_domain: newDomain,
    });
    setAddOpen(false);
    setNewDomain("");
    setNewSubdomain("");
  };

  const statusConfig: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
    active: { icon: CheckCircle2, color: "text-green-500", label: "Activo" },
    verified: { icon: Shield, color: "text-blue-500", label: "Verificado" },
    pending: { icon: Clock, color: "text-yellow-500", label: "Pendente" },
    error: { icon: AlertCircle, color: "text-destructive", label: "Erro" },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Domínios Personalizados
          </h2>
          <p className="text-sm text-muted-foreground">
            Gere domínios e subdomínios para os teus funis
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Adicionar Domínio
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-16 bg-muted" />
              <CardContent className="h-24 bg-muted/50" />
            </Card>
          ))}
        </div>
      ) : domains.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Globe className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Sem domínios configurados</h3>
            <p className="text-sm text-muted-foreground max-w-xs mb-4">
              Adiciona o teu domínio personalizado para publicar funis com a tua marca.
            </p>
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeiro Domínio
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {domains.map((domain) => (
            <DomainVerificationCard
              key={domain.id}
              domain={domain}
              onDelete={() => setDeleteId(domain.id)}
            />
          ))}
        </div>
      )}

      {/* Add Domain Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Domínio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Domínio raiz</Label>
              <Input
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="exemplo.pt"
              />
            </div>
            <div>
              <Label>Subdomínio (opcional)</Label>
              <Input
                value={newSubdomain}
                onChange={(e) => setNewSubdomain(e.target.value)}
                placeholder="curso"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {newSubdomain && newDomain
                  ? `URL: ${newSubdomain}.${newDomain}`
                  : "Deixa em branco para usar o domínio raiz"}
              </p>
            </div>

            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <p className="text-sm font-medium mb-2">Instruções DNS</p>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <p>Adiciona os seguintes registos DNS no teu provedor:</p>
                  <div className="bg-background rounded p-2 font-mono">
                    <p>Tipo: A</p>
                    <p>Nome: {newSubdomain || "@"}</p>
                    <p>Valor: 185.158.133.1</p>
                  </div>
                  <div className="bg-background rounded p-2 font-mono">
                    <p>Tipo: TXT</p>
                    <p>Nome: _fastcrm</p>
                    <p>Valor: fastcrm_verify=pending</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleAdd}
              disabled={!newDomain || createDomain.isPending}
            >
              Adicionar Domínio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Domínio</AlertDialogTitle>
            <AlertDialogDescription>
              Isto irá remover este domínio e todas as ligações a funis.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteId) { deleteDomain.mutate(deleteId); setDeleteId(null); } }}
              className="bg-destructive text-destructive-foreground"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
