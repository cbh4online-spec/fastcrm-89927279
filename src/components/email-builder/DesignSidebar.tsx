import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Palette } from 'lucide-react';
import type { EmailGlobalStyles } from '@/types/emailBuilder';

interface DesignSidebarProps {
  globalStyles: EmailGlobalStyles;
  onUpdateStyles: (updates: Partial<EmailGlobalStyles>) => void;
}

const FONT_FAMILIES = [
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Helvetica, sans-serif', label: 'Helvetica' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'Times New Roman, serif', label: 'Times New Roman' },
  { value: 'Verdana, sans-serif', label: 'Verdana' },
  { value: 'Tahoma, sans-serif', label: 'Tahoma' },
  { value: 'Trebuchet MS, sans-serif', label: 'Trebuchet MS' },
];

export function DesignSidebar({ globalStyles, onUpdateStyles }: DesignSidebarProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Palette className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">Design Global</h3>
          <p className="text-xs text-muted-foreground">
            Configurações do template
          </p>
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Background Colors */}
          <div className="space-y-4">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Cores
            </h4>
            
            <div className="space-y-2">
              <Label htmlFor="bg-color" className="text-xs">
                Fundo do Email
              </Label>
              <div className="flex gap-2">
                <Input
                  id="bg-color"
                  type="color"
                  value={globalStyles.backgroundColor}
                  onChange={(e) => onUpdateStyles({ backgroundColor: e.target.value })}
                  className="w-12 h-9 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={globalStyles.backgroundColor}
                  onChange={(e) => onUpdateStyles({ backgroundColor: e.target.value })}
                  className="flex-1 font-mono text-xs"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="content-bg-color" className="text-xs">
                Fundo do Conteúdo
              </Label>
              <div className="flex gap-2">
                <Input
                  id="content-bg-color"
                  type="color"
                  value={globalStyles.contentBackgroundColor}
                  onChange={(e) => onUpdateStyles({ contentBackgroundColor: e.target.value })}
                  className="w-12 h-9 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={globalStyles.contentBackgroundColor}
                  onChange={(e) => onUpdateStyles({ contentBackgroundColor: e.target.value })}
                  className="flex-1 font-mono text-xs"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="text-color" className="text-xs">
                Cor do Texto
              </Label>
              <div className="flex gap-2">
                <Input
                  id="text-color"
                  type="color"
                  value={globalStyles.textColor}
                  onChange={(e) => onUpdateStyles({ textColor: e.target.value })}
                  className="w-12 h-9 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={globalStyles.textColor}
                  onChange={(e) => onUpdateStyles({ textColor: e.target.value })}
                  className="flex-1 font-mono text-xs"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="link-color" className="text-xs">
                Cor dos Links
              </Label>
              <div className="flex gap-2">
                <Input
                  id="link-color"
                  type="color"
                  value={globalStyles.linkColor}
                  onChange={(e) => onUpdateStyles({ linkColor: e.target.value })}
                  className="w-12 h-9 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={globalStyles.linkColor}
                  onChange={(e) => onUpdateStyles({ linkColor: e.target.value })}
                  className="flex-1 font-mono text-xs"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accent-color" className="text-xs">
                Cor de Destaque
              </Label>
              <div className="flex gap-2">
                <Input
                  id="accent-color"
                  type="color"
                  value={globalStyles.accentColor}
                  onChange={(e) => onUpdateStyles({ accentColor: e.target.value })}
                  className="w-12 h-9 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={globalStyles.accentColor}
                  onChange={(e) => onUpdateStyles({ accentColor: e.target.value })}
                  className="flex-1 font-mono text-xs"
                />
              </div>
            </div>
          </div>
          
          {/* Layout */}
          <div className="space-y-4">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Layout
            </h4>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="content-width" className="text-xs">
                  Largura do Conteúdo
                </Label>
                <span className="text-xs text-muted-foreground">
                  {globalStyles.contentWidth}px
                </span>
              </div>
              <Slider
                id="content-width"
                value={[globalStyles.contentWidth]}
                min={400}
                max={800}
                step={10}
                onValueChange={([value]) => onUpdateStyles({ contentWidth: value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="border-radius" className="text-xs">
                Arredondamento do Container
              </Label>
              <Select
                value={globalStyles.borderRadius}
                onValueChange={(value) => onUpdateStyles({ borderRadius: value })}
              >
                <SelectTrigger id="border-radius">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0px">Nenhum</SelectItem>
                  <SelectItem value="4px">Pequeno (4px)</SelectItem>
                  <SelectItem value="8px">Médio (8px)</SelectItem>
                  <SelectItem value="12px">Grande (12px)</SelectItem>
                  <SelectItem value="16px">Extra Grande (16px)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Typography */}
          <div className="space-y-4">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Tipografia
            </h4>
            
            <div className="space-y-2">
              <Label htmlFor="font-family" className="text-xs">
                Fonte Principal
              </Label>
              <Select
                value={globalStyles.fontFamily}
                onValueChange={(value) => onUpdateStyles({ fontFamily: value })}
              >
                <SelectTrigger id="font-family">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_FAMILIES.map((font) => (
                    <SelectItem 
                      key={font.value} 
                      value={font.value}
                      style={{ fontFamily: font.value }}
                    >
                      {font.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tips */}
          <div className="p-3 bg-muted/50 rounded-lg space-y-2">
            <h4 className="text-xs font-medium">💡 Dicas</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Clica num bloco para editá-lo</li>
              <li>• Arrasta elementos da sidebar esquerda</li>
              <li>• Usa os templates para começar rapidamente</li>
            </ul>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
