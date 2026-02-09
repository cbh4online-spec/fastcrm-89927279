import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { UserCircle, Building2, Target, Megaphone, ExternalLink } from "lucide-react";

interface AssociationProps {
  order: Record<string, unknown>;
}

export function StoreOrderAssociations({ order }: AssociationProps) {
  const contact = order.contacts as Record<string, string> | null;
  const company = order.companies as Record<string, string> | null;
  const opportunity = order.opportunities as Record<string, string> | null;
  const campaign = order.marketing_campaigns as Record<string, string> | null;

  const associations = [
    { label: "Contacto", icon: <UserCircle className="h-4 w-4" />, data: contact, link: contact ? `/contacts/${contact.id}` : null },
    { label: "Empresa", icon: <Building2 className="h-4 w-4" />, data: company, link: company ? `/dashboard/companies/${company.id}` : null },
    { label: "Oportunidade", icon: <Target className="h-4 w-4" />, data: opportunity, link: opportunity ? `/dashboard/opportunities/${opportunity.id}` : null },
    { label: "Campanha", icon: <Megaphone className="h-4 w-4" />, data: campaign, link: null },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Associações CRM</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {associations.map(({ label, icon, data, link }) => (
          <div key={label} className="flex items-center justify-between py-1.5">
            <div className="flex items-center gap-2 text-sm">
              {icon}
              <span className="text-muted-foreground">{label}:</span>
              <span className="font-medium">{data?.name || data?.email || "—"}</span>
            </div>
            {link && (
              <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                <Link to={link}><ExternalLink className="h-3.5 w-3.5" /></Link>
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
