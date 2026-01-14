import { useMemo, useState } from "react";
import { Contact } from "@/hooks/useContacts";
import { Opportunity, useMoveOpportunity } from "@/hooks/useOpportunities";
import { PipelineStage } from "@/hooks/usePipelineStages";
import { CrmEntityType } from "@/hooks/useCrmViews";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { DollarSign, User, GripVertical, Mail, Phone, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Contact status groups for board view
const CONTACT_STATUSES = [
  { id: "new", name: "Novos", color: "#3b82f6" },
  { id: "contacted", name: "Contactados", color: "#8b5cf6" },
  { id: "qualified", name: "Qualificados", color: "#10b981" },
  { id: "inactive", name: "Inativos", color: "#6b7280" },
];

interface CrmBoardViewProps {
  entityType: CrmEntityType;
  contacts: Contact[];
  opportunities: Opportunity[];
  stages: PipelineStage[];
  onRowClick: (id: string) => void;
}

export function CrmBoardView({
  entityType,
  contacts,
  opportunities,
  stages,
  onRowClick,
}: CrmBoardViewProps) {
  const moveOpportunity = useMoveOpportunity();
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // Group opportunities by stage
  const opportunitiesByStage = useMemo(() => {
    const map: Record<string, Opportunity[]> = {};
    stages?.forEach((stage) => {
      map[stage.id] = [];
    });
    opportunities?.forEach((opp) => {
      if (map[opp.stage_id]) {
        map[opp.stage_id].push(opp);
      }
    });
    return map;
  }, [opportunities, stages]);

  // Group contacts by status (using tags or a default distribution)
  const contactsByStatus = useMemo(() => {
    const map: Record<string, Contact[]> = {};
    CONTACT_STATUSES.forEach((status) => {
      map[status.id] = [];
    });
    
    contacts.forEach((contact) => {
      // Simple logic: check tags for status keywords, default to "new"
      const tags = contact.tags?.map(t => t.toLowerCase()) || [];
      if (tags.includes("inactive") || tags.includes("inativo")) {
        map["inactive"].push(contact);
      } else if (tags.includes("qualified") || tags.includes("qualificado")) {
        map["qualified"].push(contact);
      } else if (tags.includes("contacted") || tags.includes("contactado")) {
        map["contacted"].push(contact);
      } else {
        map["new"].push(contact);
      }
    });
    return map;
  }, [contacts]);

  const handleMoveOpportunity = async (oppId: string, stageId: string) => {
    await moveOpportunity.mutateAsync({ id: oppId, stage_id: stageId });
  };

  if (entityType === "opportunities") {
    if (!stages?.length) {
      return (
        <div className="text-center py-12 bg-muted/30 rounded-lg">
          <p className="text-muted-foreground">Configure as etapas do pipeline para usar a vista de quadro</p>
        </div>
      );
    }

    return (
      <ScrollArea className="flex-1 -mx-6 px-6 h-full">
        <div className="flex gap-4 pb-4 h-full">
          {stages.map((stage) => (
            <OpportunityColumn
              key={stage.id}
              stage={stage}
              opportunities={opportunitiesByStage[stage.id] || []}
              onMoveOpportunity={handleMoveOpportunity}
              onDragStart={setDraggedId}
              onDragEnd={() => setDraggedId(null)}
              draggedId={draggedId}
              onCardClick={onRowClick}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    );
  }

  // Contacts board view
  return (
    <ScrollArea className="flex-1 -mx-6 px-6 h-full">
      <div className="flex gap-4 pb-4 h-full">
        {CONTACT_STATUSES.map((status) => (
          <ContactColumn
            key={status.id}
            status={status}
            contacts={contactsByStatus[status.id] || []}
            onCardClick={onRowClick}
          />
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

// Opportunity Column Component
interface OpportunityColumnProps {
  stage: PipelineStage;
  opportunities: Opportunity[];
  onMoveOpportunity: (oppId: string, stageId: string) => void;
  onDragStart: (oppId: string) => void;
  onDragEnd: () => void;
  draggedId: string | null;
  onCardClick: (id: string) => void;
}

function OpportunityColumn({
  stage,
  opportunities,
  onMoveOpportunity,
  onDragStart,
  onDragEnd,
  draggedId,
  onCardClick,
}: OpportunityColumnProps) {
  const totalValue = opportunities.reduce((sum, opp) => sum + Number(opp.value), 0);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add("bg-accent/50");
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove("bg-accent/50");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove("bg-accent/50");
    const oppId = e.dataTransfer.getData("text/plain");
    if (oppId) {
      onMoveOpportunity(oppId, stage.id);
    }
  };

  return (
    <div
      className="flex-shrink-0 w-80 flex flex-col rounded-lg bg-muted/30 border border-border"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: stage.color }}
            />
            <h3 className="font-medium text-foreground">{stage.name}</h3>
            <Badge variant="secondary" className="text-xs">
              {opportunities.length}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <DollarSign className="w-3.5 h-3.5" />
          {totalValue.toLocaleString("pt-PT", { minimumFractionDigits: 0 })} €
        </div>
      </div>

      <ScrollArea className="flex-1 p-2">
        <div className="space-y-2">
          {opportunities.map((opp) => (
            <Card
              key={opp.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", opp.id);
                onDragStart(opp.id);
              }}
              onDragEnd={onDragEnd}
              onClick={() => onCardClick(opp.id)}
              className={cn(
                "cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors",
                draggedId === opp.id && "opacity-50"
              )}
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground truncate">{opp.title}</h4>
                    {opp.lead && (
                      <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                        <User className="w-3 h-3" />
                        <span className="truncate">{opp.lead.name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 mt-2 text-sm font-medium text-primary">
                      <DollarSign className="w-3.5 h-3.5" />
                      {Number(opp.value).toLocaleString("pt-PT", { minimumFractionDigits: 0 })} €
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

// Contact Column Component
interface ContactColumnProps {
  status: { id: string; name: string; color: string };
  contacts: Contact[];
  onCardClick: (id: string) => void;
}

function ContactColumn({ status, contacts, onCardClick }: ContactColumnProps) {
  return (
    <div className="flex-shrink-0 w-80 flex flex-col rounded-lg bg-muted/30 border border-border">
      <div className="p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: status.color }}
          />
          <h3 className="font-medium text-foreground">{status.name}</h3>
          <Badge variant="secondary" className="text-xs">
            {contacts.length}
          </Badge>
        </div>
      </div>

      <ScrollArea className="flex-1 p-2">
        <div className="space-y-2">
          {contacts.map((contact) => (
            <Card
              key={contact.id}
              onClick={() => onCardClick(contact.id)}
              className="cursor-pointer hover:border-primary/50 transition-colors"
            >
              <CardContent className="p-3">
                <h4 className="font-medium text-foreground truncate">{contact.name}</h4>
                {contact.job_title && (
                  <p className="text-sm text-muted-foreground truncate">{contact.job_title}</p>
                )}
                <div className="mt-2 space-y-1">
                  {contact.email && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Mail className="w-3 h-3" />
                      <span className="truncate">{contact.email}</span>
                    </div>
                  )}
                  {contact.company && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Building2 className="w-3 h-3" />
                      <span className="truncate">{contact.company}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
