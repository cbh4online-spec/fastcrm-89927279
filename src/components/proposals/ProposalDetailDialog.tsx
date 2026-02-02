import { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Eye,
  Send,
  Copy,
  ExternalLink,
  History,
  Activity,
  Loader2,
  FileText,
  Building2,
  User,
  Calendar,
  Euro,
  Pencil,
  Save,
  X,
  TrendingUp,
  UserCheck,
  FileSearch,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";
import { POSProposalItemsEditor } from "./POSProposalItemsEditor";
import { ProposalClientSection } from "./ProposalClientSection";
import { ProposalConditionsSection, type ConditionsData } from "./ProposalConditionsSection";
import { ProposalScopeSection, type ScopeData } from "./ProposalScopeSection";
import { ProposalTimelineSection, type TimelineData, type TimelinePhase } from "./ProposalTimelineSection";
import { ProposalReferencesSection, type ReferencesData } from "./ProposalReferencesSection";
import { ProposalStepNavigation, PROPOSAL_STEPS } from "./ProposalStepNavigation";
import { ProposalViewToggle } from "./ProposalViewToggle";
import { ProposalInternalView } from "./ProposalInternalView";
import { ProposalClientDocument } from "./ProposalClientDocument";
import { ProposalDocumentPreviewDialog } from "./ProposalDocumentPreviewDialog";
import { ProposalAIAssistantPanel } from "./ProposalAIAssistantPanel";
import { AIPreviewDialog, PreviewList } from "./AIPreviewDialog";
import { PAYMENT_CONDITIONS, type ClientType } from "./proposalConstants";
import {
  useProposal,
  useProposalVersions,
  useProposalActivity,
  usePublishProposal,
  useUpdateProposal,
  useProposalItems,
  useToggleProposalItem,
} from "@/hooks/useProposals";
import { useProposalAI, type ScopeResult, type TimelineResult, type ConditionsResult, type ReferencesResult } from "@/hooks/useProposalAI";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceMembers } from "@/hooks/useWorkspaceMembers";
import { supabase } from "@/integrations/supabase/client";
import type { ProposalStatus } from "@/types/proposal";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";

interface ProposalDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposalId: string;
}

const statusConfig: Record<ProposalStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
  draft: { label: "Rascunho", variant: "secondary" },
  published: { label: "Publicada", variant: "default", className: "bg-blue-500 hover:bg-blue-600" },
  accepted: { label: "Aceita", variant: "default", className: "bg-green-500 hover:bg-green-600" },
  expired: { label: "Expirada", variant: "destructive" },
  rejected: { label: "Rejeitada", variant: "destructive" },
};

const DEFAULT_SCOPE_DATA: ScopeData = {
  objectives: "",
  deliverables: [],
  exclusions: [],
  assumptions: "",
};

const DEFAULT_TIMELINE_DATA: TimelineData = {
  phases: [],
  startDate: undefined,
};

const DEFAULT_REFERENCES_DATA: ReferencesData = {
  projects: [],
  testimonial: { quote: "", author: "", company: "", role: "" },
  certifications: [],
};

