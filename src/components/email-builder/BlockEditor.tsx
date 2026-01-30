import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { X, Trash2, Copy, ChevronUp, ChevronDown, Upload } from 'lucide-react';
import {
  HeroBlockEditor,
  ProductBlockEditor,
  CountdownBlockEditor,
  TestimonialBlockEditor,
  MenuBlockEditor,
  ImageTextBlockEditor,
  SocialBlockEditor,
  VideoBlockEditor,
} from './editors';
import type { 
  EmailBlock, 
  TextBlockContent,
  ImageBlockContent,
  ButtonBlockContent,
  DividerBlockContent,
  SpacerBlockContent,
  FooterBlockContent,
  HeroBlockContent,
  ProductBlockContent,
  CountdownBlockContent,
  TestimonialBlockContent,
  MenuBlockContent,
  ImageTextBlockContent,
  SocialBlockContent,
  VideoBlockContent,
  HtmlBlockContent,
} from '@/types/emailBuilder';

interface BlockEditorProps {
  block: EmailBlock;
  onUpdate: (updates: Partial<EmailBlock>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onClose: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onOpenImageUploader?: () => void;
}

export function BlockEditor({
  block,
  onUpdate,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onClose,
  canMoveUp,
  canMoveDown,
  onOpenImageUploader,
}: BlockEditorProps) {
  const updateContent = (contentUpdates: Record<string, unknown>) => {
    onUpdate({
      content: { ...block.content, ...contentUpdates } as typeof block.content,
    });
  };

  const updateStyles = (styleUpdates: Record<string, string>) => {
    onUpdate({
      styles: { ...block.styles, ...styleUpdates },
    });
  };

  const renderTextEditor = () => {
    const content = block.content as TextBlockContent;
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs">Conteúdo HTML</Label>
          <Textarea
            value={content.html}
            onChange={(e) => updateContent({ html: e.target.value })}
            className="min-h-[150px] font-mono text-xs"
            placeholder="<p>O teu texto aqui...</p>"
          />
          <p className="text-xs text-muted-foreground">
            Podes usar HTML básico e variáveis como {'{{primeiro_nome}}'}
          </p>
        </div>
      </div>
    );
  };

  const renderImageEditor = () => {
    const content = block.content as ImageBlockContent;
    return (
      <div className="space-y-4">
        {onOpenImageUploader && (
          <Button
            variant="outline"
            className="w-full"
            onClick={onOpenImageUploader}
          >
            <Upload className="h-4 w-4 mr-2" />
            Carregar Imagem
          </Button>
        )}
        <div className="space-y-2">
          <Label className="text-xs">URL da Imagem</Label>
          <Input
            value={content.src}
            onChange={(e) => updateContent({ src: e.target.value })}
            placeholder="https://..."
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Texto Alternativo</Label>
          <Input
            value={content.alt}
            onChange={(e) => updateContent({ alt: e.target.value })}
            placeholder="Descrição da imagem"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Link (opcional)</Label>
          <Input
            value={content.link || ''}
            onChange={(e) => updateContent({ link: e.target.value })}
            placeholder="https://..."
          />
        </div>
      </div>
    );
  };

