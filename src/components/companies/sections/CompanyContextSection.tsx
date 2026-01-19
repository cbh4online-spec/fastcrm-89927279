import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Sparkles, 
  Users, 
  Briefcase, 
  Target, 
  Award, 
  Building2,
  Package,
  Heart,
  Lightbulb,
  Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CompanyContext {
  about_us?: string;
  services?: string;
  products?: string;
  clients?: string;
  team_info?: string;
  mission_values?: string;
  differentiators?: string;
  certifications?: string;
  target_market?: string;
  year_founded?: string;
  extracted_at?: string;
}

interface CompanyContextSectionProps {
  companyContext: CompanyContext | null;
  className?: string;
}

interface ContextFieldProps {
  icon: React.ElementType;
  label: string;
  value: string | undefined;
  variant?: "default" | "list";
}

function ContextField({ icon: Icon, label, value, variant = "default" }: ContextFieldProps) {
  if (!value) return null;

  const renderValue = () => {
    if (variant === "list" && value.includes(" | ")) {
      const items = value.split(" | ").filter(Boolean);
      return (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {items.map((item, index) => (
            <Badge key={index} variant="secondary" className="text-xs font-normal">
              {item.trim()}
            </Badge>
          ))}
        </div>
      );
    }
    return <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{value}</p>;
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Icon className="h-4 w-4 text-primary" />
        {label}
      </div>
      {renderValue()}
    </div>
  );
}

export function CompanyContextSection({ companyContext, className }: CompanyContextSectionProps) {
  if (!companyContext || Object.keys(companyContext).length === 0) {
    return null;
  }

  const hasContent = 
    companyContext.about_us ||
    companyContext.services ||
    companyContext.products ||
    companyContext.clients ||
    companyContext.team_info ||
    companyContext.mission_values ||
    companyContext.differentiators ||
    companyContext.certifications ||
    companyContext.target_market ||
    companyContext.year_founded;

  if (!hasContent) {
    return null;
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          Contexto Empresarial
          <Badge variant="outline" className="text-xs font-normal ml-auto">
            Extraído do Website
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* About / Description */}
        <ContextField 
          icon={Building2} 
          label="Sobre a Empresa" 
          value={companyContext.about_us} 
        />

        {companyContext.about_us && (companyContext.services || companyContext.products) && (
          <Separator />
        )}

        {/* Services & Products */}
        <div className="grid gap-4 md:grid-cols-2">
          <ContextField 
            icon={Briefcase} 
            label="Serviços" 
            value={companyContext.services}
            variant="list"
          />
          <ContextField 
            icon={Package} 
            label="Produtos" 
            value={companyContext.products}
            variant="list"
          />
        </div>

        {(companyContext.services || companyContext.products) && companyContext.clients && (
          <Separator />
        )}

        {/* Clients */}
        <ContextField 
          icon={Users} 
          label="Clientes" 
          value={companyContext.clients}
          variant="list"
        />

        {companyContext.clients && (companyContext.mission_values || companyContext.differentiators) && (
          <Separator />
        )}

        {/* Mission & Differentiators */}
        <div className="grid gap-4 md:grid-cols-2">
          <ContextField 
            icon={Heart} 
            label="Missão e Valores" 
            value={companyContext.mission_values}
          />
          <ContextField 
            icon={Lightbulb} 
            label="Diferenciais" 
            value={companyContext.differentiators}
          />
        </div>

        {(companyContext.mission_values || companyContext.differentiators) && 
         (companyContext.team_info || companyContext.target_market) && (
          <Separator />
        )}

        {/* Team & Target Market */}
        <div className="grid gap-4 md:grid-cols-2">
          <ContextField 
            icon={Users} 
            label="Equipa" 
            value={companyContext.team_info}
          />
          <ContextField 
            icon={Target} 
            label="Mercado-alvo" 
            value={companyContext.target_market}
          />
        </div>

        {(companyContext.team_info || companyContext.target_market) && 
         (companyContext.certifications || companyContext.year_founded) && (
          <Separator />
        )}

        {/* Certifications & Year Founded */}
        <div className="grid gap-4 md:grid-cols-2">
          <ContextField 
            icon={Award} 
            label="Certificações" 
            value={companyContext.certifications}
            variant="list"
          />
          <ContextField 
            icon={Calendar} 
            label="Ano de Fundação" 
            value={companyContext.year_founded}
          />
        </div>

        {/* Extracted timestamp */}
        {companyContext.extracted_at && (
          <p className="text-xs text-muted-foreground text-right pt-2">
            Atualizado em {new Date(companyContext.extracted_at).toLocaleDateString('pt-PT', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
