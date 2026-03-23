import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Package,
  ArrowDownCircle,
  ArrowUpCircle,
  AlertTriangle,
  Plus,
  Minus,
  RotateCcw,
  Lock,
  Unlock,
  History,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { useWorkspace } from "@/hooks/useWorkspace";
import {
  useStockMovements,
  useAdjustStock,
  getMovementTypeLabel,
  getReasonLabel,
} from "@/hooks/useProductStock";

interface ProductStockTabProps {
  product: {
    id: string;
    name: string;
    track_stock?: boolean | null;
    stock_quantity?: number | null;
    stock_reserved?: number | null;
    low_stock_threshold?: number | null;
  };
}

const MOVEMENT_TYPES = [
  { value: "in", label: "Entrada", icon: ArrowDownCircle, color: "text-green-600" },
  { value: "out", label: "Saída", icon: ArrowUpCircle, color: "text-red-600" },
  { value: "adjustment", label: "Ajuste", icon: RotateCcw, color: "text-blue-600" },
  { value: "reserve", label: "Reservar", icon: Lock, color: "text-amber-600" },
  { value: "release", label: "Libertar", icon: Unlock, color: "text-emerald-600" },
  { value: "return", label: "Devolução", icon: RotateCcw, color: "text-purple-600" },
];

const REASONS = [
  { value: "purchase", label: "Compra" },
  { value: "sale", label: "Venda" },
  { value: "manual_adjustment", label: "Ajuste manual" },
  { value: "damage", label: "Dano/Defeito" },
  { value: "theft", label: "Roubo/Perda" },
  { value: "return", label: "Devolução" },
  { value: "correction", label: "Correção" },
  { value: "production", label: "Produção" },
  { value: "other", label: "Outro" },
];

export function ProductStockTab({ product }: ProductStockTabProps) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [movementType, setMovementType] = useState("in");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("manual_adjustment");
  const [notes, setNotes] = useState("");
  const [unitCost, setUnitCost] = useState<string>("");

  const { data: movements = [], isLoading: loadingMovements } = useStockMovements(workspaceId, product.id);
  const adjustStock = useAdjustStock();

  const stockQty = product.stock_quantity ?? 0;
  const reserved = product.stock_reserved ?? 0;
  const available = stockQty - reserved;
  const threshold = product.low_stock_threshold ?? 5;
  const isLow = stockQty > 0 && available <= threshold;
  const isOut = stockQty <= 0;

  const handleSubmit = async () => {
    if (!workspaceId || quantity <= 0) return;
    await adjustStock.mutateAsync({
      workspace_id: workspaceId,
      product_id: product.id,
      movement_type: movementType,
      quantity: movementType === "adjustment" && reason === "correction" ? quantity : Math.abs(quantity),
      reason,
      notes: notes || undefined,
      unit_cost: unitCost ? parseFloat(unitCost) : undefined,
    });
    setAdjustOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setMovementType("in");
    setQuantity(1);
    setReason("manual_adjustment");
    setNotes("");
    setUnitCost("");
  };

  const getMovementBadge = (type: string) => {
    const colors: Record<string, string> = {
      in: "bg-green-100 text-green-700",
      out: "bg-red-100 text-red-700",
      adjustment: "bg-blue-100 text-blue-700",
      reserve: "bg-amber-100 text-amber-700",
      release: "bg-emerald-100 text-emerald-700",
      transfer: "bg-indigo-100 text-indigo-700",
      return: "bg-purple-100 text-purple-700",
    };
    return (
      <Badge variant="outline" className={`${colors[type] ?? ""} border-0 text-xs`}>
        {getMovementTypeLabel(type)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stock Overview Cards */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Total em Stock</p>
          <p className="text-2xl font-bold">{stockQty}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Reservado</p>
          <p className="text-2xl font-bold text-amber-600">{reserved}</p>
        </Card>
        <Card className={`p-4 text-center ${isLow ? "border-amber-300 bg-amber-50 dark:bg-amber-950/20" : isOut ? "border-destructive bg-destructive/5" : ""}`}>
          <p className="text-xs text-muted-foreground mb-1">Disponível</p>
          <p className={`text-2xl font-bold ${isOut ? "text-destructive" : isLow ? "text-amber-600" : "text-green-600"}`}>
            {available}
          </p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Alerta Mínimo</p>
          <p className="text-2xl font-bold text-muted-foreground">{threshold}</p>
        </Card>
      </div>

      {/* Status Alert */}
      {isOut && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-4 py-3 text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="text-sm font-medium">Produto sem stock — considere fazer uma encomenda ao fornecedor.</span>
        </div>
      )}
      {isLow && !isOut && (
        <div className="flex items-center gap-2 rounded-md bg-amber-500/10 px-4 py-3 text-amber-600">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="text-sm font-medium">Stock baixo — apenas {available} unidades disponíveis (threshold: {threshold}).</span>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        {MOVEMENT_TYPES.map((mt) => {
          const Icon = mt.icon;
          return (
            <Button
              key={mt.value}
              variant="outline"
              size="sm"
              onClick={() => {
                setMovementType(mt.value);
                setAdjustOpen(true);
              }}
            >
              <Icon className={`h-4 w-4 mr-1 ${mt.color}`} />
              {mt.label}
            </Button>
          );
        })}
      </div>

      <Separator />

      {/* Movement History */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <History className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-medium">Histórico de Movimentos</h3>
          <Badge variant="secondary" className="text-xs">{movements.length}</Badge>
        </div>

        {loadingMovements ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : movements.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Sem movimentos registados</p>
          </div>
        ) : (
          <div className="rounded-md border max-h-[300px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Tipo</TableHead>
                  <TableHead className="w-[60px] text-right">Qtd</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Notas</TableHead>
                  <TableHead className="w-[60px] text-right">Saldo</TableHead>
                  <TableHead className="w-[130px]">Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{getMovementBadge(m.movement_type)}</TableCell>
                    <TableCell className="text-right font-mono">
                      <span className={m.movement_type === "in" || m.movement_type === "release" || m.movement_type === "return" ? "text-green-600" : "text-red-600"}>
                        {m.movement_type === "in" || m.movement_type === "release" || m.movement_type === "return" ? "+" : "-"}
                        {Math.abs(m.quantity)}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {m.reason ? getReasonLabel(m.reason) : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                      {m.notes ?? "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {m.balance_after ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(m.created_at), "dd/MM/yy HH:mm", { locale: pt })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Adjust Stock Dialog */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajustar Stock — {product.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo de Movimento</Label>
              <Select value={movementType} onValueChange={setMovementType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MOVEMENT_TYPES.map((mt) => (
                    <SelectItem key={mt.value} value={mt.value}>
                      {mt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Quantidade</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-24 text-center"
                  min={1}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label>Motivo</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(movementType === "in" || movementType === "return") && (
              <div>
                <Label>Custo Unitário (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            )}

            <div>
              <Label>Notas</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observações sobre este movimento..."
                rows={2}
              />
            </div>

            <div className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
              <p>Stock atual: <strong>{stockQty}</strong></p>
              <p>
                Após movimento:{" "}
                <strong>
                  {movementType === "in" || movementType === "return"
                    ? stockQty + Math.abs(quantity)
                    : movementType === "out"
                    ? Math.max(0, stockQty - Math.abs(quantity))
                    : movementType === "adjustment"
                    ? Math.max(0, stockQty + quantity)
                    : stockQty}
                </strong>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={adjustStock.isPending}>
              {adjustStock.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : null}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
