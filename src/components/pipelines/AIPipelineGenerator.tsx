import { useState } from "react";
import { Sparkles, Loader2, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useGeneratePipeline, GeneratedPipeline } from "@/hooks/useGeneratePipeline";
import { PipelinePreviewCard } from "./PipelinePreviewCard";

interface AIPipelineGeneratorProps {
  onPipelineCreated?: () => void;
  trigger?: React.ReactNode;
}

const EXAMPLES = [
  "Tenho uma consultoria de marketing digital. Os clientes pedem reunião, faço diagnóstico, envio proposta e fecho contrato mensal.",
  "Sou advogado de família. Recebo consultas iniciais, analiso o caso, faço proposta de honorários e acompanho o processo.",
  "Vendo software SaaS para restaurantes. Temos demo, trial de 14 dias, onboarding e renovação anual.",
  "Escola de formação: interessados pedem informação, fazem visita, inscrevem-se e pagam mensalidade.",
  "Imobiliária: captação de imóveis, visitas com clientes, propostas, reservas e escrituras.",
];

export function AIPipelineGenerator({ onPipelineCreated, trigger }: AIPipelineGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [generatedPipeline, setGeneratedPipeline] = useState<GeneratedPipeline | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const generateMutation = useGeneratePipeline();

  const handleGenerate = async () => {
    if (!description.trim()) return;

    const result = await generateMutation.mutateAsync({ description });
    setGeneratedPipeline(result);
    setShowPreview(true);
  };

  const handleExampleClick = (example: string) => {
    setDescription(example);
  };

  const handleBackToEdit = () => {
    setShowPreview(false);
  };

  const handlePipelineCreated = () => {
    setOpen(false);
    setDescription("");
    setGeneratedPipeline(null);
    setShowPreview(false);
    onPipelineCreated?.();
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset state when closing
      setDescription("");
      setGeneratedPipeline(null);
      setShowPreview(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Criar com IA
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {!showPreview ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Criar Pipeline com IA
              </DialogTitle>
              <DialogDescription>
                Descreva o seu processo de vendas, funil ou escada de valor em linguagem natural.
                A IA vai criar um pipeline otimizado para o seu negócio.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Descreva o seu processo de vendas:
                </label>
                <Textarea
                  placeholder="Ex: Tenho uma escola de dança. Os interessados pedem informação, fazem aula experimental, inscrevem-se e pagam mensalidade..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Lightbulb className="h-4 w-4" />
                  <span>Exemplos (clique para usar):</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLES.map((example, index) => (
                    <button
                      key={index}
                      onClick={() => handleExampleClick(example)}
                      className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors text-left"
                    >
                      {example.length > 60 ? `${example.slice(0, 60)}...` : example}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={!description.trim() || generateMutation.isPending}
                  className="gap-2"
                >
                  {generateMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      A gerar...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Gerar Pipeline
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          generatedPipeline && (
            <PipelinePreviewCard
              pipeline={generatedPipeline}
              onBack={handleBackToEdit}
              onCreated={handlePipelineCreated}
            />
          )
        )}
      </DialogContent>
    </Dialog>
  );
}
