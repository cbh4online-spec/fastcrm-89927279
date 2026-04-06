import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { User, Building2, Mail, Phone, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface TicketClientCardProps {
  contactId: string | null;
  companyId: string | null;
}

export function TicketClientCard({ contactId, companyId }: TicketClientCardProps) {
  const navigate = useNavigate();

  const { data: contact } = useQuery({
    queryKey: ["ticket-contact", contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("id, name, email, phone, company, job_title")
        .eq("id", contactId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!contactId,
  });

  const { data: company } = useQuery({
    queryKey: ["ticket-company", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name, email, phone, industry")
        .eq("id", companyId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  if (!contact && !company) {
    return (
      <div className="text-xs text-muted-foreground italic">
        Nenhum cliente associado
      </div>
    );
  }

  const initials = (name: string) =>
    name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();

  return (
    <div className="space-y-3">
      {/* Contact */}
      {contact && (
        <div className="flex items-start gap-2.5">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
              {initials(contact.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium truncate">{contact.name}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 shrink-0"
                onClick={() => navigate(`/dashboard/contacts/${contact.id}`)}
                title="Ver ficha do contacto"
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
            {contact.job_title && (
              <p className="text-[10px] text-muted-foreground truncate">{contact.job_title}</p>
            )}
            {contact.email && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Mail className="h-2.5 w-2.5 shrink-0" />
                <a href={`mailto:${contact.email}`} className="truncate hover:text-foreground transition-colors">
                  {contact.email}
                </a>
              </div>
            )}
            {contact.phone && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Phone className="h-2.5 w-2.5 shrink-0" />
                <a href={`tel:${contact.phone}`} className="hover:text-foreground transition-colors">
                  {contact.phone}
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Company */}
      {company && (
        <div className="flex items-start gap-2.5">
          <div className="h-8 w-8 shrink-0 rounded bg-muted flex items-center justify-center">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium truncate">{company.name}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 shrink-0"
                onClick={() => navigate(`/dashboard/companies/${company.id}`)}
                title="Ver ficha da empresa"
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
            {company.industry && (
              <p className="text-[10px] text-muted-foreground truncate">{company.industry}</p>
            )}
            {company.email && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Mail className="h-2.5 w-2.5 shrink-0" />
                <span className="truncate">{company.email}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
