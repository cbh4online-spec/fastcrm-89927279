import { useState, useCallback } from "react";
import { Opportunity, PipelineStage, OPPORTUNITY_SOURCES } from "@/types/opportunity";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, MessageSquare, Briefcase, Building2, Brain, UserCheck, ListChecks, Plus, Globe, Tag, Target, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { InlineEditableField } from "@/components/custom-fields/InlineEditableField";
import { OpportunityCommunicationSection } from "./OpportunityCommunicationSection";
import { OpportunityAssociationsSection } from "../sections/OpportunityAssociationsSection";
import { DealIntelligencePanel } from "@/components/intelligence/DealIntelligencePanel";
import type { DealIntelligencePayload } from "@/types/dealIntelligence";
import { toast } from "sonner";
import { useMemo } from "react";
import { DEFAULT_SIDEBAR_ORDER, useUpdateOpportunityLayoutPreferences } from "@/hooks/useOpportunityLayoutPreferences";

interface EntityOption {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  website?: string | null;
}

interface OpportunityDetailSidebarProps {
  opportunity: Opportunity;
  stages: PipelineStage[];
  intelligence: DealIntelligencePayload | null | undefined;
  intelligenceLoading: boolean;
  leads: EntityOption[];
  contacts: EntityOption[];
  companies: EntityOption[];
  isLoadingLeads?: boolean;
  isLoadingContacts?: boolean;
  isLoadingCompanies?: boolean;
  onUpdate: (updates: { id: string } & Record<string, unknown>) => Promise<void>;
  sidebarOrder?: string[];
}

const SIDEBAR_SECTION_LABELS: Record<string, string> = {
  communication: 'oppDetail_communication',
  dealInfo: 'oppDetail_dealInfo',
  associations: 'oppDetail_associations',
  companyInfo: 'oppDetail_companyInfo',
  lists: 'oppDetail_listsSection',
  intelligence: 'oppLayout_intelligence',
};

