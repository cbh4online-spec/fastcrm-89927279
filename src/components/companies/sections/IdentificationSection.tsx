import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InlineEditableField } from "@/components/custom-fields/InlineEditableField";
import { InlineNifField } from "@/components/custom-fields/InlineNifField";
import { NifLookupResult } from "@/hooks/useNifLookup";
import { Company } from "@/hooks/useCompanies";
import { Building2, Hash, Mail, Phone, Globe, Factory, Users } from "lucide-react";

const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"];

interface IdentificationSectionProps {
  company: Company;
  onFieldChange: (field: keyof Company, value: unknown) => Promise<void>;
  onNifDataReceived: (data: NifLookupResult) => void;
}

export function IdentificationSection({ company, onFieldChange, onNifDataReceived }: IdentificationSectionProps) {
  return (
    <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-card to-card/95">
      <CardHeader className="pb-3 bg-gradient-to-r from-blue-500/10 via-transparent to-transparent">
        <CardTitle className="text-base font-semibold flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/20 text-blue-600 dark:text-blue-400">
            <Building2 className="w-4 h-4" />
          </div>
          Identificação
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="divide-y divide-border/50">
          <InlineEditableField
            label="Nome"
            fieldId="name"
            fieldType="text"
            value={company.name}
            onChange={(val) => onFieldChange("name", val)}
            icon={<Building2 className="w-4 h-4" />}
            required
          />
          <InlineEditableField
            label="Nº Cliente"
            fieldId="client_number"
            fieldType="text"
            value={company.client_number}
            onChange={(val) => onFieldChange("client_number", val)}
            icon={<Hash className="w-4 h-4" />}
            placeholder="Ex: CLI-00001"
          />
          <InlineNifField
            label="NIF"
            value={company.tax_id}
            onChange={async (val) => {
              await onFieldChange("tax_id", val);
            }}
            onDataReceived={onNifDataReceived}
            icon={<Hash className="w-4 h-4" />}
          />
          <InlineEditableField
            label="E-mail"
            fieldId="email"
            fieldType="email"
            value={company.email}
            onChange={(val) => onFieldChange("email", val)}
            icon={<Mail className="w-4 h-4" />}
            isLink={!!company.email}
            linkType="email"
          />
          <InlineEditableField
            label="Telefone"
            fieldId="phone"
            fieldType="phone"
            value={company.phone}
            onChange={(val) => onFieldChange("phone", val)}
            icon={<Phone className="w-4 h-4" />}
            isLink={!!company.phone}
            linkType="phone"
          />
          <InlineEditableField
            label="Website"
            fieldId="website"
            fieldType="text"
            value={company.website}
            onChange={(val) => onFieldChange("website", val)}
            icon={<Globe className="w-4 h-4" />}
            isLink={!!company.website}
            linkType="url"
          />
          <InlineEditableField
            label="Setor"
            fieldId="industry"
            fieldType="text"
            value={company.industry}
            onChange={(val) => onFieldChange("industry", val)}
            icon={<Factory className="w-4 h-4" />}
          />
          <InlineEditableField
            label="Tamanho"
            fieldId="size"
            fieldType="select"
            value={company.size}
            onChange={(val) => onFieldChange("size", val)}
            icon={<Users className="w-4 h-4" />}
            options={COMPANY_SIZES}
          />
        </div>
      </CardContent>
    </Card>
  );
}
