import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Wand2, ArrowRight, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ContentBlock } from "@/types/proposal";

interface AIProposalGeneratorProps {
  onProposalGenerated: (data: GeneratedProposalData) => void;
  contactName?: string;
  companyName?: string;
  conversationContext?: string;
  opportunityTitle?: string;
  opportunityValue?: number;
}

export interface GeneratedProposalData {
  title: string;
  blocks: ContentBlock[];
  ctaText: string;
  suggestedPrice?: number;
  suggestedOpportunityId?: string;
  tone: string;
}

const examplePrompts = [
  "Proposta de consultoria de marketing digital por 3 meses",
  "Serviço de desenvolvimento de website com manutenção anual",
  "Pacote de gestão de redes sociais para pequenas empresas",
  "Serviço de SEO e otimização de conversão",
];

export function AIProposalGenerator({
  onProposalGenerated,
  contactName,
  companyName,
  conversationContext,
  opportunityTitle,
  opportunityValue,
}: AIProposalGeneratorProps) {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPreview, setGeneratedPreview] = useState<GeneratedProposalData | null>(null);

  // Build context hint
  const contextHint = [
    contactName && `Cliente: ${contactName}`,
    companyName && `Empresa: ${companyName}`,
    opportunityTitle && `Oportunidade: ${opportunityTitle}`,
    opportunityValue && `Valor: €${opportunityValue}`,
  ].filter(Boolean).join(" | ");

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Descreva o que pretende propor");
      return;
    }

    setIsGenerating(true);
    setGeneratedPreview(null);

    try {
      const { data, error } = await supabase.functions.invoke("generate-proposal-from-prompt", {
        body: {
          prompt: prompt.trim(),
          context: {
            contactName,
            companyName,
            conversationContext,
            opportunityTitle,
            opportunityValue,
          },
        },
      });

      if (error) throw new Error(error.message);

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      const result = data?.result;
      if (!result) {
        throw new Error("Resposta inválida da IA");
      }

      const generatedData: GeneratedProposalData = {
        title: result.title || "Proposta Comercial",
        blocks: buildBlocksFromResult(result),
        ctaText: result.cta?.text || "Aceitar Proposta",
        suggestedPrice: result.suggestedPrice,
        tone: result.tone || "comercial",
      };

      setGeneratedPreview(generatedData);
      toast.success("Proposta gerada! Revise antes de continuar.");
    } catch (err) {
      console.error("Error generating proposal:", err);
      toast.error(err instanceof Error ? err.message : "Erro ao gerar proposta");
    } finally {
      setIsGenerating(false);
    }
  };

  const buildBlocksFromResult = (result: Record<string, unknown>): ContentBlock[] => {
    const blocks: ContentBlock[] = [];

    if (result.intro) {
      const intro = result.intro as { title?: string; body?: string };
      blocks.push({
        id: "intro",
        type: "text",
        content: {
          title: intro.title || "Olá!",
          body: intro.body || "",
        },
        order: 0,
      });
    }

    if (result.problem) {
      const problem = result.problem as { title?: string; body?: string };
      blocks.push({
        id: "problem",
        type: "text",
        content: {
          title: problem.title || "O Desafio",
          body: problem.body || "",
        },
        order: 1,
      });
    }

    if (result.solution) {
      const solution = result.solution as { title?: string; body?: string };
      blocks.push({
        id: "solution",
        type: "text",
        content: {
          title: solution.title || "A Nossa Solução",
          body: solution.body || "",
        },
        order: 2,
      });
    }

    if (result.offer) {
      const offer = result.offer as { 
        title?: string; 
        description?: string; 
        features?: string[];
      };
      blocks.push({
        id: "offer",
        type: "offer",
        content: {
          title: offer.title || "O Que Está Incluído",
          description: offer.description || "",
          price: result.suggestedPrice 
            ? `€${(result.suggestedPrice as number).toLocaleString("pt-PT")}`
            : "{{opportunity.value}}",
          features: offer.features || [],
        },
        order: 3,
      });
    }

    if (result.benefits) {
      const benefits = result.benefits as { 
        title?: string; 
        items?: Array<{ title: string; description: string }>;
      };
      blocks.push({
        id: "benefits",
        type: "text",
        content: {
          title: benefits.title || "Benefícios",
          body: (benefits.items || [])
            .map((b) => `• **${b.title}**: ${b.description}`)
            .join("\n"),
        },
        order: 4,
      });
    }

    if (result.guarantee) {
      const guarantee = result.guarantee as { title?: string; body?: string };
      blocks.push({
        id: "guarantee",
        type: "text",
        content: {
          title: guarantee.title || "Garantia",
          body: guarantee.body || "",
        },
        order: 5,
      });
    }

    // Always add CTA block
    blocks.push({
      id: "cta",
      type: "cta",
      content: {
        text: (result.cta as { text?: string })?.text || "Aceitar Proposta",
        style: "primary",
      },
      order: blocks.length,
    });

    return blocks;
  };

  const handleUseProposal = () => {
    if (generatedPreview) {
      onProposalGenerated(generatedPreview);
    }
  };

  const handleExampleClick = (example: string) => {
    setPrompt(example);
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-primary/10">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">Criar Proposta com IA</h3>
          <p className="text-sm text-muted-foreground">
            Diz o que vais vender. Eu preparo a proposta.
          </p>
        </div>
        <Badge variant="secondary" className="ml-auto">Beta</Badge>
      </div>

      {contextHint && (
        <div className="mb-4 p-2 rounded-md bg-muted/50 text-xs text-muted-foreground">
          <span className="font-medium">Contexto detectado:</span> {contextHint}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ex: Proposta de consultoria de marketing digital por 3 meses para a empresa Acme, incluindo gestão de redes sociais e campanhas publicitárias..."
            className="min-h-[100px] resize-none"
            disabled={isGenerating}
          />
          <div className="flex flex-wrap gap-2 mt-2">
            {examplePrompts.map((example, i) => (
              <button
                key={i}
                onClick={() => handleExampleClick(example)}
                className="text-xs text-muted-foreground hover:text-primary transition-colors underline-offset-2 hover:underline"
                disabled={isGenerating}
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        {!generatedPreview ? (
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                A gerar proposta...
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4 mr-2" />
                Gerar Proposta Completa
              </>
            )}
          </Button>
        ) : (
          <div className="space-y-4">
            {/* Preview of generated content */}
            <div className="rounded-lg border bg-background p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">{generatedPreview.title}</h4>
                <Badge variant="outline">{generatedPreview.tone}</Badge>
              </div>
              
              <div className="text-sm text-muted-foreground space-y-2">
                {generatedPreview.blocks.slice(0, 3).map((block, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <span>
                      {block.type === "text" && (block.content as { title?: string }).title}
                      {block.type === "offer" && "Oferta com entregáveis"}
                      {block.type === "cta" && `CTA: "${(block.content as { text?: string }).text}"`}
                    </span>
                  </div>
                ))}
                {generatedPreview.blocks.length > 3 && (
                  <div className="text-xs text-muted-foreground pl-6">
                    +{generatedPreview.blocks.length - 3} secções adicionais
                  </div>
                )}
              </div>

              {generatedPreview.suggestedPrice && (
                <div className="pt-2 border-t">
                  <span className="text-sm text-muted-foreground">Preço sugerido: </span>
                  <span className="font-semibold">
                    €{generatedPreview.suggestedPrice.toLocaleString("pt-PT")}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setGeneratedPreview(null);
                }}
                className="flex-1"
              >
                Refazer
              </Button>
              <Button onClick={handleUseProposal} className="flex-1">
                Usar Esta Proposta
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