function SidebarSection({ title, icon, defaultOpen = true, children, draggable: isDraggable, onDragStart, onDragOver, onDrop, isDragOver, isGrabbed, onKeyDown, sectionId }: {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  isDragOver?: boolean;
  isGrabbed?: boolean;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  sectionId?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      draggable={isDraggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      tabIndex={isDraggable ? 0 : undefined}
      role={isDraggable ? "listitem" : undefined}
      aria-grabbed={isDraggable ? isGrabbed : undefined}
      aria-label={isDraggable ? `${title} — press Enter or Space to grab, then arrow keys to reorder` : undefined}
      onKeyDown={onKeyDown}
      data-sidebar-section={sectionId}
      className={cn(
        isDragOver && "border-t-2 border-primary/50",
        isDraggable && "focus:outline-none focus:ring-2 focus:ring-ring rounded-md",
        isGrabbed && "ring-2 ring-primary shadow-md bg-primary/5"
      )}
    >
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground">
            <div className="flex items-center gap-2">
              {isDraggable && <GripVertical className="w-3 h-3 text-muted-foreground/40 cursor-grab" />}
              {icon}
              {title}
            </div>
            <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", open && "rotate-180")} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="px-3 pb-3">
          {children}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export function OpportunityDetailSidebar({
  opportunity, stages, intelligence, intelligenceLoading,
  leads, contacts, companies, isLoadingLeads, isLoadingContacts, isLoadingCompanies,
  onUpdate, sidebarOrder: sidebarOrderProp,
}: OpportunityDetailSidebarProps) {
  const { t } = useTranslation("crm");
  const [showAllDealInfo, setShowAllDealInfo] = useState(false);
  const updatePrefs = useUpdateOpportunityLayoutPreferences();
  
  const sidebarOrder = sidebarOrderProp ?? DEFAULT_SIDEBAR_ORDER;
  const [dragItem, setDragItem] = useState<string | null>(null);
  const [dragOverItem, setDragOverItem] = useState<string | null>(null);
  const [grabbedSection, setGrabbedSection] = useState<string | null>(null);
  const [liveText, setLiveText] = useState("");

  const handleDragStart = (id: string) => (e: React.DragEvent) => {
    setDragItem(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (id: string) => (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverItem(id);
  };

  const handleDrop = (targetId: string) => (e: React.DragEvent) => {
    e.preventDefault();
    if (!dragItem || dragItem === targetId) { setDragOverItem(null); return; }
    const newOrder = [...sidebarOrder];
    const fromIdx = newOrder.indexOf(dragItem);
    const toIdx = newOrder.indexOf(targetId);
    if (fromIdx === -1 || toIdx === -1) { setDragOverItem(null); return; }
    newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, dragItem);
    setDragItem(null);
    setDragOverItem(null);
    updatePrefs.mutate({ sidebar_order: newOrder });
  };

  const handleSectionKeyDown = useCallback((sectionId: string) => (e: React.KeyboardEvent) => {
    const idx = sidebarOrder.indexOf(sectionId);
    if (idx === -1) return;
    const labelKey = SIDEBAR_SECTION_LABELS[sectionId];
    const label = labelKey ? t(labelKey) : sectionId;

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (grabbedSection === sectionId) {
        setGrabbedSection(null);
        setLiveText(`Dropped ${label} at position ${idx + 1} of ${sidebarOrder.length}`);
      } else {
        setGrabbedSection(sectionId);
        setLiveText(`Grabbed ${label}, position ${idx + 1} of ${sidebarOrder.length}`);
      }
    } else if (e.key === "Escape" && grabbedSection === sectionId) {
      e.preventDefault();
      setGrabbedSection(null);
      setLiveText("Reorder cancelled");
    } else if ((e.key === "ArrowUp" || e.key === "ArrowDown") && grabbedSection === sectionId) {
      e.preventDefault();
      const dir = e.key === "ArrowUp" ? -1 : 1;
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= sidebarOrder.length) return;
      const newOrder = [...sidebarOrder];
      [newOrder[idx], newOrder[newIdx]] = [newOrder[newIdx], newOrder[idx]];
      updatePrefs.mutate({ sidebar_order: newOrder });
      setLiveText(`Moved ${label} to position ${newIdx + 1} of ${sidebarOrder.length}`);
      requestAnimationFrame(() => {
        const el = document.querySelector(`[data-sidebar-section="${sectionId}"]`) as HTMLElement;
        el?.focus();
      });
    }
  }, [grabbedSection, sidebarOrder, t, updatePrefs]);

  const handleFieldChange = async (field: string, value: unknown) => {
    try {
      await onUpdate({ id: opportunity.id, [field]: value });
      toast.success(t("oppDetail_fieldUpdated"));
    } catch {
      toast.error(t("errorUpdatingOpportunity"));
      throw new Error();
    }
  };

  const stageOptions = useMemo(() => stages.map(s => s.name), [stages]);
  const currentStageName = stages.find(s => s.id === opportunity.stage_id)?.name || "";

  const handleStageChange = async (stageName: unknown) => {
    const stage = stages.find(s => s.name === stageName);
    if (stage) {
      await onUpdate({ id: opportunity.id, stage_id: stage.id, probability: stage.probability });
      toast.success(t("oppDetailAdvancedTo", { stage: stage.name }));
    }
  };

  const sourceOptions = OPPORTUNITY_SOURCES.map(s => s.label);
  const currentSourceLabel = OPPORTUNITY_SOURCES.find(s => s.value === opportunity.source)?.label || opportunity.source || "";

  const handleSourceChange = async (sourceLabel: unknown) => {
    const source = OPPORTUNITY_SOURCES.find(s => s.label === sourceLabel);
    if (source) await handleFieldChange("source", source.value);
  };

  const currencyOptions = ["EUR", "USD", "GBP", "BRL"];
  const priorityOptions = ["Low", "Medium", "High", "Critical"];

  const sectionRenderers: Record<string, () => React.ReactNode> = {
    communication: () => (
      <SidebarSection
        key="communication"
        sectionId="communication"
        title={t("oppDetail_communication")}
        icon={<MessageSquare className="w-3.5 h-3.5" />}
        draggable
        onDragStart={handleDragStart('communication')}
        onDragOver={handleDragOver('communication')}
        onDrop={handleDrop('communication')}
        isDragOver={dragOverItem === 'communication'}
        isGrabbed={grabbedSection === 'communication'}
        onKeyDown={handleSectionKeyDown('communication')}
      >
        <OpportunityCommunicationSection opportunityId={opportunity.id} />
      </SidebarSection>
    ),
    dealInfo: () => (
      <SidebarSection
        key="dealInfo"
        sectionId="dealInfo"
        title={t("oppDetail_dealInfo")}
        icon={<Briefcase className="w-3.5 h-3.5" />}
        draggable
        onDragStart={handleDragStart('dealInfo')}
        onDragOver={handleDragOver('dealInfo')}
        onDrop={handleDrop('dealInfo')}
        isDragOver={dragOverItem === 'dealInfo'}
        isGrabbed={grabbedSection === 'dealInfo'}
        onKeyDown={handleSectionKeyDown('dealInfo')}
      >
        <div className="space-y-0 divide-y divide-border/30">
          <InlineEditableField label={t("dealName")} fieldId="title" fieldType="text" value={opportunity.title} onChange={(v) => handleFieldChange("title", v)} required />
          <InlineEditableField label={t("dealValue")} fieldId="value" fieldType="currency" value={opportunity.value} onChange={(v) => handleFieldChange("value", v)} />
          <InlineEditableField label={t("oppDetail_priorityLevel")} fieldId="priority_level" fieldType="select" value={(opportunity as any).priority_level || ""} onChange={(v) => handleFieldChange("priority_level", v)} options={priorityOptions} />
          <InlineEditableField label={t("stage")} fieldId="stage" fieldType="select" value={currentStageName} onChange={handleStageChange} options={stageOptions} />
          <InlineEditableField label={t("expectedCloseDate")} fieldId="expected_close_date" fieldType="date" value={opportunity.expected_close_date} onChange={(v) => handleFieldChange("expected_close_date", v)} />
          {showAllDealInfo && (
            <>
              <InlineEditableField label={t("probability")} fieldId="probability" fieldType="number" value={opportunity.probability} onChange={(v) => handleFieldChange("probability", v)} placeholder="%" />
              <InlineEditableField label={t("source")} fieldId="source" fieldType="select" value={currentSourceLabel} onChange={handleSourceChange} options={sourceOptions} />
              <InlineEditableField label={t("oppDetail_currency")} fieldId="currency" fieldType="select" value={opportunity.currency || "EUR"} onChange={(v) => handleFieldChange("currency", v)} options={currencyOptions} />
            </>
          )}
          <button onClick={() => setShowAllDealInfo(!showAllDealInfo)} className="w-full text-left text-xs text-primary hover:underline py-2 font-medium">
            {showAllDealInfo ? t("oppDetail_hideValues") : t("oppDetail_showAllValues")}
          </button>
        </div>
      </SidebarSection>
    ),
    associations: () => (
      <SidebarSection
        key="associations"
        sectionId="associations"
        title={t("oppDetail_associations")}
        icon={<UserCheck className="w-3.5 h-3.5" />}
        draggable
        onDragStart={handleDragStart('associations')}
        onDragOver={handleDragOver('associations')}
        onDrop={handleDrop('associations')}
        isDragOver={dragOverItem === 'associations'}
        isGrabbed={grabbedSection === 'associations'}
        onKeyDown={handleSectionKeyDown('associations')}
      >
        <OpportunityAssociationsSection
          opportunity={opportunity} leads={leads} contacts={contacts} companies={companies}
          onUpdate={onUpdate} isLoadingLeads={isLoadingLeads} isLoadingContacts={isLoadingContacts} isLoadingCompanies={isLoadingCompanies}
        />
      </SidebarSection>
    ),
    companyInfo: () => {
      if (!opportunity.company) return null;
      return (
        <SidebarSection
          key="companyInfo"
          sectionId="companyInfo"
          title={t("oppDetail_companyInfo")}
          icon={<Building2 className="w-3.5 h-3.5" />}
          defaultOpen={false}
          draggable
          onDragStart={handleDragStart('companyInfo')}
          onDragOver={handleDragOver('companyInfo')}
          onDrop={handleDrop('companyInfo')}
          isDragOver={dragOverItem === 'companyInfo'}
          isGrabbed={grabbedSection === 'companyInfo'}
          onKeyDown={handleSectionKeyDown('companyInfo')}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-1 py-2 text-sm hover:bg-muted/50 rounded px-1.5 cursor-pointer">
              <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground text-xs">{t("oppDetail_associatedCompany")}</span>
              <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
              <span className="text-xs font-medium">{t("oppDetail_companyDomains")}</span>
              <span className="ml-auto text-xs text-primary truncate max-w-[100px]">
                {opportunity.company.website ? (
                  <a href={opportunity.company.website.startsWith("http") ? opportunity.company.website : `https://${opportunity.company.website}`} target="_blank" rel="noopener noreferrer" className="hover:underline">{opportunity.company.website}</a>
                ) : "—"}
              </span>
            </div>
            <div className="flex items-center gap-1 py-2 text-sm hover:bg-muted/50 rounded px-1.5 cursor-pointer">
              <Tag className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground text-xs">{t("oppDetail_associatedCompany")}</span>
              <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
              <span className="text-xs font-medium">{t("oppDetail_companyCategories")}</span>
              <span className="ml-auto text-xs text-muted-foreground">—</span>
            </div>
            <div className="flex items-center gap-1 py-2 text-sm hover:bg-muted/50 rounded px-1.5 cursor-pointer">
              <Target className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground text-xs">{t("oppDetail_associatedCompany")}</span>
              <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
              <span className="text-xs font-medium">{t("oppDetail_companyICP")}</span>
              <span className="ml-auto text-xs text-muted-foreground">—</span>
            </div>
          </div>
        </SidebarSection>
      );
    },
    lists: () => (
      <SidebarSection
        key="lists"
        sectionId="lists"
        title={t("oppDetail_listsSection")}
        icon={<ListChecks className="w-3.5 h-3.5" />}
        defaultOpen={false}
        draggable
        onDragStart={handleDragStart('lists')}
        onDragOver={handleDragOver('lists')}
        onDrop={handleDrop('lists')}
        isDragOver={dragOverItem === 'lists'}
        isGrabbed={grabbedSection === 'lists'}
        onKeyDown={handleSectionKeyDown('lists')}
      >
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground mb-2">{t("oppDetail_noLists")}</p>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => toast.info(t("oppDetail_addToListSoon"))}>
            <Plus className="w-3 h-3" />
            {t("oppDetail_addToList")}
          </Button>
        </div>
      </SidebarSection>
    ),
    intelligence: () => (
      <SidebarSection
        key="intelligence"
        sectionId="intelligence"
        title="Intelligence"
        icon={<Brain className="w-3.5 h-3.5" />}
        defaultOpen={false}
        draggable
        onDragStart={handleDragStart('intelligence')}
        onDragOver={handleDragOver('intelligence')}
        onDrop={handleDrop('intelligence')}
        isDragOver={dragOverItem === 'intelligence'}
        isGrabbed={grabbedSection === 'intelligence'}
        onKeyDown={handleSectionKeyDown('intelligence')}
      >
        <DealIntelligencePanel intelligence={intelligence} dealId={opportunity.id} isLoading={intelligenceLoading} />
      </SidebarSection>
    ),
  };

  return (
    <div className="w-full lg:w-80 lg:flex-shrink-0">
      {/* Screen reader live region */}
      <div aria-live="assertive" className="sr-only">{liveText}</div>
      <div className="lg:sticky lg:top-4 space-y-1 border rounded-xl bg-card">
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="w-full rounded-t-xl rounded-b-none border-b h-10 bg-transparent p-0">
            <TabsTrigger value="details" className="flex-1 rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary text-xs">
              {t("oppDetail_details")}
            </TabsTrigger>
            <TabsTrigger value="comments" className="flex-1 rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary text-xs">
              {t("oppDetail_comments")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-0 divide-y divide-border/50">
            <div role="list" aria-label="Sidebar sections">
              {sidebarOrder.map(id => sectionRenderers[id]?.())}
            </div>

            {/* Add Section */}
            <div className="px-3 py-3 border-t border-border/50">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => toast.info(t("oppDetail_addSectionSoon"))}
              >
                <Plus className="w-3 h-3" />
                {t("oppDetail_addSection")}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="comments" className="mt-0 p-4">
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t("oppDetail_noComments")}</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
