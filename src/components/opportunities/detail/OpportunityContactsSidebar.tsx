import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Mail, 
  Phone, 
  MoreHorizontal, 
  Plus,
  Building2,
  MapPin,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Contact {
  id: string;
  name: string;
  role?: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  type: "primary" | "influencer" | "approver";
}

interface Company {
  id: string;
  name: string;
  industry?: string;
  city?: string;
  employee_count?: number;
  logo_url?: string;
}

interface OpportunityContactsSidebarProps {
  contacts: Contact[];
  company?: Company | null;
  onAddContact?: () => void;
  onContactClick?: (contact: Contact) => void;
  onCompanyClick?: (company: Company) => void;
}

const contactTypeLabels: Record<string, { label: string; color: string }> = {
  primary: { label: "Contacto Principal", color: "bg-emerald-100 text-emerald-700" },
  influencer: { label: "Key Influencer", color: "bg-blue-100 text-blue-700" },
  approver: { label: "Final Approver", color: "bg-purple-100 text-purple-700" },
};

export function OpportunityContactsSidebar({
  contacts,
  company,
  onAddContact,
  onContactClick,
  onCompanyClick,
}: OpportunityContactsSidebarProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  const formatEmployeeCount = (count?: number) => {
    if (!count) return null;
    if (count >= 100000) return "100K+";
    if (count >= 10000) return "10K+";
    if (count >= 1000) return `${(count / 1000).toFixed(0)}K+`;
    return `${count}+`;
  };

  return (
    <div className="space-y-6">
      {/* Contacts Section */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3 px-4 pt-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              Contactos
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onAddContact}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </CardTitle>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-4">
          {contacts.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Sem contactos associados</p>
            </div>
          ) : (
            contacts.map((contact) => {
              const typeConfig = contactTypeLabels[contact.type] || contactTypeLabels.primary;
              
              return (
                <div
                  key={contact.id}
                  className="space-y-2 cursor-pointer"
                  onClick={() => onContactClick?.(contact)}
                >
                  <Badge className={cn("text-[10px] px-2 py-0", typeConfig.color)}>
                    {typeConfig.label}
                  </Badge>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={contact.avatar_url} />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {getInitials(contact.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">{contact.name}</p>
                        {contact.role && (
                          <p className="text-xs text-muted-foreground">{contact.role}</p>
                        )}
                        {contact.email && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            <span className="text-primary">{contact.email}</span>
                          </div>
                        )}
                        {contact.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span>{contact.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Company Section */}
      {company && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-3 px-4 pt-4">
            <CardTitle className="text-sm font-semibold">Empresa</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div
              className="cursor-pointer"
              onClick={() => onCompanyClick?.(company)}
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10 rounded-lg">
                    <AvatarImage src={company.logo_url} />
                    <AvatarFallback className="rounded-lg text-xs bg-primary text-primary-foreground">
                      {getInitials(company.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{company.name}</p>
                    {company.industry && (
                      <p className="text-xs text-muted-foreground">{company.industry}</p>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                {company.industry && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Indústria</p>
                    <p className="font-medium">{company.industry}</p>
                  </div>
                )}
                {company.city && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Localização</p>
                    <p className="font-medium">{company.city}</p>
                  </div>
                )}
                {company.employee_count && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground mb-1">Nº Colaboradores</p>
                    <Badge variant="secondary" className="text-xs">
                      {formatEmployeeCount(company.employee_count)}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
