import { useMemo, useState, useRef, useEffect } from "react";
import { Contact } from "@/hooks/useContacts";
import { Opportunity, useMoveOpportunity } from "@/hooks/useOpportunities";
import { PipelineStage } from "@/hooks/usePipelineStages";
import { CrmEntityType, CONTACT_STATUSES } from "@/hooks/useCrmViews";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  DollarSign, 
  User, 
  GripVertical, 
  Mail, 
  Building2, 
  MessageSquare, 
  CheckSquare, 
  TrendingUp,
  Clock,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, differenceInDays } from "date-fns";
import { pt } from "date-fns/locale";

interface CrmBoardViewProps {
  entityType: CrmEntityType;
  contacts: Contact[];
  opportunities: Opportunity[];
  stages: PipelineStage[];
  onRowClick: (id: string) => void;
  onQuickAction?: (action: "reply" | "task" | "opportunity", entityId: string, entityType: CrmEntityType) => void;
}

export function CrmBoardView({
  entityType,
  contacts,
  opportunities,
  stages,
  onRowClick,
  onQuickAction,
}: CrmBoardViewProps) {
  const isMobile = useIsMobile();
  const moveOpportunity = useMoveOpportunity();
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const [mobileViewMode, setMobileViewMode] = useState<"swipe" | "list">("swipe");
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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

  // Group contacts by status
  const contactsByStatus = useMemo(() => {
    const map: Record<string, Contact[]> = {};
    CONTACT_STATUSES.forEach((status) => {
      map[status.id] = [];
    });
    
    contacts.forEach((contact) => {
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

  // Navigation for mobile swipe view
  const goToStage = (index: number) => {
    const maxIndex = entityType === "opportunities" ? stages.length - 1 : CONTACT_STATUSES.length - 1;
    const newIndex = Math.max(0, Math.min(index, maxIndex));
    setActiveStageIndex(newIndex);
  };

  const goNext = () => goToStage(activeStageIndex + 1);
  const goPrev = () => goToStage(activeStageIndex - 1);

  // Touch handling for swipe
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50;
    
    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        goNext();
      } else {
        goPrev();
      }
    }
  };

  // Reset active stage when switching entity types
  useEffect(() => {
    setActiveStageIndex(0);
  }, [entityType]);

  if (entityType === "opportunities") {
    if (!stages?.length) {
      return (
        <div className="text-center py-12 bg-muted/30 rounded-lg">
          <p className="text-muted-foreground">Configure as etapas do pipeline para ver o quadro de oportunidades</p>
        </div>
      );
    }

    // Mobile View
    if (isMobile) {
      return (
        <div className="flex flex-col h-full">
          {/* Mobile Toggle */}
          <div className="flex items-center justify-between px-2 pb-3">
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <Button
                variant={mobileViewMode === "swipe" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 px-3"
                onClick={() => setMobileViewMode("swipe")}
              >
                <LayoutGrid className="h-4 w-4 mr-1.5" />
                Cards
              </Button>
              <Button
                variant={mobileViewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 px-3"
                onClick={() => setMobileViewMode("list")}
              >
                <List className="h-4 w-4 mr-1.5" />
                Lista
              </Button>
            </div>
          </div>

          {mobileViewMode === "swipe" ? (
            <>
              {/* Stage Pills Navigation */}
              <div className="flex gap-1.5 px-2 pb-3 overflow-x-auto scrollbar-hide">
                {stages.map((stage, index) => (
                  <button
                    key={stage.id}
                    onClick={() => goToStage(index)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-all",
                      index === activeStageIndex
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted hover:bg-muted/80 text-muted-foreground"
                    )}
                  >
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: index === activeStageIndex ? "currentColor" : stage.color }}
                    />
                    <span>{stage.name}</span>
                    <Badge 
                      variant={index === activeStageIndex ? "secondary" : "outline"} 
                      className="h-5 px-1.5 text-xs"
                    >
                      {(opportunitiesByStage[stage.id] || []).length}
                    </Badge>
                  </button>
                ))}
              </div>

              {/* Swipe Container */}
              <div
                className="flex-1 relative overflow-hidden"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <div
                  ref={scrollContainerRef}
                  className="flex transition-transform duration-300 ease-out h-full"
                  style={{ transform: `translateX(-${activeStageIndex * 100}%)` }}
                >
                  {stages.map((stage) => (
                    <div key={stage.id} className="w-full flex-shrink-0 px-2">
                      <MobileOpportunityColumn
                        stage={stage}
                        opportunities={opportunitiesByStage[stage.id] || []}
                        onCardClick={onRowClick}
                        onQuickAction={onQuickAction}
                        onMoveToStage={(oppId, stageId) => handleMoveOpportunity(oppId, stageId)}
                        allStages={stages}
                      />
                    </div>
                  ))}
                </div>

                {/* Navigation Arrows */}
                {activeStageIndex > 0 && (
                  <button
                    onClick={goPrev}
                    className="absolute left-1 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-background/90 border shadow-lg flex items-center justify-center hover:bg-background transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}
                {activeStageIndex < stages.length - 1 && (
                  <button
                    onClick={goNext}
                    className="absolute right-1 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-background/90 border shadow-lg flex items-center justify-center hover:bg-background transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Dot Indicators */}
              <div className="flex justify-center gap-1.5 py-3">
                {stages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToStage(index)}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all",
                      index === activeStageIndex
                        ? "bg-primary w-6"
                        : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                    )}
                  />
                ))}
              </div>
            </>
          ) : (
            // Mobile List View
            <MobileListView
              stages={stages}
              opportunitiesByStage={opportunitiesByStage}
              onCardClick={onRowClick}
              onQuickAction={onQuickAction}
              entityType="opportunities"
            />
          )}
        </div>
      );
    }

    // Desktop View
    return (
      <ScrollArea className="flex-1 -mx-6 px-6 h-full">
        <div className="flex gap-4 pb-4 h-full min-h-[500px]">
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
              onQuickAction={onQuickAction}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    );
  }

  // Contacts board view
  if (isMobile) {
    return (
      <div className="flex flex-col h-full">
        {/* Mobile Toggle */}
        <div className="flex items-center justify-between px-2 pb-3">
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <Button
              variant={mobileViewMode === "swipe" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-3"
              onClick={() => setMobileViewMode("swipe")}
            >
              <LayoutGrid className="h-4 w-4 mr-1.5" />
              Cards
            </Button>
            <Button
              variant={mobileViewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-3"
              onClick={() => setMobileViewMode("list")}
            >
              <List className="h-4 w-4 mr-1.5" />
              Lista
            </Button>
          </div>
        </div>

        {mobileViewMode === "swipe" ? (
          <>
            {/* Status Pills Navigation */}
            <div className="flex gap-1.5 px-2 pb-3 overflow-x-auto scrollbar-hide">
              {CONTACT_STATUSES.map((status, index) => (
                <button
                  key={status.id}
                  onClick={() => goToStage(index)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-all",
                    index === activeStageIndex
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted hover:bg-muted/80 text-muted-foreground"
                  )}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: index === activeStageIndex ? "currentColor" : status.color }}
                  />
                  <span>{status.name}</span>
                  <Badge 
                    variant={index === activeStageIndex ? "secondary" : "outline"} 
                    className="h-5 px-1.5 text-xs"
                  >
                    {(contactsByStatus[status.id] || []).length}
                  </Badge>
                </button>
              ))}
            </div>

            {/* Swipe Container */}
            <div
              className="flex-1 relative overflow-hidden"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div
                className="flex transition-transform duration-300 ease-out h-full"
                style={{ transform: `translateX(-${activeStageIndex * 100}%)` }}
              >
                {CONTACT_STATUSES.map((status) => (
                  <div key={status.id} className="w-full flex-shrink-0 px-2">
                    <MobileContactColumn
                      status={status}
                      contacts={contactsByStatus[status.id] || []}
                      onCardClick={onRowClick}
                      onQuickAction={onQuickAction}
                    />
                  </div>
                ))}
              </div>

              {/* Navigation Arrows */}
              {activeStageIndex > 0 && (
                <button
                  onClick={goPrev}
                  className="absolute left-1 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-background/90 border shadow-lg flex items-center justify-center hover:bg-background transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              {activeStageIndex < CONTACT_STATUSES.length - 1 && (
                <button
                  onClick={goNext}
                  className="absolute right-1 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-background/90 border shadow-lg flex items-center justify-center hover:bg-background transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Dot Indicators */}
            <div className="flex justify-center gap-1.5 py-3">
              {CONTACT_STATUSES.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToStage(index)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all",
                    index === activeStageIndex
                      ? "bg-primary w-6"
                      : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  )}
                />
              ))}
            </div>
          </>
        ) : (
          <MobileContactListView
            statuses={CONTACT_STATUSES}
            contactsByStatus={contactsByStatus}
            onCardClick={onRowClick}
            onQuickAction={onQuickAction}
          />
        )}
      </div>
    );
  }

  // Desktop contacts view
  return (
    <ScrollArea className="flex-1 -mx-6 px-6 h-full">
      <div className="flex gap-4 pb-4 h-full min-h-[500px]">
        {CONTACT_STATUSES.map((status) => (
          <ContactColumn
            key={status.id}
            status={status}
            contacts={contactsByStatus[status.id] || []}
            onCardClick={onRowClick}
            onQuickAction={onQuickAction}
          />
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

// Deal health indicator based on days in stage
function getDealHealth(createdAt: string): { status: "healthy" | "warning" | "critical"; label: string } {
  const daysInStage = differenceInDays(new Date(), new Date(createdAt));
  
  if (daysInStage <= 7) {
    return { status: "healthy", label: "No prazo" };
  } else if (daysInStage <= 14) {
    return { status: "warning", label: "Atenção necessária" };
  } else {
    return { status: "critical", label: "Risco de perda" };
  }
}

// Mobile Opportunity Column
interface MobileOpportunityColumnProps {
  stage: PipelineStage;
  opportunities: Opportunity[];
  onCardClick: (id: string) => void;
  onQuickAction?: (action: "reply" | "task" | "opportunity", entityId: string, entityType: CrmEntityType) => void;
  onMoveToStage?: (oppId: string, stageId: string) => void;
  allStages?: PipelineStage[];
}

function MobileOpportunityColumn({
  stage,
  opportunities,
  onCardClick,
  onQuickAction,
  onMoveToStage,
  allStages,
}: MobileOpportunityColumnProps) {
  const totalValue = opportunities.reduce((sum, opp) => sum + Number(opp.value), 0);

  return (
    <div className="h-full flex flex-col bg-muted/30 rounded-xl border">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
            <h3 className="font-semibold">{stage.name}</h3>
          </div>
          <Badge variant="secondary">{opportunities.length}</Badge>
        </div>
        <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
          <DollarSign className="w-4 h-4" />
          {totalValue.toLocaleString("pt-PT")} €
        </div>
      </div>

      {/* Cards */}
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-3">
          {opportunities.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">Sem oportunidades</p>
            </div>
          ) : (
            opportunities.map((opp) => {
              const health = getDealHealth(opp.created_at);
              const daysInStage = differenceInDays(new Date(), new Date(opp.created_at));

              return (
                <Card
                  key={opp.id}
                  onClick={() => onCardClick(opp.id)}
                  className="cursor-pointer active:scale-[0.98] transition-transform"
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-medium line-clamp-2">{opp.title}</h4>
                      <div className={cn(
                        "w-2 h-2 rounded-full flex-shrink-0 mt-1.5",
                        health.status === "healthy" && "bg-green-500",
                        health.status === "warning" && "bg-amber-500",
                        health.status === "critical" && "bg-red-500"
                      )} />
                    </div>

                    {opp.lead && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <User className="w-4 h-4" />
                        <span className="truncate">{opp.lead.name}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 font-semibold text-primary">
                        <DollarSign className="w-4 h-4" />
                        {Number(opp.value).toLocaleString("pt-PT")} €
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {daysInStage}d
                      </div>
                    </div>

                    {/* Quick Move to Stage */}
                    {onMoveToStage && allStages && allStages.length > 1 && (
                      <div className="flex gap-1 pt-2 border-t overflow-x-auto">
                        {allStages.filter(s => s.id !== stage.id).map((s) => (
                          <Button
                            key={s.id}
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs px-2 flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              onMoveToStage(opp.id, s.id);
                            }}
                          >
                            <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: s.color }} />
                            {s.name}
                          </Button>
                        ))}
                      </div>
                    )}

                    {/* Quick Actions */}
                    {onQuickAction && (
                      <div className="flex items-center gap-2 pt-2 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1 h-9"
                          onClick={(e) => {
                            e.stopPropagation();
                            onQuickAction("task", opp.id, "opportunities");
                          }}
                        >
                          <CheckSquare className="w-4 h-4 mr-1.5" />
                          Tarefa
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1 h-9"
                          onClick={(e) => {
                            e.stopPropagation();
                            onQuickAction("reply", opp.id, "opportunities");
                          }}
                        >
                          <MessageSquare className="w-4 h-4 mr-1.5" />
                          Mensagem
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// Mobile Contact Column
interface MobileContactColumnProps {
  status: { id: string; name: string; color: string; description: string };
  contacts: Contact[];
  onCardClick: (id: string) => void;
  onQuickAction?: (action: "reply" | "task" | "opportunity", entityId: string, entityType: CrmEntityType) => void;
}

function MobileContactColumn({
  status,
  contacts,
  onCardClick,
  onQuickAction,
}: MobileContactColumnProps) {
  return (
    <div className="h-full flex flex-col bg-muted/30 rounded-xl border">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }} />
            <h3 className="font-semibold">{status.name}</h3>
          </div>
          <Badge variant="secondary">{contacts.length}</Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{status.description}</p>
      </div>

      <ScrollArea className="flex-1 p-3">
        <div className="space-y-3">
          {contacts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">Sem contactos</p>
            </div>
          ) : (
            contacts.map((contact) => (
              <Card
                key={contact.id}
                onClick={() => onCardClick(contact.id)}
                className="cursor-pointer active:scale-[0.98] transition-transform"
              >
                <CardContent className="p-4 space-y-2">
                  <div>
                    <h4 className="font-medium">{contact.name}</h4>
                    {contact.job_title && (
                      <p className="text-sm text-muted-foreground">{contact.job_title}</p>
                    )}
                  </div>

                  {contact.email && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{contact.email}</span>
                    </div>
                  )}

                  {contact.company && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Building2 className="w-4 h-4" />
                      <span className="truncate">{contact.company}</span>
                    </div>
                  )}

                  {contact.tags && contact.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {contact.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {contact.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{contact.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  {onQuickAction && (
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 h-9"
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuickAction("reply", contact.id, "contacts");
                        }}
                      >
                        <MessageSquare className="w-4 h-4 mr-1.5" />
                        Mensagem
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 h-9"
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuickAction("opportunity", contact.id, "contacts");
                        }}
                      >
                        <TrendingUp className="w-4 h-4 mr-1.5" />
                        Oportunidade
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// Mobile List View for Opportunities
interface MobileListViewProps {
  stages: PipelineStage[];
  opportunitiesByStage: Record<string, Opportunity[]>;
  onCardClick: (id: string) => void;
  onQuickAction?: (action: "reply" | "task" | "opportunity", entityId: string, entityType: CrmEntityType) => void;
  entityType: CrmEntityType;
}

function MobileListView({
  stages,
  opportunitiesByStage,
  onCardClick,
  onQuickAction,
}: MobileListViewProps) {
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    stages.forEach(s => { initial[s.id] = true; });
    return initial;
  });

  const toggleStage = (stageId: string) => {
    setExpandedStages(prev => ({ ...prev, [stageId]: !prev[stageId] }));
  };

  return (
    <ScrollArea className="flex-1 px-2">
      <div className="space-y-2 pb-4">
        {stages.map((stage) => {
          const opps = opportunitiesByStage[stage.id] || [];
          const totalValue = opps.reduce((sum, opp) => sum + Number(opp.value), 0);
          const isExpanded = expandedStages[stage.id];

          return (
            <div key={stage.id} className="rounded-lg border bg-card overflow-hidden">
              <button
                onClick={() => toggleStage(stage.id)}
                className="w-full p-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
                  <span className="font-medium">{stage.name}</span>
                  <Badge variant="secondary" className="text-xs">{opps.length}</Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{totalValue.toLocaleString("pt-PT")} €</span>
                  <ChevronRight className={cn(
                    "w-4 h-4 transition-transform",
                    isExpanded && "rotate-90"
                  )} />
                </div>
              </button>

              {isExpanded && opps.length > 0 && (
                <div className="border-t divide-y">
                  {opps.map((opp) => {
                    const health = getDealHealth(opp.created_at);
                    
                    return (
                      <button
                        key={opp.id}
                        onClick={() => onCardClick(opp.id)}
                        className="w-full p-3 text-left hover:bg-muted/30 transition-colors flex items-center gap-3"
                      >
                        <div className={cn(
                          "w-2 h-2 rounded-full flex-shrink-0",
                          health.status === "healthy" && "bg-green-500",
                          health.status === "warning" && "bg-amber-500",
                          health.status === "critical" && "bg-red-500"
                        )} />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{opp.title}</div>
                          {opp.lead && (
                            <div className="text-sm text-muted-foreground truncate">{opp.lead.name}</div>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-medium text-primary">
                            {Number(opp.value).toLocaleString("pt-PT")} €
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

// Mobile Contact List View
interface MobileContactListViewProps {
  statuses: typeof CONTACT_STATUSES;
  contactsByStatus: Record<string, Contact[]>;
  onCardClick: (id: string) => void;
  onQuickAction?: (action: "reply" | "task" | "opportunity", entityId: string, entityType: CrmEntityType) => void;
}

function MobileContactListView({
  statuses,
  contactsByStatus,
  onCardClick,
}: MobileContactListViewProps) {
  const [expandedStatuses, setExpandedStatuses] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    statuses.forEach(s => { initial[s.id] = true; });
    return initial;
  });

  const toggleStatus = (statusId: string) => {
    setExpandedStatuses(prev => ({ ...prev, [statusId]: !prev[statusId] }));
  };

  return (
    <ScrollArea className="flex-1 px-2">
      <div className="space-y-2 pb-4">
        {statuses.map((status) => {
          const contacts = contactsByStatus[status.id] || [];
          const isExpanded = expandedStatuses[status.id];

          return (
            <div key={status.id} className="rounded-lg border bg-card overflow-hidden">
              <button
                onClick={() => toggleStatus(status.id)}
                className="w-full p-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }} />
                  <span className="font-medium">{status.name}</span>
                  <Badge variant="secondary" className="text-xs">{contacts.length}</Badge>
                </div>
                <ChevronRight className={cn(
                  "w-4 h-4 transition-transform text-muted-foreground",
                  isExpanded && "rotate-90"
                )} />
              </button>

              {isExpanded && contacts.length > 0 && (
                <div className="border-t divide-y">
                  {contacts.map((contact) => (
                    <button
                      key={contact.id}
                      onClick={() => onCardClick(contact.id)}
                      className="w-full p-3 text-left hover:bg-muted/30 transition-colors flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{contact.name}</div>
                        <div className="text-sm text-muted-foreground truncate">
                          {contact.company || contact.email || "Sem empresa"}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

// Desktop Opportunity Column Component
interface OpportunityColumnProps {
  stage: PipelineStage;
  opportunities: Opportunity[];
  onMoveOpportunity: (oppId: string, stageId: string) => void;
  onDragStart: (oppId: string) => void;
  onDragEnd: () => void;
  draggedId: string | null;
  onCardClick: (id: string) => void;
  onQuickAction?: (action: "reply" | "task" | "opportunity", entityId: string, entityType: CrmEntityType) => void;
}

function OpportunityColumn({
  stage,
  opportunities,
  onMoveOpportunity,
  onDragStart,
  onDragEnd,
  draggedId,
  onCardClick,
  onQuickAction,
}: OpportunityColumnProps) {
  const totalValue = opportunities.reduce((sum, opp) => sum + Number(opp.value), 0);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add("ring-2", "ring-primary/50");
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove("ring-2", "ring-primary/50");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove("ring-2", "ring-primary/50");
    const oppId = e.dataTransfer.getData("text/plain");
    if (oppId) {
      onMoveOpportunity(oppId, stage.id);
    }
  };

  return (
    <div
      className="flex-shrink-0 w-72 lg:w-80 flex flex-col rounded-lg bg-muted/30 border border-border transition-all"
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
          {opportunities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Arraste negócios para aqui
            </div>
          ) : (
            opportunities.map((opp) => {
              const health = getDealHealth(opp.created_at);
              const daysInStage = differenceInDays(new Date(), new Date(opp.created_at));
              
              return (
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
                    "cursor-grab active:cursor-grabbing hover:border-primary/50 transition-all hover:shadow-md",
                    draggedId === opp.id && "opacity-50 rotate-2"
                  )}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0 space-y-2">
                        {/* Title and Health Indicator */}
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-medium text-foreground truncate">{opp.title}</h4>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className={cn(
                                "flex-shrink-0 w-2 h-2 rounded-full mt-1.5",
                                health.status === "healthy" && "bg-green-500",
                                health.status === "warning" && "bg-amber-500",
                                health.status === "critical" && "bg-red-500"
                              )} />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{health.label}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>

                        {/* Lead Name */}
                        {opp.lead && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <User className="w-3 h-3" />
                            <span className="truncate">{opp.lead.name}</span>
                          </div>
                        )}

                        {/* Value and Days */}
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-1 font-semibold text-primary">
                            <DollarSign className="w-3.5 h-3.5" />
                            {Number(opp.value).toLocaleString("pt-PT")} €
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground text-xs">
                            <Clock className="w-3 h-3" />
                            {daysInStage}d nesta etapa
                          </div>
                        </div>

                        {/* Quick Actions */}
                        {onQuickAction && (
                          <div className="flex items-center gap-1 pt-1 border-t border-border/50">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onQuickAction("task", opp.id, "opportunities");
                                  }}
                                >
                                  <CheckSquare className="w-3.5 h-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Nova tarefa</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onQuickAction("reply", opp.id, "opportunities");
                                  }}
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Enviar mensagem</TooltipContent>
                            </Tooltip>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// Desktop Contact Column Component
interface ContactColumnProps {
  status: { id: string; name: string; color: string; description: string };
  contacts: Contact[];
  onCardClick: (id: string) => void;
  onQuickAction?: (action: "reply" | "task" | "opportunity", entityId: string, entityType: CrmEntityType) => void;
}

function ContactColumn({ status, contacts, onCardClick, onQuickAction }: ContactColumnProps) {
  return (
    <div className="flex-shrink-0 w-72 lg:w-80 flex flex-col rounded-lg bg-muted/30 border border-border">
      <div className="p-3 border-b border-border">
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: status.color }}
          />
          <h3 className="font-medium text-foreground">{status.name}</h3>
          <Badge variant="secondary" className="text-xs">
            {contacts.length}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{status.description}</p>
      </div>

      <ScrollArea className="flex-1 p-2">
        <div className="space-y-2">
          {contacts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Sem contactos neste estado
            </div>
          ) : (
            contacts.map((contact) => (
              <Card
                key={contact.id}
                onClick={() => onCardClick(contact.id)}
                className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-md"
              >
                <CardContent className="p-3 space-y-2">
                  {/* Name and Title */}
                  <div>
                    <h4 className="font-medium text-foreground truncate">{contact.name}</h4>
                    {contact.job_title && (
                      <p className="text-sm text-muted-foreground truncate">{contact.job_title}</p>
                    )}
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-1">
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

                  {/* Tags */}
                  {contact.tags && contact.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {contact.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs px-1.5 py-0">
                          {tag}
                        </Badge>
                      ))}
                      {contact.tags.length > 2 && (
                        <Badge variant="outline" className="text-xs px-1.5 py-0">
                          +{contact.tags.length - 2}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Last Activity */}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(contact.updated_at), { addSuffix: true, locale: pt })}
                  </div>

                  {/* Quick Actions */}
                  {onQuickAction && (
                    <div className="flex items-center gap-1 pt-1 border-t border-border/50">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              onQuickAction("reply", contact.id, "contacts");
                            }}
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Enviar mensagem</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              onQuickAction("task", contact.id, "contacts");
                            }}
                          >
                            <CheckSquare className="w-3.5 h-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Nova tarefa</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              onQuickAction("opportunity", contact.id, "contacts");
                            }}
                          >
                            <TrendingUp className="w-3.5 h-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Criar oportunidade</TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
