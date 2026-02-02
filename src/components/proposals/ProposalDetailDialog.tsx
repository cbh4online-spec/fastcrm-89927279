import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Package,
  Users,
  CreditCard,
  FileSearch,
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";
import { ProposalPreview } from "./ProposalPreview";
import { ProposalItemsEditor } from "./ProposalItemsEditor";
import { ProposalClientSection } from "./ProposalClientSection";
import { ProposalConditionsSection } from "./ProposalConditionsSection";
import { ProposalViewToggle } from "./ProposalViewToggle";
import { ProposalInternalView } from "./ProposalInternalView";
import { ProposalClientDocument } from "./ProposalClientDocument";
import { ProposalDocumentPreviewDialog } from "./ProposalDocumentPreviewDialog";
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
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import type { ProposalStatus, ContentBlock } from "@/types/proposal";
import { cn } from "@/lib/utils";

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

export function ProposalDetailDialog({
  open,
  onOpenChange,
  proposalId,
}: ProposalDetailDialogProps) {
  const [tab, setTab] = useState<"preview" | "edit" | "items" | "client" | "conditions" | "versions" | "activity">("preview");
  const [viewMode, setViewMode] = useState<"internal" | "client">("internal");
  const [isEditing, setIsEditing] = useState(false);
  const [showDocumentPreview, setShowDocumentPreview] = useState(false);
  const [workspaceData, setWorkspaceData] = useState<Record<string, unknown> | null>(null);
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
  const [conditionsData, setConditionsData] = useState({
    paymentConditions: "30_dias",
    customPaymentConditions: "",
    validityDays: 30,
    notes: "",
  });

  const { data: proposal, isLoading } = useProposal(proposalId);
  const { data: versions } = useProposalVersions(proposalId);
  const { data: activity } = useProposalActivity(proposalId);
  const { data: proposalItems } = useProposalItems(proposalId);
  const publishProposal = usePublishProposal();
  const updateProposal = useUpdateProposal();
  const toggleItem = useToggleProposalItem();
  
  // Calculate real total from items
  const calculatedTotal = proposalItems
    ?.filter(item => item.is_enabled !== false)
    .reduce((sum, item) => sum + (item.quantity * item.unit_price), 0) || 0;
  
  // Use calculated total when items exist, otherwise proposal.price
  const displayPrice = proposalItems && proposalItems.length > 0 
    ? calculatedTotal 
    : proposal?.price;
  
  // Auto-sync proposals.price when discrepancy detected
  useEffect(() => {
    if (proposalItems && proposalItems.length > 0 && proposal && !updateProposal.isPending) {
      const storedPrice = proposal.price || 0;
      // If significant difference (>0.01€), sync silently
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
    }
  };
  
  // Initialize when proposal loads
  useEffect(() => {
    if (proposal && !isEditing) {
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
    setTab("edit");
    setIsEditing(true);
  };
  
  const handleCancelEdit = () => {
    setIsEditing(false);
    setTab("preview");
  };
  
  const handleSaveEdit = async () => {
    if (!proposal) return;
    
    // Determine payment conditions value
    const paymentConditionsValue = conditionsData.paymentConditions === "custom" 
      ? conditionsData.customPaymentConditions 
      : conditionsData.paymentConditions;
    
    try {
      await updateProposal.mutateAsync({
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
      });
      setIsEditing(false);
      setTab("preview");
    } catch (error) {
      // Error already handled in hook
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

  const formatCurrency = (value: number | null, currency?: string) => {
    if (!value) return "-";
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: currency || "EUR",
    }).format(value);
  };

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Premium Header */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-b">
          {/* Top Bar with Title and Actions */}
          <div className="px-6 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <Badge 
                    variant={statusInfo.variant} 
                    className={cn("font-medium", statusInfo.className)}
                  >
                    {statusInfo.label}
                  </Badge>
                </div>
                <h2 className="text-xl font-semibold text-foreground truncate">
                  {proposal.title}
                </h2>
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Edit Button - always visible for draft/published */}
                {(proposal.status === "draft" || proposal.status === "published") && !isEditing && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleStartEditing}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                )}
                
                {/* Save/Cancel when editing */}
                {isEditing && (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleCancelEdit}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={handleSaveEdit}
                      disabled={updateProposal.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {updateProposal.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Guardar
                    </Button>
                  </>
                )}
                
                {/* Preview Document Button - always visible when items exist */}
                {proposalItems && proposalItems.length > 0 && !isEditing && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowDocumentPreview(true)}
                  >
                    <FileSearch className="h-4 w-4 mr-2" />
                    Pré-visualizar
                  </Button>
                )}
                
                {proposal.status === "draft" && !isEditing && (
                  <Button 
                    onClick={handlePublish} 
                    disabled={publishProposal.isPending}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {publishProposal.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Publicar
                  </Button>
                )}
                {proposal.status === "published" && !isEditing && (
                  <>
                    <Button variant="outline" size="sm" onClick={handleCopyLink}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar Link
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        window.open(getPublicUrl(proposal.slug), "_blank")
                      }
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Abrir
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Info Cards Row */}
          <div className="px-6 pb-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Opportunity */}
              <div className="bg-card/50 backdrop-blur-sm rounded-lg p-3 border border-border/50">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Building2 className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium uppercase tracking-wide">Oportunidade</span>
                </div>
                <p className="font-medium text-sm truncate">
                  {proposal.opportunity?.title || "-"}
                </p>
              </div>

              {/* Client */}
              <div className="bg-card/50 backdrop-blur-sm rounded-lg p-3 border border-border/50">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <User className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium uppercase tracking-wide">Cliente</span>
                </div>
                <p className="font-medium text-sm truncate">
                  {proposal.company?.name || proposal.contact?.name || proposal.opportunity?.lead?.name || "-"}
                </p>
              </div>

              {/* Value */}
              <div className="bg-card/50 backdrop-blur-sm rounded-lg p-3 border border-border/50">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Euro className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium uppercase tracking-wide">Valor</span>
                </div>
                <p className="font-semibold text-sm text-primary">
                  {formatCurrency(displayPrice ?? null, proposal.currency)}
                </p>
              </div>

              {/* Created Date */}
              <div className="bg-card/50 backdrop-blur-sm rounded-lg p-3 border border-border/50">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Calendar className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium uppercase tracking-wide">Criada em</span>
                </div>
                <p className="font-medium text-sm">
                  {format(new Date(proposal.created_at), "dd MMM yyyy", { locale: pt })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="flex-1 flex flex-col min-h-0">
          <Tabs
            value={tab}
            onValueChange={(v) =>
              setTab(v as "preview" | "edit" | "items" | "client" | "conditions" | "versions" | "activity")
            }
            className="flex-1 flex flex-col min-h-0"
          >
            <div className="flex items-center justify-between px-6 py-3 border-b bg-muted/30">
              <TabsList className="bg-transparent p-0 h-auto gap-1 flex-wrap">
                <TabsTrigger 
                  value="preview"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4 py-1.5"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Visualização
                </TabsTrigger>
                {isEditing && (
                  <>
                    <TabsTrigger 
                      value="edit"
                      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4 py-1.5"
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Detalhes
                    </TabsTrigger>
                    <TabsTrigger 
                      value="items"
                      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4 py-1.5"
                    >
                      <Package className="h-4 w-4 mr-2" />
                      Itens ({proposalItems?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger 
                      value="client"
                      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4 py-1.5"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Cliente
                    </TabsTrigger>
                    <TabsTrigger 
                      value="conditions"
                      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4 py-1.5"
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Condições
                    </TabsTrigger>
                  </>
                )}
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

              {/* View Mode Toggle */}
              {tab === "preview" && (
                <ProposalViewToggle 
                  viewMode={viewMode} 
                  onChange={setViewMode} 
                />
              )}
            </div>

            <TabsContent value="preview" className="flex-1 min-h-0 mt-0 p-6 bg-muted/20">
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
                    }))}
                    onItemToggle={handleItemToggle}
                  />
                ) : (
                  <ProposalClientDocument
                    proposal={proposal}
                    items={proposalItems?.map(item => {
                      // Get product image
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

            {/* Edit Tab Content */}
            <TabsContent value="edit" className="flex-1 min-h-0 mt-0 p-6">
              <ScrollArea className="h-full">
                <div className="max-w-2xl mx-auto space-y-6">
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Informações da Proposta</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-title">Título da Proposta</Label>
                        <Input
                          id="edit-title"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          placeholder="Ex: Proposta de Serviços de Marketing"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="edit-price">Valor (€)</Label>
                        <Input
                          id="edit-price"
                          type="number"
                          value={editPrice ?? ""}
                          onChange={(e) => setEditPrice(e.target.value ? parseFloat(e.target.value) : null)}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Call to Action</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-cta-text">Texto do Botão</Label>
                        <Input
                          id="edit-cta-text"
                          value={editCtaText}
                          onChange={(e) => setEditCtaText(e.target.value)}
                          placeholder="Ex: Aceitar Proposta"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="edit-cta-color">Cor do Botão</Label>
                        <div className="flex gap-3 items-center">
                          <Input
                            id="edit-cta-color"
                            type="color"
                            value={editCtaColor || "#3b82f6"}
                            onChange={(e) => setEditCtaColor(e.target.value)}
                            className="w-16 h-10 p-1 cursor-pointer"
                          />
                          <Input
                            value={editCtaColor || "#3b82f6"}
                            onChange={(e) => setEditCtaColor(e.target.value)}
                            placeholder="#3b82f6"
                            className="flex-1"
                          />
                          <div 
                            className="h-10 px-4 rounded-md flex items-center justify-center text-white font-medium text-sm"
                            style={{ backgroundColor: editCtaColor || "#3b82f6" }}
                          >
                            {editCtaText || "Preview"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline" onClick={handleCancelEdit}>
                      <X className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                    <Button 
                      onClick={handleSaveEdit}
                      disabled={updateProposal.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {updateProposal.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Guardar Alterações
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Items Tab Content */}
            <TabsContent value="items" className="flex-1 min-h-0 mt-0 p-6">
              <ProposalItemsEditor 
                proposalId={proposalId} 
                onSaved={async () => {
                  // Forçar refetch para atualizar o header com novo preço
                  await queryClient.refetchQueries({ 
                    queryKey: ["proposal", proposalId] 
                  });
                }}
              />
            </TabsContent>

            {/* Client Tab Content */}
            <TabsContent value="client" className="flex-1 min-h-0 mt-0 p-6">
              <ScrollArea className="h-full">
                <div className="max-w-2xl mx-auto">
                  <ProposalClientSection
                    data={clientData}
                    onChange={setClientData}
                    disabled={!isEditing}
                  />
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Conditions Tab Content */}
            <TabsContent value="conditions" className="flex-1 min-h-0 mt-0 p-6">
              <ScrollArea className="h-full">
                <div className="max-w-2xl mx-auto">
                  <ProposalConditionsSection
                    data={conditionsData}
                    onChange={setConditionsData}
                    createdAt={proposal?.created_at}
                    disabled={!isEditing}
                  />
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="versions" className="flex-1 min-h-0 mt-0 p-6">
              <ScrollArea className="h-full">
                <div className="space-y-3">
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

            <TabsContent value="activity" className="flex-1 min-h-0 mt-0 p-6">
              <ScrollArea className="h-full">
                <div className="space-y-3">
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
        </div>
      </DialogContent>

      {/* Full-screen Document Preview Dialog */}
      {proposalItems && (
        <ProposalDocumentPreviewDialog
          open={showDocumentPreview}
          onOpenChange={setShowDocumentPreview}
          proposal={proposal}
          items={proposalItems.map(item => {
            // Get product image
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
