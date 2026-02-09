import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff, Link, Copy } from "lucide-react";
import { toast } from "sonner";
import { useUpdateProductVisibility } from "@/hooks/useStoreConditionalOffers";

interface ProductVisibilityControlProps {
  productId: string;
  currentVisibility: string;
  storeSlug?: string;
}

const visibilityConfig = {
  public: { label: "Público", icon: Eye, color: "text-success", description: "Visível na loja" },
  unlisted: { label: "Não listado", icon: Link, color: "text-warning", description: "Apenas via link direto" },
  hidden: { label: "Oculto", icon: EyeOff, color: "text-destructive", description: "Apenas via CRM/automação" },
};

export function ProductVisibilityControl({ productId, currentVisibility, storeSlug }: ProductVisibilityControlProps) {
  const updateVisibility = useUpdateProductVisibility();

  const config = visibilityConfig[currentVisibility as keyof typeof visibilityConfig] || visibilityConfig.public;
  const Icon = config.icon;

  const copyLink = () => {
    const url = `${window.location.origin}/store/${storeSlug}/product/${productId}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  return (
    <div className="flex items-center gap-2">
      <Select
        value={currentVisibility || "public"}
        onValueChange={(v) => updateVisibility.mutate({ productId, visibility: v })}
      >
        <SelectTrigger className="w-[160px] h-8 text-xs">
          <div className="flex items-center gap-1.5">
            <Icon className={`h-3.5 w-3.5 ${config.color}`} />
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent>
          {Object.entries(visibilityConfig).map(([key, cfg]) => (
            <SelectItem key={key} value={key}>
              <div className="flex items-center gap-2">
                <cfg.icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                <div>
                  <p className="text-sm">{cfg.label}</p>
                  <p className="text-[10px] text-muted-foreground">{cfg.description}</p>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {(currentVisibility === "unlisted" || currentVisibility === "hidden") && storeSlug && (
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={copyLink} title="Copiar link direto">
          <Copy className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

export function ProductVisibilityBadge({ visibility }: { visibility: string }) {
  const config = visibilityConfig[visibility as keyof typeof visibilityConfig];
  if (!config || visibility === "public") return null;
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`text-[10px] gap-1 ${config.color}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
