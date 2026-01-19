import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Building2, 
  ExternalLink, 
  Mail, 
  Phone, 
  Globe, 
  MapPin,
  Unlink,
  Link as LinkIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LinkedCompanyCardProps {
  companyId: string | null | undefined;
  contactId: string;
  onUnlink?: () => void;
  onLink?: () => void;
  className?: string;
}

interface Company {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  industry: string | null;
  address: string | null;
  city: string | null;
  tax_id: string | null;
}

export function LinkedCompanyCard({ 
  companyId, 
  contactId,
  onUnlink,
  onLink,
  className 
}: LinkedCompanyCardProps) {
  const navigate = useNavigate();

  const { data: company, isLoading } = useQuery({
    queryKey: ['linked-company', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, email, phone, website, industry, address, city, tax_id')
        .eq('id', companyId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      return data as Company;
    },
    enabled: !!companyId,
  });

  if (!companyId) {
    return (
      <Card className={cn("bg-muted/30", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            Empresa Associada
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <Building2 className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground mb-3">
              Nenhuma empresa associada
            </p>
            {onLink && (
              <Button variant="outline" size="sm" onClick={onLink} className="gap-2">
                <LinkIcon className="w-3.5 h-3.5" />
                Associar Empresa
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            Empresa Associada
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!company) {
    return (
      <Card className={cn("bg-muted/30", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            Empresa Associada
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Empresa não encontrada
          </p>
        </CardContent>
      </Card>
    );
  }

  const initials = company.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            Empresa Associada
          </CardTitle>
          <div className="flex items-center gap-1">
            {onUnlink && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={onUnlink}
              >
                <Unlink className="w-3.5 h-3.5" />
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={() => navigate(`/dashboard/companies/${company.id}`)}
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Company Header */}
        <div 
          className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 -mx-2 px-2 py-1.5 rounded-md transition-colors"
          onClick={() => navigate(`/dashboard/companies/${company.id}`)}
        >
          <Avatar className="h-12 w-12 ring-2 ring-primary/10">
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm truncate">{company.name}</h4>
            {company.industry && (
              <Badge variant="secondary" className="text-xs mt-0.5">
                {company.industry}
              </Badge>
            )}
          </div>
        </div>

        {/* Company Details */}
        <div className="space-y-2 text-sm">
          {company.tax_id && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="text-xs font-medium bg-muted px-1.5 py-0.5 rounded">NIF</span>
              <span>{company.tax_id}</span>
            </div>
          )}
          
          {company.email && (
            <a 
              href={`mailto:${company.email}`}
              className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
            >
              <Mail className="w-3.5 h-3.5" />
              <span className="truncate">{company.email}</span>
            </a>
          )}
          
          {company.phone && (
            <a 
              href={`tel:${company.phone}`}
              className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>{company.phone}</span>
            </a>
          )}
          
          {company.website && (
            <a 
              href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="truncate">{company.website.replace(/^https?:\/\//, '')}</span>
            </a>
          )}
          
          {(company.address || company.city) && (
            <div className="flex items-start gap-2 text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span className="truncate">
                {[company.address, company.city].filter(Boolean).join(', ')}
              </span>
            </div>
          )}
        </div>

        {/* View Button */}
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full gap-2 mt-2"
          onClick={() => navigate(`/dashboard/companies/${company.id}`)}
        >
          <Building2 className="w-3.5 h-3.5" />
          Ver Empresa
        </Button>
      </CardContent>
    </Card>
  );
}
