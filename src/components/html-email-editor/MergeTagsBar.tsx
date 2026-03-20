import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const MERGE_TAGS = [
  { tag: '{{primeiro_nome}}', label: 'Primeiro Nome' },
  { tag: '{{empresa}}', label: 'Empresa' },
  { tag: '{{email}}', label: 'Email' },
  { tag: '{{telefone}}', label: 'Telefone' },
  { tag: '{{data_hoje}}', label: 'Data Hoje' },
  { tag: '{{website}}', label: 'Website' },
];

interface MergeTagsBarProps {
  onInsert: (tag: string) => void;
}

export function MergeTagsBar({ onInsert }: MergeTagsBarProps) {
  return (
    <div className="space-y-2">
      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
        Variáveis dinâmicas
      </span>
      <div className="flex flex-wrap gap-1">
        {MERGE_TAGS.map((mt) => (
          <Button
            key={mt.tag}
            variant="outline"
            size="sm"
            className="h-6 text-[10px] px-2 font-mono"
            onClick={() => {
              onInsert(mt.tag);
              toast.info(`${mt.label} inserido`);
            }}
          >
            {mt.tag}
          </Button>
        ))}
      </div>
    </div>
  );
}
