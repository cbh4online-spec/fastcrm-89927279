import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InlineEditableField } from "@/components/custom-fields/InlineEditableField";
import { Lead } from "@/hooks/useLeads";
import { User, Mail, Phone, Briefcase, Tag, Cake } from "lucide-react";

const LEAD_SOURCES = ["Instagram", "WhatsApp", "Website", "Referral", "Email", "Facebook", "LinkedIn", "Outro"];
const LEAD_STATUSES = ["new", "in_progress", "completed"];

interface IdentificationSectionProps {
  lead: Lead;
  onFieldChange: (field: keyof Lead, value: unknown) => Promise<void>;
}

export function IdentificationSection({ lead, onFieldChange }: IdentificationSectionProps) {
  return (
    <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-card to-card/95">
      <CardHeader className="pb-3 bg-gradient-to-r from-violet-500/10 via-transparent to-transparent">
        <CardTitle className="text-base font-semibold flex items-center gap-3">
          <div className="p-2 rounded-lg bg-violet-500/20 text-violet-600 dark:text-violet-400">
            <User className="w-4 h-4" />
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
            value={lead.name}
            onChange={(val) => onFieldChange("name", val)}
            icon={<User className="w-4 h-4" />}
            required
          />
          <InlineEditableField
            label="E-mail"
            fieldId="email"
            fieldType="email"
            value={lead.email}
            onChange={(val) => onFieldChange("email", val)}
            icon={<Mail className="w-4 h-4" />}
            isLink={!!lead.email}
            linkType="email"
          />
          <InlineEditableField
            label="Telefone"
            fieldId="phone"
            fieldType="phone"
            value={lead.phone}
            onChange={(val) => onFieldChange("phone", val)}
            icon={<Phone className="w-4 h-4" />}
            isLink={!!lead.phone}
            linkType="phone"
          />
          <InlineEditableField
            label="Origem"
            fieldId="source"
            fieldType="select"
            value={lead.source}
            onChange={(val) => onFieldChange("source", val)}
            icon={<Briefcase className="w-4 h-4" />}
            options={LEAD_SOURCES}
          />
          <InlineEditableField
            label="Estado"
            fieldId="status"
            fieldType="select"
            value={lead.status}
            onChange={(val) => onFieldChange("status", val)}
            icon={<Tag className="w-4 h-4" />}
            options={LEAD_STATUSES}
          />
          <InlineEditableField
            label="Data de Nascimento"
            fieldId="birth_date"
            fieldType="date"
            value={(lead as any).birth_date || ''}
            onChange={(val) => onFieldChange("birth_date" as keyof Lead, val)}
            icon={<Cake className="w-4 h-4" />}
          />
        </div>
      </CardContent>
    </Card>
  );
}