export function ProposalDetailDialog({
  open,
  onOpenChange,
  proposalId,
}: ProposalDetailDialogProps) {
  const isMobile = useIsMobile();
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [currentStep, setCurrentStep] = useState(0);
  const [viewMode, setViewMode] = useState<"internal" | "client">("internal");
  const [showDocumentPreview, setShowDocumentPreview] = useState(false);
  const [workspaceData, setWorkspaceData] = useState<Record<string, unknown> | null>(null);
  const [activeViewTab, setActiveViewTab] = useState<"preview" | "versions" | "activity">("preview");
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  
  // Edit form state
  const [editTitle, setEditTitle] = useState("");
  const [editPrice, setEditPrice] = useState<number | null>(null);
  const [editCtaText, setEditCtaText] = useState("");
  const [editCtaColor, setEditCtaColor] = useState("");
  
  // Client data state
  const [clientData, setClientData] = useState({
    clientType: "contact" as ClientType,
    contactId: null as string | null,
    companyId: null as string | null,
    billingName: "",
    billingNif: "",
    billingAddress: "",
  });
  
  // Conditions data state
  const [conditionsData, setConditionsData] = useState<ConditionsData>({
    paymentConditions: "30_dias",
    customPaymentConditions: "",
    validityDays: 30,
    notes: "",
  });

  // New section states
  const [scopeData, setScopeData] = useState<ScopeData>(DEFAULT_SCOPE_DATA);
  const [timelineData, setTimelineData] = useState<TimelineData>(DEFAULT_TIMELINE_DATA);
  const [referencesData, setReferencesData] = useState<ReferencesData>(DEFAULT_REFERENCES_DATA);

  // AI Preview dialogs
  const [showScopePreview, setShowScopePreview] = useState(false);
  const [showTimelinePreview, setShowTimelinePreview] = useState(false);
  const [showConditionsPreview, setShowConditionsPreview] = useState(false);
  const [showReferencesPreview, setShowReferencesPreview] = useState(false);
  const [pendingScopeResult, setPendingScopeResult] = useState<ScopeResult | null>(null);
  const [pendingTimelineResult, setPendingTimelineResult] = useState<TimelineResult | null>(null);
  const [pendingConditionsResult, setPendingConditionsResult] = useState<ConditionsResult | null>(null);
  const [pendingReferencesResult, setPendingReferencesResult] = useState<ReferencesResult | null>(null);

  const { data: proposal, isLoading } = useProposal(proposalId);
  const { data: versions } = useProposalVersions(proposalId);
  const { data: activity } = useProposalActivity(proposalId);
  const { data: proposalItems } = useProposalItems(proposalId);
  const { data: workspaceMembers } = useWorkspaceMembers();
  const publishProposal = usePublishProposal();
  const updateProposal = useUpdateProposal();
  const toggleItem = useToggleProposalItem();

  // AI Hook
  const {
    generateScope,
    generateTimeline,
    suggestConditions,
    suggestReferences,
    isGeneratingScope,
    isGeneratingTimeline,
    isSuggestingConditions,
    isSuggestingReferences,
  } = useProposalAI();
  
  // Calculate real total from items
  const enabledItems = proposalItems?.filter(item => item.is_enabled !== false) || [];
  const calculatedTotal = enabledItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  
  // Calculate costs and margin from enabled items
  const totalCost = enabledItems.reduce((sum, item) => {
    const directCost = item.cost_snapshot ?? 0;
    const opCost = item.operational_cost_snapshot ?? 0;
    return sum + ((directCost + opCost) * item.quantity);
  }, 0);
  const totalMargin = calculatedTotal - totalCost;
  const marginPct = calculatedTotal > 0 ? (totalMargin / calculatedTotal) * 100 : 0;
  
  // Use calculated total when items exist, otherwise proposal.price
  const displayPrice = proposalItems && proposalItems.length > 0 
    ? calculatedTotal 
    : proposal?.price;
  
  // Auto-sync proposals.price when discrepancy detected
  useEffect(() => {
    if (proposalItems && proposalItems.length > 0 && proposal && !updateProposal.isPending) {
      const storedPrice = proposal.price || 0;
      if (Math.abs(calculatedTotal - storedPrice) > 0.01) {
        updateProposal.mutate({
          id: proposalId,
          price: calculatedTotal,
        });
      }
    }
  }, [proposalItems, proposal?.price, calculatedTotal, proposalId]);
  
  // Handle item toggle
  const handleItemToggle = (itemId: string, isEnabled: boolean) => {
    toggleItem.mutate({ itemId, isEnabled, proposalId });
  };
  
  // Initialize edit form when proposal loads or when switching to edit mode
  const initializeEditForm = () => {
    if (proposal) {
      setEditTitle(proposal.title);
      setEditPrice(proposal.price);
      setEditCtaText(proposal.cta_text);
      setEditCtaColor(proposal.cta_color);
      
      // Initialize client data
      const hasCompany = !!proposal.company_id;
      setClientData({
        clientType: hasCompany ? "company" : "contact",
        contactId: proposal.contact_id,
        companyId: proposal.company_id,
        billingName: proposal.billing_nif ? (proposal.contact?.name || proposal.company?.name || "") : "",
        billingNif: proposal.billing_nif || "",
        billingAddress: proposal.billing_address || "",
      });
      
      // Initialize conditions data
      const paymentValue = proposal.payment_conditions || "30_dias";
      const isCustom = !PAYMENT_CONDITIONS.some(p => p.value === paymentValue);
      setConditionsData({
        paymentConditions: isCustom ? "custom" : paymentValue,
        customPaymentConditions: isCustom ? paymentValue : "",
        validityDays: proposal.validity_days || 30,
        notes: proposal.notes || "",
      });

      // Initialize new section data from JSONB columns
      const proposalAny = proposal as any;
      if (proposalAny.scope_data && typeof proposalAny.scope_data === 'object') {
        setScopeData({ ...DEFAULT_SCOPE_DATA, ...proposalAny.scope_data });
      } else {
        setScopeData(DEFAULT_SCOPE_DATA);
      }
      
      if (proposalAny.timeline_data && Array.isArray(proposalAny.timeline_data)) {
        setTimelineData({ phases: proposalAny.timeline_data, startDate: undefined });
      } else if (proposalAny.timeline_data && typeof proposalAny.timeline_data === 'object') {
        setTimelineData({ ...DEFAULT_TIMELINE_DATA, ...proposalAny.timeline_data });
      } else {
        setTimelineData(DEFAULT_TIMELINE_DATA);
      }
      
      if (proposalAny.references_data && typeof proposalAny.references_data === 'object') {
        setReferencesData({ ...DEFAULT_REFERENCES_DATA, ...proposalAny.references_data });
      } else {
        setReferencesData(DEFAULT_REFERENCES_DATA);
      }
    }
  };
  
  // Initialize when proposal loads
  useEffect(() => {
    if (proposal && mode === "view") {
      initializeEditForm();
    }
  }, [proposal]);
  
  // Fetch workspace data for client document
  useEffect(() => {
    const fetchWorkspaceData = async () => {
      if (!currentWorkspace?.id) return;
      const { data } = await supabase
        .from("workspaces")
        .select("*, logo_url, company_iban, signature_name, signature_title, payment_info")
        .eq("id", currentWorkspace.id)
        .single();
      if (data) {
        setWorkspaceData(data);
      }
    };
    fetchWorkspaceData();
  }, [currentWorkspace?.id]);
  
  const handleStartEditing = () => {
    initializeEditForm();
    setMode("edit");
    setCurrentStep(0);
  };
  
  const handleCancelEdit = () => {
    setMode("view");
    setCurrentStep(0);
  };
  
  const handleSaveEdit = async () => {
    if (!proposal) return;
    
    // Determine payment conditions value
    const paymentConditionsValue = conditionsData.paymentConditions === "custom" 
      ? conditionsData.customPaymentConditions 
      : conditionsData.paymentConditions;
    
    try {
      // Build update data including new JSONB fields
      const updateData: any = {
        id: proposal.id,
        title: editTitle,
        price: editPrice ?? undefined,
        cta_text: editCtaText,
        cta_color: editCtaColor,
        // Client fields
        contact_id: clientData.clientType === "contact" ? clientData.contactId : null,
        company_id: clientData.clientType === "company" ? clientData.companyId : null,
        billing_nif: clientData.billingNif || undefined,
        billing_address: clientData.billingAddress || undefined,
        // Conditions fields
        payment_conditions: paymentConditionsValue || undefined,
        validity_days: conditionsData.validityDays,
        notes: conditionsData.notes || undefined,
        createVersion: true,
      };

      // Save using raw supabase for new JSONB fields
      const { error } = await supabase
        .from("proposals")
        .update({
          title: editTitle,
          price: editPrice,
          cta_text: editCtaText,
          cta_color: editCtaColor,
          contact_id: clientData.clientType === "contact" ? clientData.contactId : null,
          company_id: clientData.clientType === "company" ? clientData.companyId : null,
          billing_nif: clientData.billingNif || null,
          billing_address: clientData.billingAddress || null,
          payment_conditions: paymentConditionsValue || null,
          validity_days: conditionsData.validityDays,
          notes: conditionsData.notes || null,
          scope_data: JSON.parse(JSON.stringify(scopeData)),
          timeline_data: JSON.parse(JSON.stringify(timelineData.phases)),
          references_data: JSON.parse(JSON.stringify(referencesData)),
        })
        .eq("id", proposal.id);

      if (error) throw error;

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      queryClient.invalidateQueries({ queryKey: ["proposal", proposalId] });
      
      toast.success("Proposta atualizada!");
      setMode("view");
      setCurrentStep(0);
    } catch (error: any) {
      toast.error(`Erro ao atualizar proposta: ${error.message}`);
    }
  };

  const getPublicUrl = (slug: string) => {
    return `${window.location.origin}/p/${slug}`;
  };

  const handleCopyLink = () => {
    if (proposal) {
      navigator.clipboard.writeText(getPublicUrl(proposal.slug));
      toast.success("Link copiado!");
    }
  };

  const handlePublish = async () => {
    if (proposal) {
      await publishProposal.mutateAsync(proposal.id);
    }
  };
  
  const handleAssignedToChange = async (userId: string) => {
    if (proposal) {
      await updateProposal.mutateAsync({
        id: proposal.id,
        assigned_to: userId === "_none" ? null : userId,
      });
    }
  };

  const formatCurrency = (value: number | null, currency?: string) => {
    if (!value) return "-";
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: currency || "EUR",
    }).format(value);
  };

  // Completed steps tracking
  const completedSteps = useMemo(() => {
    const completed = new Set<number>();
    // Items - has items
    if (proposalItems && proposalItems.length > 0) completed.add(0);
    // Scope - has objectives or deliverables
    if (scopeData.objectives || scopeData.deliverables.length > 0) completed.add(1);
    // Timeline - has phases
    if (timelineData.phases.length > 0) completed.add(2);
    // Conditions - always has defaults
    if (conditionsData.paymentConditions) completed.add(3);
    // References - has projects or testimonial
    if (referencesData.projects.length > 0 || referencesData.testimonial.quote) completed.add(4);
    // Client - has client selected
    if (clientData.contactId || clientData.companyId) completed.add(5);
    return completed;
  }, [proposalItems, scopeData, timelineData, conditionsData, referencesData, clientData]);

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!proposal) return null;

  const statusInfo = statusConfig[proposal.status];

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Items
        return (
          <div className="h-full">
            <POSProposalItemsEditor 
              proposalId={proposalId} 
              onSaved={async () => {
                await queryClient.refetchQueries({ 
                  queryKey: ["proposal", proposalId] 
                });
              }}
            />
          </div>
        );
      case 1: // Scope
        return (
          <ScrollArea className="h-full">
            <div className="max-w-3xl mx-auto p-1">
              <ProposalScopeSection
                data={scopeData}
                onChange={setScopeData}
                disabled={mode !== "edit"}
                onGenerateWithAI={async () => {
                  const proposalData = {
                    id: proposalId,
                    title: proposal?.title || "",
                    price: displayPrice || 0,
                    status: proposal?.status || "draft",
                    items: proposalItems?.map(i => ({
                      name: i.name,
                      quantity: i.quantity,
                      unit_price: i.unit_price,
                      description: i.description || undefined,
                    })) || [],
                  };
                  const result = await generateScope(proposalData);
                  if (result) {
                    setScopeData({
                      objectives: result.objectives,
                      deliverables: result.deliverables,
                      exclusions: result.exclusions,
                      assumptions: result.assumptions,
                      isAIGenerated: true,
                    });
                    toast.success("Âmbito gerado com sucesso!");
                  }
                }}
                isGenerating={isGeneratingScope}
              />
            </div>
          </ScrollArea>
        );
      case 2: // Timeline
        return (
          <ScrollArea className="h-full">
            <div className="max-w-3xl mx-auto p-1">
              <ProposalTimelineSection
                data={timelineData}
                onChange={setTimelineData}
                disabled={mode !== "edit"}
                onGenerateWithAI={async () => {
                  const proposalData = {
                    id: proposalId,
                    title: proposal?.title || "",
                    price: displayPrice || 0,
                    status: proposal?.status || "draft",
                    items: proposalItems?.map(i => ({
                      name: i.name,
                      quantity: i.quantity,
                      unit_price: i.unit_price,
                    })) || [],
                  };
                  const result = await generateTimeline(proposalData, scopeData);
                  if (result) {
                    setTimelineData({
                      phases: result.phases.map((p, i) => ({
                        id: `ai-${i}`,
                        type: p.type,
                        title: p.title,
                        duration: p.duration,
                        week: p.week,
                        description: p.description,
                      })),
                      isAIGenerated: true,
                    });
                    toast.success("Cronograma gerado com sucesso!");
                  }
                }}
                isGenerating={isGeneratingTimeline}
              />
            </div>
          </ScrollArea>
        );
      case 3: // Conditions
        return (
          <ScrollArea className="h-full">
            <div className="max-w-2xl mx-auto p-1">
              <ProposalConditionsSection
                data={conditionsData}
                onChange={setConditionsData}
                createdAt={proposal?.created_at}
                disabled={mode !== "edit"}
                onGenerateWithAI={async () => {
                  const proposalData = {
                    id: proposalId,
                    title: proposal?.title || "",
                    price: displayPrice || 0,
                    status: proposal?.status || "draft",
                    items: proposalItems?.map(i => ({
                      name: i.name,
                      quantity: i.quantity,
                      unit_price: i.unit_price,
                    })) || [],
                  };
                  const result = await suggestConditions(proposalData);
                  if (result) {
                    const isCustom = !PAYMENT_CONDITIONS.some(p => p.value === result.paymentConditions);
                    setConditionsData({
                      paymentConditions: isCustom ? "custom" : result.paymentConditions,
                      customPaymentConditions: isCustom ? result.paymentConditions : "",
                      validityDays: result.validityDays,
                      notes: result.notes,
                      isAIGenerated: true,
                    });
                    toast.success("Condições sugeridas com sucesso!");
                  }
                }}
                isGenerating={isSuggestingConditions}
              />
            </div>
          </ScrollArea>
        );
      case 4: // References
        return (
          <ScrollArea className="h-full">
            <div className="max-w-4xl mx-auto p-1">
              <ProposalReferencesSection
                data={referencesData}
                onChange={setReferencesData}
                disabled={mode !== "edit"}
                onGenerateWithAI={async () => {
                  const proposalData = {
                    id: proposalId,
                    title: proposal?.title || "",
                    price: displayPrice || 0,
                    status: proposal?.status || "draft",
                    items: proposalItems?.map(i => ({
                      name: i.name,
                      quantity: i.quantity,
                      unit_price: i.unit_price,
                    })) || [],
                  };
                  const result = await suggestReferences(proposalData);
                  if (result) {
                    setReferencesData({
                      projects: result.projects.map((p, i) => ({
                        id: `ai-${i}`,
                        title: p.title,
                        description: p.description,
                      })),
                      testimonial: result.testimonial,
                      certifications: result.certifications,
                      isAIGenerated: true,
                    });
                    toast.success("Referências sugeridas com sucesso!");
                  }
                }}
                isGenerating={isSuggestingReferences}
              />
            </div>
          </ScrollArea>
        );
      case 5: // Client
        return (
          <ScrollArea className="h-full">
            <div className="max-w-2xl mx-auto p-1">
              <ProposalClientSection
                data={clientData}
                onChange={setClientData}
                disabled={mode !== "edit"}
              />
            </div>
          </ScrollArea>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[95vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Compact Header */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-b shrink-0">
          <div className="px-4 md:px-6 py-3">
            <div className="flex items-center justify-between gap-4">
              {/* Left: Title and Status */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="p-1.5 rounded-lg bg-primary/10 shrink-0">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base md:text-lg font-semibold text-foreground truncate">
                      {proposal.title}
                    </h2>
                    <Badge 
                      variant={statusInfo.variant} 
                      className={cn("font-medium shrink-0", statusInfo.className)}
                    >
                      {statusInfo.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {proposal.opportunity?.title || "-"}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {proposal.company?.name || proposal.contact?.name || proposal.opportunity?.lead?.name || "-"}
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-primary">
                      <Euro className="h-3 w-3" />
                      {formatCurrency(displayPrice ?? null, proposal.currency)}
                    </span>
                    {proposalItems && proposalItems.length > 0 && (
                      <span className={cn(
                        "flex items-center gap-1",
                        marginPct >= 30 ? "text-green-600" : "text-red-600"
                      )}>
                        <TrendingUp className="h-3 w-3" />
                        {marginPct.toFixed(0)}% margem
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Right: Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Account Manager Select */}
                <Select
                  value={proposal.assigned_to || "_none"}
                  onValueChange={handleAssignedToChange}
                >
                  <SelectTrigger className="w-auto h-8 text-xs border-muted gap-1 hidden md:flex">
                    <UserCheck className="h-3.5 w-3.5" />
                    <SelectValue>
                      {proposal.assigned_to_profile ? (
                        <span className="truncate max-w-24">{proposal.assigned_to_profile.full_name || proposal.assigned_to_profile.email}</span>
                      ) : (
                        "Responsável"
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Nenhum</SelectItem>
                    {workspaceMembers?.map((member) => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={member.profile?.avatar_url || undefined} />
                            <AvatarFallback className="text-[10px]">
                              {member.profile?.full_name?.charAt(0) || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <span>{member.profile?.full_name || member.profile?.email}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {mode === "view" ? (
                  <>
                    {proposalItems && proposalItems.length > 0 && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setShowDocumentPreview(true)}
                        className="hidden md:flex"
                      >
                        <FileSearch className="h-4 w-4 mr-1" />
                        Pré-visualizar
                      </Button>
                    )}
                    {(proposal.status === "draft" || proposal.status === "published") && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleStartEditing}
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        <span className="hidden md:inline">Editar</span>
                      </Button>
                    )}
                    {proposal.status === "draft" && (
                      <Button 
                        onClick={handlePublish} 
                        disabled={publishProposal.isPending}
                        size="sm"
                        className="bg-primary hover:bg-primary/90"
                      >
                        {publishProposal.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-1" />
                            <span className="hidden md:inline">Publicar</span>
                          </>
                        )}
                      </Button>
                    )}
                    {proposal.status === "published" && (
                      <>
                        <Button variant="outline" size="sm" onClick={handleCopyLink}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(getPublicUrl(proposal.slug), "_blank")}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleCancelEdit}
                    >
                      <X className="h-4 w-4 mr-1" />
                      <span className="hidden md:inline">Cancelar</span>
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={handleSaveEdit}
                      disabled={updateProposal.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {updateProposal.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-1" />
                          <span className="hidden md:inline">Guardar</span>
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {mode === "edit" ? (
            // Edit Mode - Step Navigation
            <div className="flex-1 flex flex-col min-h-0">
              {/* Step Navigation */}
              <div className="px-4 md:px-6 py-4 border-b bg-muted/30 shrink-0">
                <ProposalStepNavigation
                  currentStep={currentStep}
                  onStepChange={setCurrentStep}
                  completedSteps={completedSteps}
                />
              </div>

              {/* Step Content */}
              <div className="flex-1 min-h-0 p-4 md:p-6 overflow-hidden">
                {renderStepContent()}
              </div>
            </div>
          ) : (
            // View Mode - Tabs for Preview/Versions/Activity
            <Tabs
              value={activeViewTab}
              onValueChange={(v) => setActiveViewTab(v as "preview" | "versions" | "activity")}
              className="flex-1 flex flex-col min-h-0"
            >
              <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b bg-muted/30 shrink-0">
                <TabsList className="bg-transparent p-0 h-auto gap-1">
                  <TabsTrigger 
                    value="preview"
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4 py-1.5"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Visualização
                  </TabsTrigger>
                  <TabsTrigger 
                    value="versions"
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4 py-1.5"
                  >
                    <History className="h-4 w-4 mr-2" />
                    Versões ({versions?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger 
                    value="activity"
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4 py-1.5"
                  >
                    <Activity className="h-4 w-4 mr-2" />
                    Atividade
                  </TabsTrigger>
                </TabsList>

                {activeViewTab === "preview" && (
                  <ProposalViewToggle 
                    viewMode={viewMode} 
                    onChange={setViewMode} 
                  />
                )}
              </div>

              <TabsContent value="preview" className="flex-1 min-h-0 mt-0 p-4 md:p-6 bg-muted/20">
                <ScrollArea className="h-full">
                  {viewMode === "internal" ? (
                    <ProposalInternalView
                      proposal={proposal}
                      items={proposalItems?.map(item => ({
                        id: item.id,
                        name: item.name,
                        description: item.description,
                        quantity: item.quantity,
                        unit_price: item.unit_price,
                        total_price: item.total_price || (item.quantity * item.unit_price),
                        is_enabled: item.is_enabled,
                        cost_snapshot: item.cost_snapshot,
                        operational_cost_snapshot: item.operational_cost_snapshot,
                      }))}
                      onItemToggle={handleItemToggle}
                    />
                  ) : (
                    <ProposalClientDocument
                      proposal={proposal}
                      items={proposalItems?.map(item => {
                        const productImages = item.product?.images;
                        const primaryIndex = item.product?.primary_image_index ?? 0;
                        const imageUrl = productImages && productImages.length > 0 
                          ? productImages[primaryIndex] || productImages[0]
                          : null;
                        
                        return {
                          id: item.id,
                          name: item.name,
                          description: item.description,
                          quantity: item.quantity,
                          unit_price: item.unit_price,
                          total_price: item.total_price || (item.quantity * item.unit_price),
                          is_enabled: item.is_enabled,
                          image_url: imageUrl,
                        };
                      })}
                      workspace={workspaceData as Record<string, unknown> & { id: string; name: string }}
                    />
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="versions" className="flex-1 min-h-0 mt-0 p-4 md:p-6">
                <ScrollArea className="h-full">
                  <div className="space-y-3 max-w-2xl mx-auto">
                    {versions?.map((version) => (
                      <Card key={version.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Versão {version.version}</p>
                            <p className="text-sm text-muted-foreground">
                              {version.change_summary}
                            </p>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(version.created_at), "dd/MM/yyyy HH:mm", {
                              locale: pt,
                            })}
                          </p>
                        </div>
                      </Card>
                    ))}
                    {(!versions || versions.length === 0) && (
                      <p className="text-center text-muted-foreground py-8">
                        Nenhuma versão registrada.
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="activity" className="flex-1 min-h-0 mt-0 p-4 md:p-6">
                <ScrollArea className="h-full">
                  <div className="space-y-3 max-w-2xl mx-auto">
                    {activity?.map((log) => (
                      <Card key={log.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium capitalize">{log.action}</p>
                            {log.details && (
                              <p className="text-sm text-muted-foreground">
                                {JSON.stringify(log.details)}
                              </p>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", {
                              locale: pt,
                            })}
                          </p>
                        </div>
                      </Card>
                    ))}
                    {(!activity || activity.length === 0) && (
                      <p className="text-center text-muted-foreground py-8">
                        Nenhuma atividade registrada.
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DialogContent>

      {/* Full-screen Document Preview Dialog */}
      {proposalItems && (
        <ProposalDocumentPreviewDialog
          open={showDocumentPreview}
          onOpenChange={setShowDocumentPreview}
          proposal={proposal}
          items={proposalItems.map(item => {
            const productImages = item.product?.images;
            const primaryIndex = item.product?.primary_image_index ?? 0;
            const imageUrl = productImages && productImages.length > 0 
              ? productImages[primaryIndex] || productImages[0]
              : null;
            
            return {
              id: item.id,
              name: item.name,
              description: item.description || "",
              quantity: item.quantity,
              unit_price: item.unit_price,
              total_price: item.quantity * item.unit_price,
              is_enabled: item.is_enabled,
              image_url: imageUrl,
            };
          })}
          workspace={workspaceData as any}
        />
      )}
    </Dialog>
  );
}
