import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdminStoreCategories } from "@/hooks/useAdminStoreCategories";

interface ProductDetails {
  name: string;
  price: string;
  categoryId: string;
  publishNow: boolean;
}

interface MQPCStepDetailsProps {
  details: ProductDetails;
  onDetailsChange: (details: ProductDetails) => void;
  errors: Record<string, string>;
  aiPrefilled?: boolean;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function MQPCStepDetails({ details, onDetailsChange, errors, aiPrefilled }: MQPCStepDetailsProps) {
  const { data: categories = [] } = useAdminStoreCategories();

  const update = (field: keyof ProductDetails, value: string | boolean) => {
    onDetailsChange({ ...details, [field]: value });
  };

  return (
    <div className="space-y-5">
      <div className="text-center space-y-2">
        <h2 className="text-lg font-semibold">Dados do Produto</h2>
        <p className="text-sm text-muted-foreground">
          {aiPrefilled ? "Revise os dados preenchidos pela IA" : "Informação essencial para criar o produto"}
        </p>
        {aiPrefilled && (
          <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
            ✨ Preenchido por IA
          </span>
        )}
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="mqpc-name">Nome *</Label>
          <Input
            id="mqpc-name"
            placeholder="Ex: Câmara IP 4MP"
            value={details.name}
            onChange={(e) => update("name", e.target.value)}
            className={errors.name ? "border-destructive" : ""}
            autoFocus
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          {details.name && (
            <p className="text-xs text-muted-foreground">
              Slug: {slugify(details.name)}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="mqpc-price">Preço (€) *</Label>
          <Input
            id="mqpc-price"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={details.price}
            onChange={(e) => update("price", e.target.value)}
            className={`text-lg font-semibold ${errors.price ? "border-destructive" : ""}`}
          />
          {errors.price && <p className="text-xs text-destructive">{errors.price}</p>}
        </div>

        <div className="space-y-2">
          <Label>Categoria *</Label>
          <Select
            value={details.categoryId}
            onValueChange={(v) => update("categoryId", v)}
          >
            <SelectTrigger className={errors.categoryId ? "border-destructive" : ""}>
              <SelectValue placeholder="Selecionar categoria" />
            </SelectTrigger>
            <SelectContent>
              {categories.filter(c => c.is_active).map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.categoryId && <p className="text-xs text-destructive">{errors.categoryId}</p>}
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border">
          <div>
            <p className="font-medium text-sm">Publicar já na Loja</p>
            <p className="text-xs text-muted-foreground">
              {details.publishNow ? "Produto ficará visível" : "Guardado como rascunho"}
            </p>
          </div>
          <Switch
            checked={details.publishNow}
            onCheckedChange={(v) => update("publishNow", v)}
          />
        </div>
      </div>
    </div>
  );
}

export type { ProductDetails };
