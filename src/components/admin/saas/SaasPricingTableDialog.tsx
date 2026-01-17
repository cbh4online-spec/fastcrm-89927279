import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { 
  useCreateSaasPricingTable, 
  useUpdateSaasPricingTable, 
  SaasPricingTable,
  pricingTypeLabels,
  targetSegmentLabels
} from "@/hooks/useSaasPricingTables";

interface SaasPricingTableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pricingTable?: SaasPricingTable | null;
}

const pricingTypes: SaasPricingTable["pricing_type"][] = ["segment", "volume", "promotional", "tiered"];
const targetSegments: Array<keyof typeof targetSegmentLabels> = ["startup", "smb", "enterprise", "agency", "partner", "reseller"];

export function SaasPricingTableDialog({ open, onOpenChange, pricingTable }: SaasPricingTableDialogProps) {
  const createTable = useCreateSaasPricingTable();
  const updateTable = useUpdateSaasPricingTable();
  const isEditing = !!pricingTable;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pricingType, setPricingType] = useState<string>("segment");
  const [targetSegment, setTargetSegment] = useState<string>("");
  const [basePrice, setBasePrice] = useState<string>("");
  const [discountPercent, setDiscountPercent] = useState<string>("");
  const [validFrom, setValidFrom] = useState<string>("");
  const [validUntil, setValidUntil] = useState<string>("");
  const [isActive, setIsActive] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [priority, setPriority] = useState<string>("0");

  useEffect(() => {
    if (pricingTable) {
      setName(pricingTable.name);
      setDescription(pricingTable.description || "");
      setPricingType(pricingTable.pricing_type);
      setTargetSegment(pricingTable.target_segment || "");
      setBasePrice(pricingTable.base_price?.toString() || "");
      setDiscountPercent(pricingTable.discount_percent?.toString() || "");
      setValidFrom(pricingTable.valid_from?.split("T")[0] || "");
      setValidUntil(pricingTable.valid_until?.split("T")[0] || "");
      setIsActive(pricingTable.is_active);
      setIsDefault(pricingTable.is_default);
      setPriority(pricingTable.priority?.toString() || "0");
    } else {
      setName("");
      setDescription("");
      setPricingType("segment");
      setTargetSegment("");
      setBasePrice("");
      setDiscountPercent("");
      setValidFrom("");
      setValidUntil("");
      setIsActive(true);
      setIsDefault(false);
      setPriority("0");
    }
  }, [pricingTable, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      name,
      description: description || undefined,
      pricing_type: pricingType as SaasPricingTable["pricing_type"],
      target_segment: targetSegment || undefined,
      base_price: basePrice ? parseFloat(basePrice) : undefined,
      discount_percent: discountPercent ? parseFloat(discountPercent) : undefined,
      valid_from: validFrom || undefined,
      valid_until: validUntil || undefined,
      is_active: isActive,
      is_default: isDefault,
      priority: parseInt(priority) || 0,
    };

    if (isEditing && pricingTable) {
      await updateTable.mutateAsync({ id: pricingTable.id, ...data });
    } else {
      await createTable.mutateAsync(data);
    }

    onOpenChange(false);
  };

  const isSubmitting = createTable.isPending || updateTable.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Tabela de Preços" : "Nova Tabela de Preços SaaS"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Preço Parceiros, Black Friday..."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pricingType">Tipo de Tabela *</Label>
              <Select value={pricingType} onValueChange={setPricingType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pricingTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {pricingTypeLabels[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetSegment">Segmento Alvo</Label>
              <Select value={targetSegment} onValueChange={setTargetSegment}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os segmentos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  {targetSegments.map((segment) => (
                    <SelectItem key={segment} value={segment}>
                      {targetSegmentLabels[segment]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição da tabela de preços..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="basePrice">Preço Base (€)</Label>
              <Input
                id="basePrice"
                type="number"
                step="0.01"
                min="0"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="discountPercent">Desconto (%)</Label>
              <Input
                id="discountPercent"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          {pricingType === "promotional" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="validFrom">Válido de</Label>
                <Input
                  id="validFrom"
                  type="date"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="validUntil">Válido até</Label>
                <Input
                  id="validUntil"
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Prioridade</Label>
              <Input
                id="priority"
                type="number"
                min="0"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">
                Tabelas com maior prioridade têm precedência
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
                <Label htmlFor="isActive" className="cursor-pointer">
                  Ativa
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="isDefault"
                  checked={isDefault}
                  onCheckedChange={setIsDefault}
                />
                <Label htmlFor="isDefault" className="cursor-pointer">
                  Padrão
                </Label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? "Guardar" : "Criar Tabela"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
