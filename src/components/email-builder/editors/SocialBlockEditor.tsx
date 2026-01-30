import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SocialBlockContent } from '@/types/emailBuilder';

interface SocialBlockEditorProps {
  content: SocialBlockContent;
  onUpdate: (updates: Partial<SocialBlockContent>) => void;
}

const SOCIAL_NETWORKS = [
  { value: 'facebook', label: 'Facebook', icon: '📘' },
  { value: 'twitter', label: 'Twitter/X', icon: '𝕏' },
  { value: 'instagram', label: 'Instagram', icon: '📸' },
  { value: 'linkedin', label: 'LinkedIn', icon: '💼' },
  { value: 'youtube', label: 'YouTube', icon: '▶️' },
  { value: 'tiktok', label: 'TikTok', icon: '🎵' },
  { value: 'whatsapp', label: 'WhatsApp', icon: '💬' },
] as const;

export function SocialBlockEditor({ content, onUpdate }: SocialBlockEditorProps) {
  const addNetwork = () => {
    const usedNetworks = content.networks.map(n => n.type);
    const availableNetwork = SOCIAL_NETWORKS.find(n => !usedNetworks.includes(n.value as typeof content.networks[0]['type']));
    
    if (availableNetwork) {
      const newNetworks = [...content.networks, { type: availableNetwork.value as typeof content.networks[0]['type'], url: '#' }];
      onUpdate({ networks: newNetworks });
    }
  };

  const updateNetwork = (index: number, field: 'type' | 'url', value: string) => {
    const newNetworks = [...content.networks];
    newNetworks[index] = { ...newNetworks[index], [field]: value };
    onUpdate({ networks: newNetworks });
  };

  const removeNetwork = (index: number) => {
    const newNetworks = content.networks.filter((_, i) => i !== index);
    onUpdate({ networks: newNetworks });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Redes Sociais</Label>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={addNetwork}
            disabled={content.networks.length >= SOCIAL_NETWORKS.length}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Adicionar
          </Button>
        </div>

        <div className="space-y-2">
          {content.networks.map((network, index) => {
            const networkInfo = SOCIAL_NETWORKS.find(n => n.value === network.type);
            return (
              <div key={index} className="flex items-start gap-2 p-2 bg-muted/50 rounded-md">
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{networkInfo?.icon}</span>
                    <Select
                      value={network.type}
                      onValueChange={(value) => updateNetwork(index, 'type', value)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SOCIAL_NETWORKS.map((n) => (
                          <SelectItem key={n.value} value={n.value}>
                            {n.icon} {n.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Input
                    value={network.url}
                    onChange={(e) => updateNetwork(index, 'url', e.target.value)}
                    placeholder="https://..."
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => removeNetwork(index)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-4 border-t space-y-4">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Estilo
        </h4>

        <div className="space-y-2">
          <Label className="text-xs">Estilo do Ícone</Label>
          <Select
            value={content.iconStyle || 'circle'}
            onValueChange={(value: 'circle' | 'square' | 'rounded') => onUpdate({ iconStyle: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="circle">Círculo</SelectItem>
              <SelectItem value="square">Quadrado</SelectItem>
              <SelectItem value="rounded">Arredondado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Tamanho do Ícone</Label>
          <Select
            value={content.iconSize || '40px'}
            onValueChange={(value) => onUpdate({ iconSize: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24px">Pequeno</SelectItem>
              <SelectItem value="32px">Médio</SelectItem>
              <SelectItem value="40px">Grande</SelectItem>
              <SelectItem value="48px">Extra Grande</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Cor dos Ícones</Label>
          <div className="flex gap-2">
            <Input
              type="color"
              value={content.iconColor || '#333333'}
              onChange={(e) => onUpdate({ iconColor: e.target.value })}
              className="w-12 h-9 p-1 cursor-pointer"
            />
            <Input
              type="text"
              value={content.iconColor || '#333333'}
              onChange={(e) => onUpdate({ iconColor: e.target.value })}
              className="flex-1 font-mono text-xs"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
