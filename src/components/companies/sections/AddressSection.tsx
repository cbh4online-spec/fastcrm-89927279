import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InlineEditableField } from "@/components/custom-fields/InlineEditableField";
import { Company } from "@/hooks/useCompanies";
import { MapPin, Home, Flag } from "lucide-react";

interface AddressSectionProps {
  company: Company;
  onFieldChange: (field: keyof Company, value: unknown) => Promise<void>;
}

export function AddressSection({ company, onFieldChange }: AddressSectionProps) {
  return (
    <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-card to-card/95">
      <CardHeader className="pb-3 bg-gradient-to-r from-emerald-500/10 via-transparent to-transparent">
        <CardTitle className="text-base font-semibold flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <MapPin className="w-4 h-4" />
          </div>
          Morada
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="divide-y divide-border/50">
          <InlineEditableField
            label="Morada"
            fieldId="address"
            fieldType="textarea"
            value={company.address}
            onChange={(val) => onFieldChange("address", val)}
            icon={<Home className="w-4 h-4" />}
            placeholder="Morada completa..."
          />
          <InlineEditableField
            label="País"
            fieldId="country"
            fieldType="text"
            value="Portugal"
            onChange={(val) => onFieldChange("country" as keyof Company, val)}
            icon={<Flag className="w-4 h-4" />}
          />
        </div>
      </CardContent>
    </Card>
  );
}
