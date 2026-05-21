import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export interface SafTImportOpts {
  create_customers: boolean;
  create_products: boolean;
  import_payments: boolean;
}

export function SafTMappingPanel({
  value, onChange,
}: { value: SafTImportOpts; onChange: (v: SafTImportOpts) => void }) {
  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Label className="text-base">Criar clientes em falta</Label>
          <p className="text-sm text-muted-foreground">
            Clientes do SAF-T sem correspondência por NIF são criados em Contactos.
          </p>
        </div>
        <Switch checked={value.create_customers} onCheckedChange={(v) => onChange({ ...value, create_customers: v })} />
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <Label className="text-base">Criar produtos em falta</Label>
          <p className="text-sm text-muted-foreground">
            Produtos do SAF-T sem correspondência por código são criados no catálogo.
          </p>
        </div>
        <Switch checked={value.create_products} onCheckedChange={(v) => onChange({ ...value, create_products: v })} />
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <Label className="text-base">Importar pagamentos</Label>
          <p className="text-sm text-muted-foreground">
            Cria recibos em Pagamentos a partir dos documentos de pagamento do SAF-T.
          </p>
        </div>
        <Switch checked={value.import_payments} onCheckedChange={(v) => onChange({ ...value, import_payments: v })} />
      </div>
    </Card>
  );
}
