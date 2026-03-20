import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useReengagementAI } from '@/hooks/useReengagementAI';
import { Brain, Users, Loader2, Sparkles, ArrowRight } from 'lucide-react';

interface Props {
  onCampaignCreated?: (campaignId: string) => void;
}

export function ReengagementCard({ onCampaignCreated }: Props) {
  const {
    inactiveThreshold,
    setInactiveThreshold,
    generateReengagementCampaign,
    isGenerating,
    previewSubjects,
    inactiveCount,
  } = useReengagementAI();

  const [hasGenerated, setHasGenerated] = useState(false);

  const handleGenerate = () => {
    generateReengagementCampaign.mutate(undefined, {
      onSuccess: () => setHasGenerated(true),
    });
  };

  return (
    <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Brain className="h-4 w-4 text-amber-600" />
          Re-engajamento com IA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasGenerated ? (
          <>
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-amber-600" />
              <div className="flex-1">
                <p className="text-sm font-medium">Contactos inactivos</p>
                <p className="text-xs text-muted-foreground">
                  Sem aberturas há mais de {inactiveThreshold} dias
                </p>
              </div>
              <Select value={String(inactiveThreshold)} onValueChange={(v) => setInactiveThreshold(Number(v))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 dias</SelectItem>
                  <SelectItem value="60">60 dias</SelectItem>
                  <SelectItem value="90">90 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleGenerate} disabled={isGenerating} className="w-full" variant="outline">
              {isGenerating ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> A gerar...</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" /> Lançar campanha de re-engajamento com IA</>
              )}
            </Button>
          </>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-amber-100 text-amber-700">
                {inactiveCount} contactos encontrados
              </Badge>
            </div>

            {previewSubjects.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Exemplos de assuntos gerados:</p>
                {previewSubjects.map((ps, i) => (
                  <div key={i} className="p-2 bg-background rounded border text-sm">
                    <p className="font-medium">{ps.subject}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{ps.preview_text}</p>
                    <p className="text-[10px] text-muted-foreground">Para: {ps.contact_name}</p>
                  </div>
                ))}
              </div>
            )}

            <Button className="w-full">
              Gerar campanha <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
