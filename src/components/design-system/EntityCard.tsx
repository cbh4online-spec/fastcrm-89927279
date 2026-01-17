import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LeadStatusBadge, TemperatureBadge, OpportunityStageBadge } from "./StatusBadge";
import { 
  User, 
  Building2, 
  Mail, 
  Phone, 
  MoreHorizontal,
  ExternalLink,
  Calendar,
  DollarSign
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ============================================
// ENTITY CARDS - Semantic Entity Representations
// ============================================

// Base Entity Card Props
interface EntityCardBaseProps {
  className?: string;
  onClick?: () => void;
  actions?: Array<{
    label: string;
    icon?: ReactNode;
    onClick: () => void;
    variant?: "default" | "destructive";
  }>;
}

// Lead Card
interface LeadCardProps extends EntityCardBaseProps {
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  status: "new" | "in_progress" | "completed";
  temperature?: "hot" | "warm" | "cold" | null;
  score?: number | null;
}

export function LeadCard({ 
  name, 
  email, 
  phone, 
  company, 
  status, 
  temperature,
  score,
  className, 
  onClick,
  actions 
}: LeadCardProps) {
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  
  return (
    <Card 
      className={cn(
        "hover:shadow-md transition-shadow cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-start gap-3 p-4">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-primary/10 text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-sm truncate">{name}</h4>
            {score && (
              <span className="text-xs font-medium text-primary">{score}%</span>
            )}
          </div>
          
          {company && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
              <Building2 className="h-3 w-3" />
              <span className="truncate">{company}</span>
            </div>
          )}
          
          <div className="flex items-center gap-2 flex-wrap">
            <LeadStatusBadge status={status} size="sm" showIcon={false} />
            {temperature && <TemperatureBadge temperature={temperature} size="sm" />}
          </div>
        </div>
        
        {actions && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover">
              {actions.map((action, i) => (
                <DropdownMenuItem 
                  key={i} 
                  onClick={(e) => {
                    e.stopPropagation();
                    action.onClick();
                  }}
                  className={action.variant === "destructive" ? "text-destructive" : ""}
                >
                  {action.icon}
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardHeader>
      
      {(email || phone) && (
        <CardContent className="pt-0 px-4 pb-4 space-y-1">
          {email && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Mail className="h-3 w-3" />
              <span className="truncate">{email}</span>
            </div>
          )}
          {phone && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Phone className="h-3 w-3" />
              <span>{phone}</span>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// Contact Card
interface ContactCardProps extends EntityCardBaseProps {
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  jobTitle?: string | null;
  avatar?: string | null;
}

export function ContactCard({ 
  name, 
  email, 
  phone, 
  company, 
  jobTitle,
  avatar,
  className, 
  onClick,
  actions 
}: ContactCardProps) {
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  
  return (
    <Card 
      className={cn(
        "hover:shadow-md transition-shadow cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-start gap-3 p-4">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-secondary text-secondary-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate mb-0.5">{name}</h4>
          
          {jobTitle && (
            <p className="text-xs text-muted-foreground truncate">{jobTitle}</p>
          )}
          
          {company && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Building2 className="h-3 w-3" />
              <span className="truncate">{company}</span>
            </div>
          )}
        </div>
        
        {actions && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover">
              {actions.map((action, i) => (
                <DropdownMenuItem 
                  key={i} 
                  onClick={(e) => {
                    e.stopPropagation();
                    action.onClick();
                  }}
                >
                  {action.icon}
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardHeader>
      
      {(email || phone) && (
        <CardContent className="pt-0 px-4 pb-4 space-y-1">
          {email && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Mail className="h-3 w-3" />
              <span className="truncate">{email}</span>
            </div>
          )}
          {phone && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Phone className="h-3 w-3" />
              <span>{phone}</span>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// Company Card
interface CompanyCardProps extends EntityCardBaseProps {
  name: string;
  industry?: string | null;
  website?: string | null;
  size?: string | null;
  contactCount?: number;
}

export function CompanyCard({ 
  name, 
  industry, 
  website, 
  size,
  contactCount = 0,
  className, 
  onClick,
  actions 
}: CompanyCardProps) {
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  
  return (
    <Card 
      className={cn(
        "hover:shadow-md transition-shadow cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-start gap-3 p-4">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-info/10 text-info">
            <Building2 className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate mb-0.5">{name}</h4>
          
          {industry && (
            <p className="text-xs text-muted-foreground truncate">{industry}</p>
          )}
          
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            {size && <span>{size}</span>}
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span>{contactCount} contactos</span>
            </div>
          </div>
        </div>
        
        {actions && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover">
              {actions.map((action, i) => (
                <DropdownMenuItem 
                  key={i} 
                  onClick={(e) => {
                    e.stopPropagation();
                    action.onClick();
                  }}
                >
                  {action.icon}
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardHeader>
      
      {website && (
        <CardContent className="pt-0 px-4 pb-4">
          <a 
            href={website} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-3 w-3" />
            {website.replace(/^https?:\/\//, "")}
          </a>
        </CardContent>
      )}
    </Card>
  );
}

// Opportunity Card (for Kanban)
interface OpportunityCardProps extends EntityCardBaseProps {
  title: string;
  value?: number | null;
  currency?: string;
  stage: "prospecting" | "qualification" | "proposal" | "negotiation" | "won" | "lost";
  probability?: number | null;
  expectedCloseDate?: string | null;
  leadName?: string | null;
}

export function OpportunityCard({ 
  title, 
  value, 
  currency = "EUR",
  stage,
  probability,
  expectedCloseDate,
  leadName,
  className, 
  onClick,
  actions 
}: OpportunityCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };
  
  return (
    <Card 
      className={cn(
        "hover:shadow-md transition-shadow cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="p-3 pb-2">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-medium text-sm line-clamp-2">{title}</h4>
          
          {actions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover">
                {actions.map((action, i) => (
                  <DropdownMenuItem 
                    key={i} 
                    onClick={(e) => {
                      e.stopPropagation();
                      action.onClick();
                    }}
                  >
                    {action.icon}
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-3 pt-0 space-y-2">
        {leadName && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span className="truncate">{leadName}</span>
          </div>
        )}
        
        <div className="flex items-center justify-between">
          {value && (
            <div className="flex items-center gap-1 text-sm font-semibold text-success">
              <DollarSign className="h-3 w-3" />
              {formatCurrency(value)}
            </div>
          )}
          
          {probability && (
            <span className="text-xs text-muted-foreground">{probability}%</span>
          )}
        </div>
        
        {expectedCloseDate && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>{new Date(expectedCloseDate).toLocaleDateString("pt-PT")}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Export all for convenience
export const EntityCards = {
  Lead: LeadCard,
  Contact: ContactCard,
  Company: CompanyCard,
  Opportunity: OpportunityCard,
};
