import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useProductDeliverables,
  useCreateDeliverable,
  useDeleteDeliverable,
  useToggleDeliverable,
  DELIVERABLE_TYPE_CONFIG,
} from "@/hooks/useProductDeliverables";
import { FileDown, KeyRound, GraduationCap, Key, Plus, Trash2, Package, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ReactNode> = {
  FileDown: <FileDown className="h-4 w-4" />,
  KeyRound: <KeyRound className="h-4 w-4" />,
  GraduationCap: <GraduationCap className="h-4 w-4" />,
  Key: <Key className="h-4 w-4" />,
};

interface ProductDeliverablesManagerProps {
  productId: string;
}

export function ProductDeliverablesManager({ productId }: ProductDeliverablesManagerProps) {
  const { data: deliverables = [], isLoading } = useProductDeliverables(productId);
  const createDeliverable = useCreateDeliverable();
  const deleteDeliverable = useDeleteDeliverable();
  const toggleDeliverable = useToggleDeliverable();
  const [adding, setAdding] = useState(false);
  const [newType, setNewType] = useState<string>("file");
  const [newLabel, setNewLabel] = useState("");
  const [newConfig, setNewConfig] = useState<Record<string, string>>({});

  const handleAdd = () => {
    if (!newLabel.trim()) return;
    createDeliverable.mutate(
      { product_id: productId, deliverable_type: newType, label: newLabel.trim(), config: newConfig },
      {
        onSuccess: () => {
          setAdding(false);
          setNewLabel("");
          setNewConfig({});
        },
      }
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            Entregáveis Digitais
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => setAdding(true)} className="gap-1">
            <Plus className="h-3.5 w-3.5" />
            Adicionar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : deliverables.length === 0 && !adding ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Sem entregáveis configurados. Adicione ficheiros, acessos ou inscrições automáticas.
          </p>
        ) : (
          deliverables.map((d) => {
            const typeConf = DELIVERABLE_TYPE_CONFIG[d.deliverable_type as keyof typeof DELIVERABLE_TYPE_CONFIG];
            return (
              <div key={d.id} className={cn("flex items-center gap-3 p-3 rounded-lg border", !d.is_active && "opacity-50")}>
                <div className="text-primary">{iconMap[typeConf?.icon || "FileDown"]}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{d.label}</p>
                  <p className="text-xs text-muted-foreground">{typeConf?.label || d.deliverable_type}</p>
                </div>
                <Switch
                  checked={d.is_active}
                  onCheckedChange={(checked) =>
                    toggleDeliverable.mutate({ id: d.id, productId, isActive: checked })
                  }
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => deleteDeliverable.mutate({ id: d.id, productId })}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })
        )}

        {adding && (
          <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo</Label>
                <Select value={newType} onValueChange={setNewType}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(DELIVERABLE_TYPE_CONFIG).map(([key, conf]) => (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-2">
                          {iconMap[conf.icon]}
                          {conf.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Nome</Label>
                <Input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Ex: Manual PDF"
                  className="h-9"
                />
              </div>
            </div>

            {/* Type-specific config fields */}
            {newType === "file" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Caminho no Storage (ex: manuais/guia.pdf)</Label>
                <Input
                  value={newConfig.storage_path || ""}
                  onChange={(e) => setNewConfig({ ...newConfig, storage_path: e.target.value })}
                  placeholder="pasta/ficheiro.pdf"
                  className="h-9"
                />
              </div>
            )}
            {newType === "course_enrollment" && (
              <div className="space-y-1.5">
                <Label className="text-xs">ID do Curso (Student Journey)</Label>
                <Input
                  value={newConfig.course_id || ""}
                  onChange={(e) => setNewConfig({ ...newConfig, course_id: e.target.value })}
                  placeholder="UUID do curso"
                  className="h-9"
                />
              </div>
            )}
            {newType === "license_key" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Prefixo da chave</Label>
                <Input
                  value={newConfig.prefix || ""}
                  onChange={(e) => setNewConfig({ ...newConfig, prefix: e.target.value })}
                  placeholder="FC"
                  className="h-9"
                />
              </div>
            )}
            {newType === "portal_access" && (
              <div className="space-y-1.5">
                <Label className="text-xs">IDs dos Entitlements (separados por vírgula)</Label>
                <Input
                  value={newConfig.entitlement_ids || ""}
                  onChange={(e) => setNewConfig({ ...newConfig, entitlement_ids: e.target.value })}
                  placeholder="uuid1,uuid2"
                  className="h-9"
                />
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => { setAdding(false); setNewLabel(""); setNewConfig({}); }}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleAdd} disabled={createDeliverable.isPending || !newLabel.trim()}>
                Guardar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
