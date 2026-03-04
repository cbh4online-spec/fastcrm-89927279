import { useContextBindings } from '@/hooks/useContextBindings';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link2, Plus, Trash2, Loader2 } from 'lucide-react';
import { useState } from 'react';

const ASSET_KINDS = ['landing_page', 'email_template', 'campaign', 'product', 'funnel', 'opportunity', 'proposal'];

export function ContextBindingsTab({ blockId }: { blockId: string }) {
  const { bindings, isLoading, addBinding, removeBinding } = useContextBindings(blockId);
  const [assetKind, setAssetKind] = useState('');
  const [assetId, setAssetId] = useState('');

  const handleAdd = () => {
    if (!assetKind || !assetId) return;
    addBinding.mutate({ block_id: blockId, asset_kind: assetKind, asset_id: assetId });
    setAssetKind('');
    setAssetId('');
  };

  if (isLoading) {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link2 className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-medium">Bindings ({bindings?.length ?? 0})</h3>
      </div>

      {/* Add new binding */}
      <div className="flex items-center gap-2">
        <Select value={assetKind} onValueChange={setAssetKind}>
          <SelectTrigger className="h-8 text-xs w-[140px]">
            <SelectValue placeholder="Tipo de asset" />
          </SelectTrigger>
          <SelectContent>
            {ASSET_KINDS.map(k => (
              <SelectItem key={k} value={k} className="text-xs">{k}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          className="h-8 text-xs flex-1"
          placeholder="ID do asset"
          value={assetId}
          onChange={(e) => setAssetId(e.target.value)}
        />
        <Button size="sm" className="h-8 text-xs gap-1" onClick={handleAdd} disabled={!assetKind || !assetId}>
          <Plus className="h-3 w-3" /> Adicionar
        </Button>
      </div>

      {/* List */}
      <div className="space-y-1.5">
        {bindings?.map(b => (
          <Card key={b.id} className="border-border/20">
            <CardContent className="py-2 px-3 flex items-center gap-2">
              <Badge variant="outline" className="text-[10px]">{b.asset_kind}</Badge>
              <span className="text-xs text-muted-foreground truncate flex-1">{b.asset_id}</span>
              <Badge variant="secondary" className="text-[10px]">{b.binding_type}</Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => removeBinding.mutate(b.id)}
              >
                <Trash2 className="h-3 w-3 text-muted-foreground" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
