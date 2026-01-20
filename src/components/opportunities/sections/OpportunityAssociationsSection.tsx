import { Opportunity } from "@/types/opportunity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InlineEntitySelect } from "@/components/custom-fields/InlineEntitySelect";
import { User, Building2, UserCheck } from "lucide-react";
import { toast } from "sonner";

interface EntityOption {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  website?: string | null;
}

interface OpportunityAssociationsSectionProps {
  opportunity: Opportunity;
  leads: EntityOption[];
  contacts: EntityOption[];
  companies: EntityOption[];
  onUpdate: (updates: { id: string } & Record<string, unknown>) => Promise<void>;
  isLoadingLeads?: boolean;
  isLoadingContacts?: boolean;
  isLoadingCompanies?: boolean;
}

export function OpportunityAssociationsSection({
  opportunity,
  leads,
  contacts,
  companies,
  onUpdate,
  isLoadingLeads,
  isLoadingContacts,
  isLoadingCompanies,
}: OpportunityAssociationsSectionProps) {
  const handleLeadChange = async (leadId: string | null) => {
    try {
      await onUpdate({ id: opportunity.id, lead_id: leadId });
      toast.success(leadId ? "Lead associado" : "Lead removido");
    } catch (error) {
      console.error("Error updating lead:", error);
      toast.error("Erro ao atualizar lead");
    }
  };

  const handleContactChange = async (contactId: string | null) => {
    try {
      await onUpdate({ id: opportunity.id, contact_id: contactId });
      toast.success(contactId ? "Contacto associado" : "Contacto removido");
    } catch (error) {
      console.error("Error updating contact:", error);
      toast.error("Erro ao atualizar contacto");
    }
  };

  const handleCompanyChange = async (companyId: string | null) => {
    try {
      await onUpdate({ id: opportunity.id, company_id: companyId });
      toast.success(companyId ? "Empresa associada" : "Empresa removida");
    } catch (error) {
      console.error("Error updating company:", error);
      toast.error("Erro ao atualizar empresa");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-primary" />
          Associações
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 divide-y divide-border/30">
        <InlineEntitySelect
          label="Lead"
          icon={<User className="w-4 h-4" />}
          value={opportunity.lead_id}
          displayValue={opportunity.lead?.name}
          secondaryInfo={opportunity.lead?.email}
          options={leads}
          onChange={handleLeadChange}
          placeholder="Selecionar lead..."
          isLoading={isLoadingLeads}
        />
        <InlineEntitySelect
          label="Contacto"
          icon={<User className="w-4 h-4" />}
          value={opportunity.contact_id}
          displayValue={opportunity.contact?.name}
          secondaryInfo={opportunity.contact?.email}
          options={contacts}
          onChange={handleContactChange}
          placeholder="Selecionar contacto..."
          isLoading={isLoadingContacts}
        />
        <InlineEntitySelect
          label="Empresa"
          icon={<Building2 className="w-4 h-4" />}
          value={opportunity.company_id}
          displayValue={opportunity.company?.name}
          secondaryInfo={opportunity.company?.website}
          options={companies}
          onChange={handleCompanyChange}
          placeholder="Selecionar empresa..."
          isLoading={isLoadingCompanies}
        />
      </CardContent>
    </Card>
  );
}
