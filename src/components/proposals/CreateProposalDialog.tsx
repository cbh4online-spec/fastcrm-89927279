import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, FileText, Eye, Save, Sparkles, Wand2, PenLine, ShoppingCart } from "lucide-react";
import { ProposalContentBlocks } from "./ProposalContentBlocks";
import { ProposalPreview } from "./ProposalPreview";
import { AIProposalGenerator, GeneratedProposalData } from "./AIProposalGenerator";
import { POSProposalBuilder } from "./POSProposalBuilder";
import type { CartItem } from "./ProposalCart";
import {
  useProposalTemplates,
  useCreateProposal,
  useUpdateProposalItems,
} from "@/hooks/useProposals";
import { useOpportunities, useOpportunity } from "@/hooks/useOpportunities";
import { useGenerateProposalCopy, ProposalTone } from "@/hooks/useGenerateProposalCopy";
import type { ContentBlock } from "@/types/proposal";
import { toast } from "sonner";

interface CreateProposalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunityId?: string;
  // Pre-fill from inbox context
  contactName?: string;
  companyName?: string;
  conversationContext?: string;
}

const defaultBlocks: ContentBlock[] = [
  {
    id: "intro",
    type: "text",
    content: {
      title: "Olá, {{lead.name}}!",
      body: "Preparamos esta proposta especialmente para você. Confira os detalhes abaixo.",
    },
    order: 0,
  },
  {
    id: "offer",
    type: "offer",
    content: {
      title: "Nossa Proposta",
      description: "Confira o que está incluído",
      price: "{{opportunity.value}}",
      features: ["Item 1", "Item 2", "Item 3"],
    },
    order: 1,
  },
  {
    id: "cta",
    type: "cta",
    content: {
      text: "Aceitar Proposta",
      style: "primary",
    },
    order: 2,
  },
];

const toneOptions: { value: ProposalTone; label: string }[] = [
  { value: "formal", label: "Formal" },
  { value: "comercial", label: "Comercial" },
  { value: "casual", label: "Casual" },
  { value: "curto", label: "Curto e Direto" },
];

