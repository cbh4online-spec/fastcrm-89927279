import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Sparkles, Wand2 } from 'lucide-react';
import { useGeneratePersona, useCreatePersona } from '@/hooks/useAIPersonas';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';

interface GeneratePersonaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GeneratePersonaDialog({ open, onOpenChange }: GeneratePersonaDialogProps) {
  const { currentWorkspace } = useWorkspace();
  const [description, setDescription] = useState('');
  const [generated, setGenerated] = useState<any>(null);
  const generateMutation = useGeneratePersona();
  const createMutation = useCreatePersona();

  const handleGenerate = async () => {
    if (!description.trim() || !currentWorkspace) return;
    try {
      const result = await generateMutation.mutateAsync({
        description: description.trim(),
        workspaceId: currentWorkspace.id,
        save: false,
      });
      setGenerated(result);
    } catch {
      toast.error('Erro ao gerar persona');
    }
  };

  const handleSave = async () => {
    if (!generated || !currentWorkspace) return;
    try {
      await generateMutation.mutateAsync({
        description: description.trim(),
        workspaceId: currentWorkspace.id,
        save: true,
      });
      toast.success('Persona criada como rascunho');
      onOpenChange(false);
      setGenerated(null);
      setDescription('');
    } catch {
      toast.error('Erro ao guardar persona');
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setGenerated(null);
    setDescription('');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Criar Persona com IA
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Textarea
            placeholder="Ex: Uma assistente de vendas simpática chamada Sofia para o sector imobiliário que usa linguagem informal e emojis..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            disabled={generateMutation.isPending}
          />

          {!generated && (
            <Button
              onClick={handleGenerate}
              disabled={!description.trim() || generateMutation.isPending}
              className="w-full"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  A criar persona...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Gerar Persona
                </>
              )}
            </Button>
          )}

          {generated && (
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">{generated.name}</h3>
                  <Badge variant="outline">{generated.role}</Badge>
                </div>
                {generated.description && (
                  <p className="text-sm text-muted-foreground">{generated.description}</p>
                )}
                {generated.expertise_domain && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{generated.expertise_domain}</Badge>
                  </div>
                )}
                {generated.backstory && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-sm italic">{generated.backstory}</p>
                  </div>
                )}
                {generated.suggested_vibe && (
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline">Tom: {generated.suggested_vibe.tone}</Badge>
                    <Badge variant="outline">Emojis: {generated.suggested_vibe.emoji_usage}</Badge>
                    <Badge variant="outline">{generated.suggested_vibe.response_length}</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {generated && (
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerated(null)}>
              Gerar outra
            </Button>
            <Button onClick={handleSave} disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Guardar como rascunho
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
