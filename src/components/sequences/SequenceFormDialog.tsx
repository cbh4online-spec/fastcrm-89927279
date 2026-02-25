import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import {
  useCreateSequence,
  useUpdateSequence,
  type EmailSequence,
} from '@/hooks/useEmailSequences';

const EXIT_CONDITION_OPTIONS = [
  { type: 'reply', label: 'Parar se responder' },
  { type: 'meeting_booked', label: 'Parar se reunião marcada' },
  { type: 'deal_created', label: 'Parar se deal criado' },
  { type: 'unsubscribe', label: 'Parar se cancelar inscrição' },
];

interface SequenceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sequence?: EmailSequence | null;
}

export function SequenceFormDialog({ open, onOpenChange, sequence }: SequenceFormDialogProps) {
  const isEditing = !!sequence?.id;
  const createSequence = useCreateSequence();
  const updateSequence = useUpdateSequence();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [exitConditions, setExitConditions] = useState<string[]>(['reply']);

  useEffect(() => {
    if (sequence) {
      setName(sequence.name);
      setDescription(sequence.description || '');
      setTags(sequence.tags || []);
      setExitConditions(sequence.exitConditions?.map((c) => c.type) || ['reply']);
    } else {
      setName('');
      setDescription('');
      setTags([]);
      setExitConditions(['reply']);
    }
  }, [sequence, open]);

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
    }
    setTagInput('');
  };

  const handleSubmit = async () => {
    const conditions = exitConditions.map((type) => ({
      type,
      label: EXIT_CONDITION_OPTIONS.find((o) => o.type === type)?.label,
    }));

    if (isEditing && sequence?.id) {
      await updateSequence.mutateAsync({
        id: sequence.id,
        name,
        description,
        tags,
        exit_conditions: conditions,
      });
    } else {
      await createSequence.mutateAsync({
        name,
        description,
        tags,
        exitConditions: conditions,
      });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Sequência' : 'Nova Sequência'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Follow-up Vendas" />
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o objetivo desta sequência..."
              rows={3}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Adicionar tag..."
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              />
              <Button variant="outline" size="sm" onClick={addTag} type="button">
                Adicionar
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => setTags(tags.filter((t) => t !== tag))}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Exit Conditions */}
          <div className="space-y-2">
            <Label>Condições de Saída</Label>
            <div className="space-y-2">
              {EXIT_CONDITION_OPTIONS.map((opt) => (
                <div key={opt.type} className="flex items-center gap-2">
                  <Checkbox
                    checked={exitConditions.includes(opt.type)}
                    onCheckedChange={(checked) => {
                      setExitConditions(
                        checked
                          ? [...exitConditions, opt.type]
                          : exitConditions.filter((c) => c !== opt.type)
                      );
                    }}
                  />
                  <span className="text-sm">{opt.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name || createSequence.isPending || updateSequence.isPending}
          >
            {isEditing ? 'Guardar' : 'Criar Sequência'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
