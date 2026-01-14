import { useState, useEffect } from "react";
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
import { Loader2, FileText, Eye, Save } from "lucide-react";
import { ProposalContentBlocks } from "./ProposalContentBlocks";
import { ProposalPreview } from "./ProposalPreview";
import {
  useProposalTemplates,
  useCreateProposal,
} from "@/hooks/useProposals";
import { useOpportunities, useOpportunity } from "@/hooks/useOpportunities";
import type { ContentBlock } from "@/types/proposal";

interface CreateProposalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunityId?: string;
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

export function CreateProposalDialog({
  open,
  onOpenChange,
  opportunityId,
}: CreateProposalDialogProps) {
  const [tab, setTab] = useState<"edit" | "preview">("edit");
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

  const { data: templates, isLoading: loadingTemplates } =
    useProposalTemplates();
  const { data: opportunities, isLoading: loadingOpportunities } =
    useOpportunities();
  const { data: selectedOpportunity } = useOpportunity(
    selectedOpportunityId || undefined
  );
  const createProposal = useCreateProposal();

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

  const handleSave = async () => {
    if (!selectedOpportunityId) return;

    await createProposal.mutateAsync({
      opportunity_id: selectedOpportunityId,
      template_id: selectedTemplateId || undefined,
      title,
      content_blocks: blocks,
      variables,
      cta_text: ctaText,
      cta_color: ctaColor,
      price: price ? parseFloat(price) : selectedOpportunity?.value || undefined,
      expires_at: expiresAt || undefined,
    });

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
    setTab("edit");
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

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as "edit" | "preview")}
          className="flex-1 flex flex-col min-h-0"
        >
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="edit">Editar</TabsTrigger>
            <TabsTrigger value="preview">
              <Eye className="h-4 w-4 mr-2" />
              Pré-visualizar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="flex-1 min-h-0 mt-4">
            <ScrollArea className="h-full pr-4">
              <div className="space-y-6">
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
                        <SelectItem value="">Sem modelo</SelectItem>
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

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!selectedOpportunityId || createProposal.isPending}
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
