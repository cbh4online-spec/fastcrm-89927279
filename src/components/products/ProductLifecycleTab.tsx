import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowRight,
  FileEdit,
  CheckCircle,
  XCircle,
  Archive,
  Clock,
  History,
  Loader2,
  Send,
  RotateCcw,
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  useProductChangelog,
  useProductStatusTransition,
  getValidTransitions,
} from "@/hooks/useProductLifecycle";
import { productStatusLabels, productStatusColors } from "@/types/product";

interface ProductLifecycleTabProps {
  product: {
    id: string;
    workspace_id: string;
    name: string;
    status: string;
    published_at?: string | null;
    discontinued_at?: string | null;
    reviewed_by?: string | null;
    reviewed_at?: string | null;
    discontinued_reason?: string | null;
    created_at: string;
  };
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  draft: <FileEdit className="h-4 w-4" />,
  review: <Clock className="h-4 w-4" />,
  active: <CheckCircle className="h-4 w-4" />,
  discontinued: <XCircle className="h-4 w-4" />,
  archived: <Archive className="h-4 w-4" />,
};

const TRANSITION_LABELS: Record<string, { label: string; icon: React.ReactNode; variant: "default" | "outline" | "destructive" | "secondary" }> = {
  review: { label: "Submeter para Revisão", icon: <Send className="h-4 w-4 mr-1" />, variant: "default" },
  active: { label: "Aprovar / Ativar", icon: <CheckCircle className="h-4 w-4 mr-1" />, variant: "default" },
  discontinued: { label: "Descontinuar", icon: <XCircle className="h-4 w-4 mr-1" />, variant: "destructive" },
  archived: { label: "Arquivar", icon: <Archive className="h-4 w-4 mr-1" />, variant: "secondary" },
  draft: { label: "Voltar a Rascunho", icon: <RotateCcw className="h-4 w-4 mr-1" />, variant: "outline" },
};

const CHANGELOG_LABELS: Record<string, string> = {
  status_change: "Alteração de estado",
  field_update: "Campo atualizado",
  price_change: "Preço alterado",
  created: "Criado",
};

