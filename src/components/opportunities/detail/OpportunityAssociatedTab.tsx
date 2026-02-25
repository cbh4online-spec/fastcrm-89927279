import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Building2, User, Plus, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

interface Entity {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  company?: string | null;
}

interface OpportunityAssociatedTabProps {
  type: "company" | "people";
  entities: Entity[];
}

export function OpportunityAssociatedTab({ type, entities }: OpportunityAssociatedTabProps) {
  const { t } = useTranslation("crm");
  const navigate = useNavigate();
  const isCompany = type === "company";
  const Icon = isCompany ? Building2 : User;

  if (entities.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Icon className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm mb-3">
          {isCompany ? t("oppDetail_noAssociatedCompany") : t("oppDetail_noAssociatedPeople")}
        </p>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          {isCompany ? t("addCompany") : t("addContact")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entities.map((entity) => (
        <Card key={entity.id} className="p-4 hover:bg-muted/50 transition-colors cursor-pointer">
          <div className="flex items-center gap-3">
            <Avatar className={isCompany ? "rounded-md" : ""}>
              <AvatarFallback className={isCompany ? "rounded-md bg-primary text-primary-foreground text-xs" : "bg-primary/10 text-primary text-xs"}>
                {entity.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{entity.name}</p>
              {entity.email && <p className="text-xs text-muted-foreground truncate">{entity.email}</p>}
              {entity.company && <p className="text-xs text-muted-foreground">{entity.company}</p>}
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
