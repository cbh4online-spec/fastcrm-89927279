import { useState } from 'react';
import { useContextDependencies } from '@/hooks/useContextDependencies';
import { useContextBlocks } from '@/hooks/useContextBlocks';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Trash2, ArrowRight, Plus, Link2 } from 'lucide-react';
import { Loader2 } from 'lucide-react';

interface Props {
  blockId: string;
}

const RELATIONS = [
  { value: 'uses', label: 'Usa' },
  { value: 'mentions', label: 'Menciona' },
  { value: 'drives', label: 'Influencia' },
  { value: 'generated_from', label: 'Gerado a partir de' },
  { value: 'depends_on', label: 'Depende de' },
  { value: 'references', label: 'Referencia' },
];

export function ContextDependenciesTab({ blockId }: Props) {
  const { dependencies, isLoading, addDependency, removeDependency } = useContextDependencies(blockId);
  const { data: blocks } = useContextBlocks();
  const [showAdd, setShowAdd] = useState(false);
  const [targetId, setTargetId] = useState('');
  const [relation, setRelation] = useState('uses');
  const [strength, setStrength] = useState([50]);

  const otherBlocks = blocks?.filter((b) => b.id !== blockId) ?? [];

  const handleAdd = () => {
    if (!targetId) return;
    addDependency.mutate(
      { source_block_id: blockId, target_block_id: targetId, relation, strength: strength[0] },
      { onSuccess: () => { setShowAdd(false); setTargetId(''); } }
    );
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  const asSource = dependencies?.filter((d) => d.source_block_id === blockId) ?? [];
  const asTarget = dependencies?.filter((d) => d.target_block_id === blockId) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <Link2 className="h-4 w-4 text-primary" />
          Dependências ({(asSource.length + asTarget.length)})
        </h3>
        <Button size="sm" variant="outline" onClick={() => setShowAdd(!showAdd)} className="gap-1 text-xs">
          <Plus className="h-3 w-3" /> Adicionar
        </Button>
      </div>

      {showAdd && (
        <div className="space-y-3 p-3 rounded-lg border border-border/50 bg-muted/20">
          <Select value={targetId} onValueChange={setTargetId}>
            <SelectTrigger className="text-xs"><SelectValue placeholder="Selecionar bloco destino..." /></SelectTrigger>
            <SelectContent>
              {otherBlocks.map((b) => (
                <SelectItem key={b.id} value={b.id} className="text-xs">{b.title} ({b.block_type})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Select value={relation} onValueChange={setRelation}>
              <SelectTrigger className="text-xs w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {RELATIONS.map((r) => <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex-1 flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">Força:</span>
              <Slider value={strength} onValueChange={setStrength} min={0} max={100} step={5} className="flex-1" />
              <span className="text-xs font-mono w-8">{strength[0]}</span>
            </div>
          </div>
          <Button size="sm" onClick={handleAdd} disabled={!targetId || addDependency.isPending} className="text-xs">
            {addDependency.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            Criar dependência
          </Button>
        </div>
      )}

      {asSource.length === 0 && asTarget.length === 0 && !showAdd && (
        <p className="text-xs text-muted-foreground text-center py-6">Sem dependências configuradas</p>
      )}

      {asSource.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Este bloco afeta →</p>
          {asSource.map((d) => {
            const target = blocks?.find((b) => b.id === d.target_block_id);
            return (
              <div key={d.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/20 border border-border/30 text-xs">
                <ArrowRight className="h-3 w-3 text-primary shrink-0" />
                <span className="flex-1 truncate">{target?.title ?? d.target_block_id}</span>
                <span className="text-muted-foreground">{d.relation}</span>
                {d.auto_detected && <span className="text-[9px] px-1 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20">auto</span>}
                <span className="font-mono text-muted-foreground">{d.strength}%</span>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeDependency.mutate(d.id)}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {asTarget.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">← Afetado por</p>
          {asTarget.map((d) => {
            const source = blocks?.find((b) => b.id === d.source_block_id);
            return (
              <div key={d.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/20 border border-border/30 text-xs">
                <ArrowRight className="h-3 w-3 text-amber-500 shrink-0 rotate-180" />
                <span className="flex-1 truncate">{source?.title ?? d.source_block_id}</span>
                <span className="text-muted-foreground">{d.relation}</span>
                {d.auto_detected && <span className="text-[9px] px-1 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20">auto</span>}
                <span className="font-mono text-muted-foreground">{d.strength}%</span>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeDependency.mutate(d.id)}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
