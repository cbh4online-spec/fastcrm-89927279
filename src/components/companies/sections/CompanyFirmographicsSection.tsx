import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Company } from "@/hooks/useCompanies";
import { Building2 } from "lucide-react";

interface CompanyFirmographicsSectionProps {
  company: Company;
  onFieldChange: (field: keyof Company, value: unknown) => void;
}

export function CompanyFirmographicsSection({ company, onFieldChange }: CompanyFirmographicsSectionProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          Firmographics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Ano de Fundação</Label>
            <Input
              type="number"
              value={company.founded_year ?? ""}
              onChange={(e) => onFieldChange("founded_year" as keyof Company, e.target.value ? parseInt(e.target.value) : null)}
              placeholder="2020"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Nº Funcionários</Label>
            <Select
              value={company.size || ""}
              onValueChange={(v) => onFieldChange("size", v || null)}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Selecionar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1-10">1-10</SelectItem>
                <SelectItem value="11-50">11-50</SelectItem>
                <SelectItem value="51-250">51-250</SelectItem>
                <SelectItem value="251-1000">251-1000</SelectItem>
                <SelectItem value="1000+">1000+</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Receita Anual</Label>
            <Select
              value={company.annual_revenue_range || ""}
              onValueChange={(v) => onFieldChange("annual_revenue_range" as keyof Company, v || null)}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Selecionar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="<100k">&lt;100k</SelectItem>
                <SelectItem value="100k-1M">100k-1M</SelectItem>
                <SelectItem value="1M-10M">1M-10M</SelectItem>
                <SelectItem value="10M-50M">10M-50M</SelectItem>
                <SelectItem value="50M+">50M+</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Modelo de Negócio</Label>
            <Select
              value={company.business_model || ""}
              onValueChange={(v) => onFieldChange("business_model" as keyof Company, v || null)}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Selecionar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="B2B">B2B</SelectItem>
                <SelectItem value="B2C">B2C</SelectItem>
                <SelectItem value="Hybrid">Híbrido</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Funding (€)</Label>
            <Input
              type="number"
              value={company.funding_amount ?? ""}
              onChange={(e) => onFieldChange("funding_amount" as keyof Company, e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="0"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Prioridade</Label>
            <Select
              value={company.priority_level || "medium"}
              onValueChange={(v) => onFieldChange("priority_level" as keyof Company, v)}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="strategic">Estratégica</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