  const renderButtonEditor = () => {
    const content = block.content as ButtonBlockContent;
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs">Texto do Botão</Label>
          <Input
            value={content.text}
            onChange={(e) => updateContent({ text: e.target.value })}
            placeholder="Clica aqui"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">URL de Destino</Label>
          <Input
            value={content.url}
            onChange={(e) => updateContent({ url: e.target.value })}
            placeholder="https://..."
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Cor de Fundo</Label>
          <div className="flex gap-2">
            <Input
              type="color"
              value={content.backgroundColor || '#3b82f6'}
              onChange={(e) => updateContent({ backgroundColor: e.target.value })}
              className="w-12 h-9 p-1 cursor-pointer"
            />
            <Input
              type="text"
              value={content.backgroundColor || '#3b82f6'}
              onChange={(e) => updateContent({ backgroundColor: e.target.value })}
              className="flex-1 font-mono text-xs"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Cor do Texto</Label>
          <div className="flex gap-2">
            <Input
              type="color"
              value={content.textColor || '#ffffff'}
              onChange={(e) => updateContent({ textColor: e.target.value })}
              className="w-12 h-9 p-1 cursor-pointer"
            />
            <Input
              type="text"
              value={content.textColor || '#ffffff'}
              onChange={(e) => updateContent({ textColor: e.target.value })}
              className="flex-1 font-mono text-xs"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Tamanho</Label>
          <Select
            value={content.size || 'medium'}
            onValueChange={(value: 'small' | 'medium' | 'large') => updateContent({ size: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="small">Pequeno</SelectItem>
              <SelectItem value="medium">Médio</SelectItem>
              <SelectItem value="large">Grande</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Arredondamento</Label>
          <Select
            value={content.borderRadius || '6px'}
            onValueChange={(value) => updateContent({ borderRadius: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0px">Sem arredondamento</SelectItem>
              <SelectItem value="4px">Ligeiro (4px)</SelectItem>
              <SelectItem value="6px">Médio (6px)</SelectItem>
              <SelectItem value="12px">Grande (12px)</SelectItem>
              <SelectItem value="50px">Pílula</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-xs">Largura Total</Label>
          <Switch
            checked={content.fullWidth || false}
            onCheckedChange={(checked) => updateContent({ fullWidth: checked })}
          />
        </div>
      </div>
    );
  };

  const renderDividerEditor = () => {
    const content = block.content as DividerBlockContent;
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs">Cor</Label>
          <div className="flex gap-2">
            <Input
              type="color"
              value={content.color || '#e5e5e5'}
              onChange={(e) => updateContent({ color: e.target.value })}
              className="w-12 h-9 p-1 cursor-pointer"
            />
            <Input
              type="text"
              value={content.color || '#e5e5e5'}
              onChange={(e) => updateContent({ color: e.target.value })}
              className="flex-1 font-mono text-xs"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Espessura</Label>
          <Select
            value={content.thickness || '1px'}
            onValueChange={(value) => updateContent({ thickness: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1px">Fina (1px)</SelectItem>
              <SelectItem value="2px">Média (2px)</SelectItem>
              <SelectItem value="3px">Grossa (3px)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Estilo</Label>
          <Select
            value={content.style || 'solid'}
            onValueChange={(value) => updateContent({ style: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="solid">Sólida</SelectItem>
              <SelectItem value="dashed">Tracejada</SelectItem>
              <SelectItem value="dotted">Pontilhada</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  };

  const renderSpacerEditor = () => {
    const content = block.content as SpacerBlockContent;
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs">Altura</Label>
          <Select
            value={content.height}
            onValueChange={(value) => updateContent({ height: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10px">Pequeno (10px)</SelectItem>
              <SelectItem value="20px">Médio (20px)</SelectItem>
              <SelectItem value="30px">Grande (30px)</SelectItem>
              <SelectItem value="50px">Extra Grande (50px)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  };

  const renderFooterEditor = () => {
    const content = block.content as FooterBlockContent;
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs">Texto do Rodapé</Label>
          <Textarea
            value={content.text}
            onChange={(e) => updateContent({ text: e.target.value })}
            className="min-h-[80px] text-xs"
            placeholder="{{empresa_nome}} | {{empresa_endereco}}"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Informação da Empresa</Label>
          <Input
            value={content.companyInfo || ''}
            onChange={(e) => updateContent({ companyInfo: e.target.value })}
            placeholder="{{empresa_endereco}}"
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-xs">Mostrar Link de Cancelamento</Label>
            <p className="text-xs text-muted-foreground">Adiciona link para unsubscribe</p>
          </div>
          <Switch
            checked={content.showUnsubscribe !== false}
            onCheckedChange={(checked) => updateContent({ showUnsubscribe: checked })}
          />
        </div>
      </div>
    );
  };

  const renderHtmlEditor = () => {
    const content = block.content as HtmlBlockContent;
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs">Código HTML Personalizado</Label>
          <Textarea
            value={content.html}
            onChange={(e) => updateContent({ html: e.target.value })}
            className="min-h-[200px] font-mono text-xs"
            placeholder="<!-- HTML personalizado -->"
          />
          <p className="text-xs text-muted-foreground">
            Código HTML avançado. Use com cuidado.
          </p>
        </div>
      </div>
    );
  };

  const renderStyleEditor = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs">Alinhamento</Label>
        <Select
          value={block.styles.textAlign || 'left'}
          onValueChange={(value) => updateStyles({ textAlign: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="left">Esquerda</SelectItem>
            <SelectItem value="center">Centro</SelectItem>
            <SelectItem value="right">Direita</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label className="text-xs">Padding</Label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            value={block.styles.paddingTop || ''}
            onChange={(e) => updateStyles({ paddingTop: e.target.value })}
            placeholder="Topo"
            className="font-mono text-xs"
          />
          <Input
            value={block.styles.paddingBottom || ''}
            onChange={(e) => updateStyles({ paddingBottom: e.target.value })}
            placeholder="Base"
            className="font-mono text-xs"
          />
          <Input
            value={block.styles.paddingLeft || ''}
            onChange={(e) => updateStyles({ paddingLeft: e.target.value })}
            placeholder="Esquerda"
            className="font-mono text-xs"
          />
          <Input
            value={block.styles.paddingRight || ''}
            onChange={(e) => updateStyles({ paddingRight: e.target.value })}
            placeholder="Direita"
            className="font-mono text-xs"
          />
        </div>
        <p className="text-xs text-muted-foreground">Ou usar formato único:</p>
        <Input
          value={block.styles.padding || ''}
          onChange={(e) => updateStyles({ padding: e.target.value })}
          placeholder="10px 20px"
          className="font-mono text-xs"
        />
      </div>
      
      <div className="space-y-2">
        <Label className="text-xs">Cor de Fundo</Label>
        <div className="flex gap-2">
          <Input
            type="color"
            value={block.styles.backgroundColor || '#ffffff'}
            onChange={(e) => updateStyles({ backgroundColor: e.target.value })}
            className="w-12 h-9 p-1 cursor-pointer"
          />
          <Input
            type="text"
            value={block.styles.backgroundColor || ''}
            onChange={(e) => updateStyles({ backgroundColor: e.target.value })}
            placeholder="transparent"
            className="flex-1 font-mono text-xs"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Arredondamento</Label>
        <Select
          value={block.styles.borderRadius || '0px'}
          onValueChange={(value) => updateStyles({ borderRadius: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0px">Nenhum</SelectItem>
            <SelectItem value="4px">Pequeno</SelectItem>
            <SelectItem value="8px">Médio</SelectItem>
            <SelectItem value="12px">Grande</SelectItem>
            <SelectItem value="16px">Extra Grande</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Borda</Label>
        <Input
          value={block.styles.border || ''}
          onChange={(e) => updateStyles({ border: e.target.value })}
          placeholder="1px solid #e5e5e5"
          className="font-mono text-xs"
        />
      </div>
    </div>
  );

  const renderBlockTypeEditor = () => {
    switch (block.type) {
      case 'text':
        return renderTextEditor();
      case 'image':
      case 'logo':
        return renderImageEditor();
      case 'button':
        return renderButtonEditor();
      case 'divider':
        return renderDividerEditor();
      case 'spacer':
        return renderSpacerEditor();
      case 'footer':
        return renderFooterEditor();
      case 'html':
        return renderHtmlEditor();
      case 'hero':
        return (
          <HeroBlockEditor
            content={block.content as HeroBlockContent}
            onUpdate={(updates) => updateContent(updates)}
            onOpenImageUploader={onOpenImageUploader}
          />
        );
      case 'product':
        return (
          <ProductBlockEditor
            content={block.content as ProductBlockContent}
            onUpdate={(updates) => updateContent(updates)}
            onOpenImageUploader={onOpenImageUploader}
          />
        );
      case 'countdown':
        return (
          <CountdownBlockEditor
            content={block.content as CountdownBlockContent}
            onUpdate={(updates) => updateContent(updates)}
          />
        );
      case 'testimonial':
        return (
          <TestimonialBlockEditor
            content={block.content as TestimonialBlockContent}
            onUpdate={(updates) => updateContent(updates)}
            onOpenImageUploader={onOpenImageUploader}
          />
        );
      case 'menu':
        return (
          <MenuBlockEditor
            content={block.content as MenuBlockContent}
            onUpdate={(updates) => updateContent(updates)}
          />
        );
      case 'imageText':
        return (
          <ImageTextBlockEditor
            content={block.content as ImageTextBlockContent}
            onUpdate={(updates) => updateContent(updates)}
            onOpenImageUploader={onOpenImageUploader}
          />
        );
      case 'social':
        return (
          <SocialBlockEditor
            content={block.content as SocialBlockContent}
            onUpdate={(updates) => updateContent(updates)}
          />
        );
      case 'video':
        return (
          <VideoBlockEditor
            content={block.content as VideoBlockContent}
            onUpdate={(updates) => updateContent(updates)}
            onOpenImageUploader={onOpenImageUploader}
          />
        );
      default:
        return <p className="text-sm text-muted-foreground">Editor não disponível para este tipo.</p>;
    }
  };

  const blockTypeNames: Record<string, string> = {
    text: 'Texto',
    image: 'Imagem',
    button: 'Botão',
    divider: 'Divisor',
    spacer: 'Espaçador',
    columns: 'Colunas',
    social: 'Redes Sociais',
    footer: 'Rodapé',
    logo: 'Logo',
    video: 'Vídeo',
    html: 'HTML',
    hero: 'Hero',
    product: 'Produto',
    countdown: 'Countdown',
    testimonial: 'Testemunho',
    menu: 'Menu',
    imageText: 'Imagem + Texto',
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">{blockTypeNames[block.type] || 'Bloco'}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Editar propriedades
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <Tabs defaultValue="content" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="grid w-full grid-cols-2 rounded-none border-b h-9 bg-transparent px-4">
          <TabsTrigger value="content" className="text-xs data-[state=active]:bg-muted rounded-sm h-7">
            Conteúdo
          </TabsTrigger>
          <TabsTrigger value="style" className="text-xs data-[state=active]:bg-muted rounded-sm h-7">
            Estilos
          </TabsTrigger>
        </TabsList>
        
        <ScrollArea className="flex-1">
          <TabsContent value="content" className="m-0 p-4">
            {renderBlockTypeEditor()}
          </TabsContent>
          <TabsContent value="style" className="m-0 p-4">
            {renderStyleEditor()}
          </TabsContent>
        </ScrollArea>
      </Tabs>
      
      <div className="p-4 border-t space-y-2">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            className="flex-1"
          >
            <ChevronUp className="h-4 w-4 mr-1" />
            Subir
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            className="flex-1"
          >
            <ChevronDown className="h-4 w-4 mr-1" />
            Descer
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onDuplicate}
            className="flex-1"
          >
            <Copy className="h-4 w-4 mr-1" />
            Duplicar
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={onDelete}
            className="flex-1"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Eliminar
          </Button>
        </div>
      </div>
    </div>
  );
}