export function CreateProposalDialog({
  open,
  onOpenChange,
  opportunityId,
  contactName: propContactName,
  companyName: propCompanyName,
  conversationContext,
}: CreateProposalDialogProps) {
  const [creationMode, setCreationMode] = useState<"ai" | "manual">("ai");
  const [tab, setTab] = useState<"products" | "edit" | "preview">("products");
  const [title, setTitle] = useState("Proposta Comercial");
  const [selectedOpportunityId, setSelectedOpportunityId] = useState(
    opportunityId || ""
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [blocks, setBlocks] = useState<ContentBlock[]>(defaultBlocks);
  const [ctaText, setCtaText] = useState("Aceitar Proposta");
  const [ctaColor, setCtaColor] = useState("#3b82f6");
  const [price, setPrice] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [offerDescription, setOfferDescription] = useState("");
  const [selectedTone, setSelectedTone] = useState<ProposalTone>("comercial");
  const [aiGenerated, setAiGenerated] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const { data: templates, isLoading: loadingTemplates } =
    useProposalTemplates();
  const { data: opportunities, isLoading: loadingOpportunities } =
    useOpportunities();
  const { data: selectedOpportunity } = useOpportunity(
    selectedOpportunityId || undefined
  );
  const createProposal = useCreateProposal();
  const updateProposalItems = useUpdateProposalItems();
  const { isLoading: aiLoading, generateCopy } = useGenerateProposalCopy();

  // Callback estável para atualização de itens do carrinho
  const handleCartItemsChange = useCallback((items: CartItem[]) => {
    setCartItems(items);
    // Auto-update price based on cart total
    const total = items.reduce((acc, item) => {
      const basePrice = item.priceOverride ?? item.product.base_price ?? 0;
      const discountAmount = item.discount ? basePrice * (item.discount / 100) : 0;
      return acc + (basePrice - discountAmount) * item.quantity;
    }, 0);
    if (total > 0) {
      setPrice(total.toString());
    }
  }, []);

  // Build variables from opportunity
  const variables: Record<string, string> = {};
  if (selectedOpportunity) {
    variables["opportunity.title"] = selectedOpportunity.title;
    variables["opportunity.value"] = selectedOpportunity.value
      ? new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
        }).format(selectedOpportunity.value)
      : "";
    if (selectedOpportunity.lead) {
      variables["lead.name"] = selectedOpportunity.lead.name;
      variables["lead.email"] = selectedOpportunity.lead.email || "";
    }
  }

  // Apply template
  useEffect(() => {
    if (selectedTemplateId && templates) {
      const template = templates.find((t) => t.id === selectedTemplateId);
      if (template) {
        setBlocks(template.content_blocks);
        setCtaText(template.cta_text);
        setCtaColor(template.cta_color);
      }
    }
  }, [selectedTemplateId, templates]);

  // AI Generate proposal content
  const handleGenerateWithAI = async () => {
    const contactName = propContactName || selectedOpportunity?.lead?.name;
    
    const result = await generateCopy(
      {
        contactName,
        companyName: propCompanyName,
        dealValue: selectedOpportunity?.value,
        dealTitle: title,
        offerDescription,
      },
      selectedTone,
      ["intro", "offer", "benefits", "cta"]
    );

    if (result) {
      const newBlocks: ContentBlock[] = [];

      if (result.intro) {
        newBlocks.push({
          id: "intro",
          type: "text",
          content: {
            title: result.intro.title,
            body: result.intro.body,
          },
          order: 0,
        });
      }

      if (result.offer) {
        newBlocks.push({
          id: "offer",
          type: "offer",
          content: {
            title: result.offer.title,
            description: result.offer.description,
            price: selectedOpportunity?.value 
              ? new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(selectedOpportunity.value)
              : "{{opportunity.value}}",
            features: result.offer.features,
          },
          order: 1,
        });
      }

      if (result.benefits) {
        newBlocks.push({
          id: "benefits",
          type: "text",
          content: {
            title: result.benefits.title,
            body: result.benefits.items.map(b => `• **${b.title}**: ${b.description}`).join("\n"),
          },
          order: 2,
        });
      }

      if (result.cta) {
        setCtaText(result.cta.text);
        newBlocks.push({
          id: "cta",
          type: "cta",
          content: {
            text: result.cta.text,
            style: "primary",
          },
          order: 3,
        });
      }

      setBlocks(newBlocks);
      toast.success("Conteúdo gerado com IA! Revise antes de guardar.");
    }
  };

  const handleSave = async () => {
    const oppId = selectedOpportunityId === "__none__" ? "" : selectedOpportunityId;
    if (!oppId) return;

    const proposal = await createProposal.mutateAsync({
      opportunity_id: oppId,
      template_id: selectedTemplateId && selectedTemplateId !== "__none__" ? selectedTemplateId : undefined,
      title,
      content_blocks: blocks,
      variables,
      cta_text: ctaText,
      cta_color: ctaColor,
      price: price ? parseFloat(price) : selectedOpportunity?.value || undefined,
      expires_at: expiresAt || undefined,
    });

    // Save cart items to proposal_items table
    if (cartItems.length > 0 && proposal?.id) {
      await updateProposalItems.mutateAsync({
        proposalId: proposal.id,
        items: cartItems.map((item, idx) => ({
          product_id: item.product.id,
          name: item.product.name,
          description: item.product.short_description || null,
          quantity: item.quantity,
          unit_price: item.priceOverride ?? item.product.base_price ?? 0,
          position: idx,
          is_enabled: true,
          cost_snapshot: item.product.direct_cost ?? null,
          operational_cost_snapshot: item.product.operational_cost ?? null,
        })),
      });
    }

    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setTitle("Proposta Comercial");
    setSelectedOpportunityId(opportunityId || "");
    setSelectedTemplateId("");
    setBlocks(defaultBlocks);
    setCtaText("Aceitar Proposta");
    setCtaColor("#3b82f6");
    setPrice("");
    setExpiresAt("");
    setOfferDescription("");
    setTab("products");
    setCreationMode("ai");
    setAiGenerated(false);
    setCartItems([]);
  };

  const handleAIProposalGenerated = (data: GeneratedProposalData) => {
    setTitle(data.title);
    setBlocks(data.blocks);
    setCtaText(data.ctaText);
    if (data.suggestedPrice) {
      setPrice(data.suggestedPrice.toString());
    }
    setAiGenerated(true);
    setCreationMode("manual"); // Switch to manual mode to allow editing
    toast.success("Proposta carregada! Pode editar antes de guardar.");
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Criar Nova Proposta
          </DialogTitle>
        </DialogHeader>

        {/* Creation Mode Selector */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={creationMode === "ai" ? "default" : "outline"}
            size="sm"
            onClick={() => setCreationMode("ai")}
            className="flex-1"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Criar com IA
          </Button>
          <Button
            variant={creationMode === "manual" ? "default" : "outline"}
            size="sm"
            onClick={() => setCreationMode("manual")}
            className="flex-1"
          >
            <PenLine className="h-4 w-4 mr-2" />
            Criar Manualmente
          </Button>
        </div>

        {creationMode === "ai" && !aiGenerated ? (
          <ScrollArea className="flex-1">
            <div className="space-y-4 pr-4">
              {/* Opportunity Selection for AI mode */}
              <div className="space-y-2">
                <Label>Oportunidade (opcional)</Label>
                <Select
                  value={selectedOpportunityId}
                  onValueChange={setSelectedOpportunityId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma oportunidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhuma</SelectItem>
                    {loadingOpportunities ? (
                      <div className="p-2 text-center">
                        <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                      </div>
                    ) : (
                      opportunities?.map((opp) => (
                        <SelectItem key={opp.id} value={opp.id}>
                          {opp.title}
                          {opp.lead && (
                            <span className="text-muted-foreground">
                              {" "}
                              - {opp.lead.name}
                            </span>
                          )}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <AIProposalGenerator
                onProposalGenerated={handleAIProposalGenerated}
                contactName={propContactName || selectedOpportunity?.lead?.name}
                companyName={propCompanyName}
                conversationContext={conversationContext}
                opportunityTitle={selectedOpportunity?.title}
                opportunityValue={selectedOpportunity?.value || undefined}
              />
            </div>
          </ScrollArea>
        ) : (
          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as "products" | "edit" | "preview")}
            className="flex-1 flex flex-col min-h-0"
          >
            <TabsList className="grid w-full max-w-lg grid-cols-3">
              <TabsTrigger value="products" className="gap-1.5">
                <ShoppingCart className="h-4 w-4" />
                Produtos
                {cartItems.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                    {cartItems.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="edit">Conteúdo</TabsTrigger>
              <TabsTrigger value="preview">
                <Eye className="h-4 w-4 mr-2" />
                Pré-visualizar
              </TabsTrigger>
            </TabsList>

            {/* Products Tab - POS Interface */}
            <TabsContent value="products" className="flex-1 min-h-0 mt-4">
              <POSProposalBuilder
                opportunityTitle={selectedOpportunity?.title}
                opportunityValue={selectedOpportunity?.value || undefined}
                leadName={propContactName || selectedOpportunity?.lead?.name}
                companyName={propCompanyName}
                contactId={selectedOpportunity?.lead_id || undefined}
                onItemsChange={handleCartItemsChange}
                initialItems={cartItems}
              />
            </TabsContent>

            <TabsContent value="edit" className="flex-1 min-h-0 mt-4">
              <ScrollArea className="h-full pr-4">
                <div className="space-y-6">
                  {aiGenerated && (
                    <Card className="p-3 bg-green-500/10 border-green-500/20">
                      <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                        <Sparkles className="h-4 w-4" />
                        <span className="text-sm font-medium">Gerado por IA - revise e ajuste conforme necessário</span>
                      </div>
                    </Card>
                  )}
                  {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Oportunidade *</Label>
                    <Select
                      value={selectedOpportunityId}
                      onValueChange={setSelectedOpportunityId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma oportunidade" />
                      </SelectTrigger>
                      <SelectContent>
                        {loadingOpportunities ? (
                          <div className="p-2 text-center">
                            <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                          </div>
                        ) : (
                          opportunities?.map((opp) => (
                            <SelectItem key={opp.id} value={opp.id}>
                              {opp.title}
                              {opp.lead && (
                                <span className="text-muted-foreground">
                                  {" "}
                                  - {opp.lead.name}
                                </span>
                              )}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Modelo (opcional)</Label>
                    <Select
                      value={selectedTemplateId}
                      onValueChange={setSelectedTemplateId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sem modelo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Sem modelo</SelectItem>
                        {loadingTemplates ? (
                          <div className="p-2 text-center">
                            <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                          </div>
                        ) : (
                          templates?.map((tpl) => (
                            <SelectItem key={tpl.id} value={tpl.id}>
                              {tpl.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Título da Proposta</Label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Proposta Comercial"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Preço (sobrescrever valor da oportunidade)</Label>
                    <Input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder={
                        selectedOpportunity?.value?.toString() || "0.00"
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Texto do CTA</Label>
                    <Input
                      value={ctaText}
                      onChange={(e) => setCtaText(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cor do CTA</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={ctaColor}
                        onChange={(e) => setCtaColor(e.target.value)}
                        className="w-10 h-10 rounded border cursor-pointer"
                      />
                      <Input
                        value={ctaColor}
                        onChange={(e) => setCtaColor(e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Expira em</Label>
                    <Input
                      type="date"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                    />
                  </div>
                </div>

                <Separator />

                {/* AI Generation Section */}
                <Card className="p-4 bg-primary/5 border-primary/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <h3 className="font-medium">Gerar Conteúdo com IA</h3>
                    <Badge variant="secondary" className="text-xs">Beta</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Descreva a oferta e deixe a IA gerar o conteúdo da proposta.
                  </p>
                  
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs">Descrição da oferta</Label>
                      <Input
                        value={offerDescription}
                        onChange={(e) => setOfferDescription(e.target.value)}
                        placeholder="Ex: Serviço de consultoria de marketing digital por 3 meses"
                        className="mt-1"
                      />
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <Label className="text-xs">Tom da proposta</Label>
                        <Select
                          value={selectedTone}
                          onValueChange={(v) => setSelectedTone(v as ProposalTone)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {toneOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <Button
                        onClick={handleGenerateWithAI}
                        disabled={aiLoading}
                        className="mt-5"
                      >
                        {aiLoading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Wand2 className="h-4 w-4 mr-2" />
                        )}
                        Gerar Proposta
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* Variables Preview */}
                {Object.keys(variables).length > 0 && (
                  <Card className="p-4">
                    <Label className="text-sm mb-2 block">
                      Variáveis disponíveis
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(variables).map(([key, value]) => (
                        <Badge key={key} variant="secondary">
                          {`{{${key}}}`}: {value || "(vazio)"}
                        </Badge>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Content Blocks */}
                <ProposalContentBlocks
                  blocks={blocks}
                  onChange={setBlocks}
                  variables={variables}
                />
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="preview" className="flex-1 min-h-0 mt-4">
            <ScrollArea className="h-full">
              <ProposalPreview
                title={title}
                blocks={blocks}
                variables={variables}
                ctaText={ctaText}
                ctaColor={ctaColor}
                price={
                  price
                    ? parseFloat(price)
                    : selectedOpportunity?.value || null
                }
                showCta={true}
              />
            </ScrollArea>
            </TabsContent>
          </Tabs>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!selectedOpportunityId || selectedOpportunityId === "__none__" || createProposal.isPending}
          >
            {createProposal.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar Proposta
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