export function ProductLifecycleTab({ product }: ProductLifecycleTabProps) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id ?? product.workspace_id;
  const { data: changelog = [], isLoading: loadingLog } = useProductChangelog(product.id);
  const transition = useProductStatusTransition();

  const [transitionDialog, setTransitionDialog] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [discontinueReason, setDiscontinueReason] = useState("");

  const validTransitions = getValidTransitions(product.status);
  const statusLabel = productStatusLabels[product.status as keyof typeof productStatusLabels] ?? product.status;
  const statusColor = productStatusColors[product.status as keyof typeof productStatusColors] ?? "";

  const handleTransition = async () => {
    if (!transitionDialog) return;
    await transition.mutateAsync({
      productId: product.id,
      workspaceId,
      newStatus: transitionDialog,
      notes: notes || undefined,
      discontinuedReason: transitionDialog === "discontinued" ? discontinueReason : undefined,
    });
    setTransitionDialog(null);
    setNotes("");
    setDiscontinueReason("");
  };

  // Workflow steps
  const steps = ["draft", "review", "active"];
  const currentIdx = steps.indexOf(product.status);

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {STATUS_ICONS[product.status]}
          <Badge className={`${statusColor} border-0 text-sm px-3 py-1`}>
            {statusLabel}
          </Badge>
        </div>
      </div>

      {/* Workflow Progress */}
      <div className="flex items-center gap-1">
        {steps.map((step, i) => {
          const isActive = product.status === step;
          const isPast = currentIdx >= 0 && i < currentIdx;
          const label = productStatusLabels[step as keyof typeof productStatusLabels] ?? step;
          return (
            <div key={step} className="flex items-center gap-1">
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : isPast
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {STATUS_ICONS[step]}
                {label}
              </div>
              {i < steps.length - 1 && (
                <ArrowRight className={`h-4 w-4 ${isPast ? "text-primary" : "text-muted-foreground/40"}`} />
              )}
            </div>
          );
        })}
        {product.status === "discontinued" && (
          <>
            <ArrowRight className="h-4 w-4 text-muted-foreground/40" />
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
              <XCircle className="h-3 w-3" />
              Descontinuado
            </div>
          </>
        )}
      </div>

      {/* Lifecycle Dates */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-muted-foreground text-xs">Criado em</p>
          <p>{format(new Date(product.created_at), "dd/MM/yyyy HH:mm", { locale: pt })}</p>
        </div>
        {product.published_at && (
          <div>
            <p className="text-muted-foreground text-xs">Publicado em</p>
            <p>{format(new Date(product.published_at), "dd/MM/yyyy HH:mm", { locale: pt })}</p>
          </div>
        )}
        {product.reviewed_at && (
          <div>
            <p className="text-muted-foreground text-xs">Revisto em</p>
            <p>{format(new Date(product.reviewed_at), "dd/MM/yyyy HH:mm", { locale: pt })}</p>
          </div>
        )}
        {product.discontinued_at && (
          <div>
            <p className="text-muted-foreground text-xs">Descontinuado em</p>
            <p>{format(new Date(product.discontinued_at), "dd/MM/yyyy HH:mm", { locale: pt })}</p>
          </div>
        )}
        {product.discontinued_reason && (
          <div className="col-span-2">
            <p className="text-muted-foreground text-xs">Motivo descontinuação</p>
            <p>{product.discontinued_reason}</p>
          </div>
        )}
      </div>

      <Separator />

      {/* Actions */}
      {validTransitions.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-3">Ações Disponíveis</h4>
          <div className="flex flex-wrap gap-2">
            {validTransitions.map((target) => {
              const config = TRANSITION_LABELS[target];
              if (!config) return null;
              return (
                <Button
                  key={target}
                  variant={config.variant}
                  size="sm"
                  onClick={() => setTransitionDialog(target)}
                >
                  {config.icon}
                  {config.label}
                </Button>
              );
            })}
          </div>
        </div>
      )}

      <Separator />

      {/* Changelog */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <History className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-medium">Changelog</h4>
          <Badge variant="secondary" className="text-xs">{changelog.length}</Badge>
        </div>

        {loadingLog ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : changelog.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Sem alterações registadas</p>
        ) : (
          <div className="rounded-md border max-h-[250px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ação</TableHead>
                  <TableHead>De</TableHead>
                  <TableHead>Para</TableHead>
                  <TableHead>Notas</TableHead>
                  <TableHead className="w-[130px]">Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {changelog.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-xs font-medium">
                      {CHANGELOG_LABELS[entry.action] ?? entry.action}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {entry.old_value ? (productStatusLabels[entry.old_value as keyof typeof productStatusLabels] ?? entry.old_value) : "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {entry.new_value ? (
                        <Badge variant="outline" className={`text-xs border-0 ${productStatusColors[entry.new_value as keyof typeof productStatusColors] ?? ""}`}>
                          {productStatusLabels[entry.new_value as keyof typeof productStatusLabels] ?? entry.new_value}
                        </Badge>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                      {entry.notes ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(entry.created_at), "dd/MM/yy HH:mm", { locale: pt })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Transition Dialog */}
      <Dialog open={!!transitionDialog} onOpenChange={(v) => !v && setTransitionDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {transitionDialog && TRANSITION_LABELS[transitionDialog]?.label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <Badge className={`${statusColor} border-0`}>{statusLabel}</Badge>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <Badge className={`${productStatusColors[transitionDialog as keyof typeof productStatusColors] ?? ""} border-0`}>
                {productStatusLabels[transitionDialog as keyof typeof productStatusLabels] ?? transitionDialog}
              </Badge>
            </div>

            {transitionDialog === "discontinued" && (
              <div>
                <Label>Motivo da descontinuação</Label>
                <Textarea
                  value={discontinueReason}
                  onChange={(e) => setDiscontinueReason(e.target.value)}
                  placeholder="Ex: Substituído pelo modelo XYZ..."
                  rows={2}
                />
              </div>
            )}

            <div>
              <Label>Notas (opcional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observações sobre esta alteração..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransitionDialog(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleTransition}
              disabled={transition.isPending}
              variant={transitionDialog === "discontinued" ? "destructive" : "default"}
            >
              {transition.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
