import { useState } from "react";
import { ArrowLeft, MessageSquare, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AIFunnelChat } from "./AIFunnelChat";
import { AIFunnelWizard } from "./AIFunnelWizard";
import { AISummaryPanel } from "./AISummaryPanel";

export interface AIFunnelRecommendation {
  vertical: string;
  pageTemplate: string;
  captureType: string;
  objective: string;
  headline: string;
  subheadline: string;
  ctaPrimary: string;
  ctaSecondary: string;
  funnelSteps: { name: string; type: string; description: string }[];
  routing: { pipeline: string; tags: string[]; sla: string };
  automations: { trigger: string; action: string; channel: string }[];
  tracking: string[];
  kpis: string[];
  slug: string;
  domain: string;
  thankYou: string;
  seo: { title: string; description: string };
  reasoning: string;
}

interface Props {
  onBack: () => void;
  onApply: (recommendation: AIFunnelRecommendation) => void;
}

export function AIFunnelBuilder({ onBack, onApply }: Props) {
  const [mode, setMode] = useState<"chat" | "wizard">("chat");
  const [recommendation, setRecommendation] = useState<AIFunnelRecommendation | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Criar Funil com IA</h1>
          <p className="text-sm text-muted-foreground">
            Descreve o teu objectivo e a IA constrói o funil por ti
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main area */}
        <div className="lg:col-span-2">
          <Tabs value={mode} onValueChange={(v) => setMode(v as "chat" | "wizard")}>
            <TabsList className="w-full">
              <TabsTrigger value="chat" className="flex-1 gap-2">
                <MessageSquare className="h-4 w-4" />
                Conversa com IA
              </TabsTrigger>
              <TabsTrigger value="wizard" className="flex-1 gap-2">
                <ListChecks className="h-4 w-4" />
                Wizard Guiado
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="mt-4">
              <AIFunnelChat onRecommendation={setRecommendation} />
            </TabsContent>

            <TabsContent value="wizard" className="mt-4">
              <AIFunnelWizard onRecommendation={setRecommendation} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Summary panel */}
        <div className="lg:col-span-1">
          <AISummaryPanel
            recommendation={recommendation}
            onApply={() => recommendation && onApply(recommendation)}
            onEdit={() => {/* future: open edit mode */}}
          />
        </div>
      </div>
    </div>
  );
}
