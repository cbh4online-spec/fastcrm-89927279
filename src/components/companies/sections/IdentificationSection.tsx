import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InlineEditableField } from "@/components/custom-fields/InlineEditableField";
import { InlineNifField } from "@/components/custom-fields/InlineNifField";
import { NifLookupResult } from "@/hooks/useNifLookup";
import { Company } from "@/hooks/useCompanies";
import { Badge } from "@/components/ui/badge";
import { Building2, Hash, Mail, Phone, Globe, Factory, Users, Cake, Scale, Banknote, Calendar, FileText, ExternalLink, Briefcase } from "lucide-react";

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
          {company.fax && (
            <InlineEditableField
              label="Fax"
              fieldId="fax"
              fieldType="text"
              value={company.fax}
              onChange={(val) => onFieldChange("fax", val)}
              icon={<Phone className="w-4 h-4" />}
            />
          )}
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
          <InlineEditableField
            label="Natureza Jurídica"
            fieldId="legal_nature"
            fieldType="text"
            value={company.legal_nature}
            onChange={(val) => onFieldChange("legal_nature", val)}
            icon={<Scale className="w-4 h-4" />}
          />
          <InlineEditableField
            label="Capital Social"
            fieldId="capital_social"
            fieldType="text"
            value={company.capital_social}
            onChange={(val) => onFieldChange("capital_social", val)}
            icon={<Banknote className="w-4 h-4" />}
          />
          <InlineEditableField
            label="Data de Constituição"
            fieldId="founding_date"
            fieldType="text"
            value={company.founding_date}
            onChange={(val) => onFieldChange("founding_date", val)}
            icon={<Calendar className="w-4 h-4" />}
          />
          <InlineEditableField
            label="Data de Aniversário"
            fieldId="birth_date"
            fieldType="date"
            value={(company as any).birth_date || ''}
            onChange={(val) => onFieldChange("birth_date" as keyof Company, val)}
            icon={<Cake className="w-4 h-4" />}
          />
          {company.company_status && (
            <InlineEditableField
              label="Estado"
              fieldId="company_status"
              fieldType="text"
              value={company.company_status}
              onChange={(val) => onFieldChange("company_status", val)}
              icon={<Briefcase className="w-4 h-4" />}
            />
          )}

          {/* CAE Codes */}
          {company.cae_codes && company.cae_codes.length > 0 && (
            <div className="flex items-center gap-3 py-3 px-1">
              <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground w-32 shrink-0">CAE</span>
              <div className="flex flex-wrap gap-1.5">
                {company.cae_codes.map((code) => (
                  <Badge key={code} variant="secondary" className="text-xs">{code}</Badge>
                ))}
              </div>
            </div>
          )}
          {company.cae_description && (
            <div className="flex items-start gap-3 py-3 px-1">
              <FileText className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <span className="text-sm text-muted-foreground w-32 shrink-0">Atividade</span>
              <span className="text-sm text-foreground">{company.cae_description}</span>
            </div>
          )}

          {/* About / Racius summary */}
          {company.about && (
            <div className="flex items-start gap-3 py-3 px-1">
              <Building2 className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <span className="text-sm text-muted-foreground w-32 shrink-0">Acerca</span>
              <span className="text-sm text-foreground leading-relaxed">{company.about}</span>
            </div>
          )}

          {/* Racius link */}
          {company.racius_url && (
            <div className="flex items-center gap-3 py-3 px-1">
              <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground w-32 shrink-0">Racius</span>
              <a
                href={company.racius_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                Ver perfil no Racius
              </a>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
