import { useState, useEffect, useCallback } from 'react';
import { MousePointer, Type, Heading, Image, Link2, Minus, Square, PaintBucket, Copy, ClipboardPaste, RotateCcw, Upload } from 'lucide-react';
import { AIRewritePanel } from './AIRewritePanel';
import { MergeTagsBar } from './MergeTagsBar';
import { ImageUploadDialog } from './ImageUploadDialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { EditableElement, EditableElementType, ElementUpdate } from './types';
import { ELEMENT_TYPE_LABELS, ELEMENT_TYPE_COLORS, EMAIL_SAFE_FONTS } from './types';

interface HtmlContextPanelProps {
  selectedElement: EditableElement | null;
  onUpdate: (update: ElementUpdate) => void;
}

const TYPE_ICONS: Record<EditableElementType, React.ReactNode> = {
  cta: <PaintBucket className="h-3.5 w-3.5" />,
  text: <Type className="h-3.5 w-3.5" />,
  heading: <Heading className="h-3.5 w-3.5" />,
  image: <Image className="h-3.5 w-3.5" />,
  link: <Link2 className="h-3.5 w-3.5" />,
  divider: <Minus className="h-3.5 w-3.5" />,
  container: <Square className="h-3.5 w-3.5" />,
};

export function HtmlContextPanel({ selectedElement, onUpdate }: HtmlContextPanelProps) {
  if (!selectedElement) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <MousePointer className="h-7 w-7 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-sm mb-1">Nenhum elemento selecionado</h3>
        <p className="text-xs text-muted-foreground max-w-[240px]">
          Clica em qualquer elemento no email para editá-lo. Textos, imagens, botões e links são editáveis.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-0 h-full">
      {/* Header */}
      <div className="p-4 border-b shrink-0">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn("text-xs gap-1", ELEMENT_TYPE_COLORS[selectedElement.type])}>
            {TYPE_ICONS[selectedElement.type]}
            {ELEMENT_TYPE_LABELS[selectedElement.type]}
          </Badge>
          <span className="text-xs text-muted-foreground font-mono">
            &lt;{selectedElement.tagName}&gt;
          </span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="editar" className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-4 pt-1 h-auto shrink-0">
          <TabsTrigger value="editar" className="text-xs data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-2">
            Editar
          </TabsTrigger>
          <TabsTrigger value="estilo" className="text-xs data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-2">
            Estilo
          </TabsTrigger>
          <TabsTrigger value="html" className="text-xs data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-2">
            HTML
          </TabsTrigger>
        </TabsList>

        <TabsContent value="editar" className="flex-1 overflow-y-auto p-4 space-y-4 mt-0">
          {selectedElement.type === 'cta' && <CTAEditor element={selectedElement} onUpdate={onUpdate} />}
          {(selectedElement.type === 'text' || selectedElement.type === 'heading') && <TextEditor element={selectedElement} onUpdate={onUpdate} />}
          {selectedElement.type === 'image' && <ImageEditor element={selectedElement} onUpdate={onUpdate} />}
          {selectedElement.type === 'link' && <LinkEditor element={selectedElement} onUpdate={onUpdate} />}
          {selectedElement.type === 'divider' && <DividerEditor element={selectedElement} onUpdate={onUpdate} />}
          {selectedElement.type === 'container' && <ContainerEditor element={selectedElement} onUpdate={onUpdate} />}
        </TabsContent>

        <TabsContent value="estilo" className="flex-1 overflow-y-auto p-4 mt-0">
          <StyleEditor element={selectedElement} onUpdate={onUpdate} />
        </TabsContent>

        <TabsContent value="html" className="flex-1 overflow-y-auto p-4 mt-0">
          <HtmlRawEditor element={selectedElement} onUpdate={onUpdate} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Style Editor (Tab 2) ─────────────────────
function StyleEditor({ element, onUpdate }: { element: EditableElement; onUpdate: (u: ElementUpdate) => void }) {
  const [marginTop, setMarginTop] = useState('');
  const [marginRight, setMarginRight] = useState('');
  const [marginBottom, setMarginBottom] = useState('');
  const [marginLeft, setMarginLeft] = useState('');
  const [paddingTop, setPaddingTop] = useState('');
  const [paddingRight, setPaddingRight] = useState('');
  const [paddingBottom, setPaddingBottom] = useState('');
  const [paddingLeft, setPaddingLeft] = useState('');
  const [display, setDisplay] = useState('');
  const [width, setWidth] = useState('');
  const [maxWidth, setMaxWidth] = useState('');
  const [linkedMargin, setLinkedMargin] = useState(true);
  const [linkedPadding, setLinkedPadding] = useState(true);

  useEffect(() => {
    const m = (element.styles.margin || '0px').split(' ');
    setMarginTop(m[0] || '0px');
    setMarginRight(m[1] || m[0] || '0px');
    setMarginBottom(m[2] || m[0] || '0px');
    setMarginLeft(m[3] || m[1] || m[0] || '0px');

    const p = (element.styles.padding || '0px').split(' ');
    setPaddingTop(p[0] || '0px');
    setPaddingRight(p[1] || p[0] || '0px');
    setPaddingBottom(p[2] || p[0] || '0px');
    setPaddingLeft(p[3] || p[1] || p[0] || '0px');

    setDisplay(element.styles.display || 'block');
    setWidth(element.styles.width || 'auto');
    setMaxWidth(element.styles.maxWidth || 'none');
  }, [element.id]);

  const updateMargin = (side: string, val: string) => {
    const newVals = { top: marginTop, right: marginRight, bottom: marginBottom, left: marginLeft, [side]: val };
    if (linkedMargin) {
      Object.keys(newVals).forEach(k => newVals[k] = val);
      setMarginTop(val); setMarginRight(val); setMarginBottom(val); setMarginLeft(val);
    } else {
      if (side === 'top') setMarginTop(val);
      if (side === 'right') setMarginRight(val);
      if (side === 'bottom') setMarginBottom(val);
      if (side === 'left') setMarginLeft(val);
    }
    onUpdate({ id: element.id, property: 'margin', value: `${newVals.top} ${newVals.right} ${newVals.bottom} ${newVals.left}` });
  };

  const updatePadding = (side: string, val: string) => {
    const newVals = { top: paddingTop, right: paddingRight, bottom: paddingBottom, left: paddingLeft, [side]: val };
    if (linkedPadding) {
      Object.keys(newVals).forEach(k => newVals[k] = val);
      setPaddingTop(val); setPaddingRight(val); setPaddingBottom(val); setPaddingLeft(val);
    } else {
      if (side === 'top') setPaddingTop(val);
      if (side === 'right') setPaddingRight(val);
      if (side === 'bottom') setPaddingBottom(val);
      if (side === 'left') setPaddingLeft(val);
    }
    onUpdate({ id: element.id, property: 'padding', value: `${newVals.top} ${newVals.right} ${newVals.bottom} ${newVals.left}` });
  };

  const handleCopyStyles = () => {
    const styles = JSON.stringify(element.styles);
    navigator.clipboard.writeText(styles);
    toast.success('Estilos copiados');
  };

  const handlePasteStyles = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const styles = JSON.parse(text);
      Object.entries(styles).forEach(([prop, val]) => {
        onUpdate({ id: element.id, property: prop, value: val as string });
      });
      toast.success('Estilos aplicados');
    } catch {
      toast.error('Não foi possível colar estilos');
    }
  };

  return (
    <div className="space-y-5">
      {/* Margin */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">Margin</Label>
          <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => setLinkedMargin(!linkedMargin)}>
            {linkedMargin ? '🔗 Ligado' : 'Independente'}
          </Button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[['top', marginTop], ['right', marginRight], ['bottom', marginBottom], ['left', marginLeft]].map(([side, val]) => (
            <div key={side} className="space-y-1">
              <span className="text-[10px] text-muted-foreground capitalize">{side}</span>
              <Input value={val} onChange={(e) => updateMargin(side, e.target.value)} className="h-8 text-xs" />
            </div>
          ))}
        </div>
      </div>

      {/* Padding */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">Padding</Label>
          <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => setLinkedPadding(!linkedPadding)}>
            {linkedPadding ? '🔗 Ligado' : 'Independente'}
          </Button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[['top', paddingTop], ['right', paddingRight], ['bottom', paddingBottom], ['left', paddingLeft]].map(([side, val]) => (
            <div key={side} className="space-y-1">
              <span className="text-[10px] text-muted-foreground capitalize">{side}</span>
              <Input value={val} onChange={(e) => updatePadding(side, e.target.value)} className="h-8 text-xs" />
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Display */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Display</Label>
        <Select value={display} onValueChange={(v) => { setDisplay(v); onUpdate({ id: element.id, property: 'display', value: v }); }}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="block">Block</SelectItem>
            <SelectItem value="inline">Inline</SelectItem>
            <SelectItem value="inline-block">Inline-block</SelectItem>
            <SelectItem value="none">Oculto (none)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Width / Max-width */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs font-medium">Width</Label>
          <Input value={width} onChange={(e) => { setWidth(e.target.value); onUpdate({ id: element.id, property: 'width', value: e.target.value }); }} className="h-9 text-xs" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium">Max-width</Label>
          <Input value={maxWidth} onChange={(e) => { setMaxWidth(e.target.value); onUpdate({ id: element.id, property: 'maxWidth', value: e.target.value }); }} className="h-9 text-xs" />
        </div>
      </div>

      <Separator />

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 h-8 text-xs gap-1.5" onClick={handleCopyStyles}>
          <Copy className="h-3 w-3" /> Copiar
        </Button>
        <Button variant="outline" size="sm" className="flex-1 h-8 text-xs gap-1.5" onClick={handlePasteStyles}>
          <ClipboardPaste className="h-3 w-3" /> Colar
        </Button>
      </div>
    </div>
  );
}

// ── HTML Raw Editor (Tab 3) ──────────────────
function HtmlRawEditor({ element, onUpdate }: { element: EditableElement; onUpdate: (u: ElementUpdate) => void }) {
  const [rawHtml, setRawHtml] = useState(element.outerHtml || '');

  useEffect(() => {
    setRawHtml(element.outerHtml || '');
  }, [element.id, element.outerHtml]);

  const handleApply = () => {
    onUpdate({ id: element.id, property: 'outerHTML', value: rawHtml });
    toast.success('HTML aplicado');
  };

  const handleFormat = () => {
    try {
      // Simple HTML formatting
      let formatted = rawHtml;
      formatted = formatted.replace(/></g, '>\n<');
      formatted = formatted.replace(/\n\s*\n/g, '\n');
      // Basic indentation
      let indent = 0;
      formatted = formatted.split('\n').map(line => {
        line = line.trim();
        if (line.startsWith('</')) indent = Math.max(0, indent - 1);
        const result = '  '.repeat(indent) + line;
        if (line.startsWith('<') && !line.startsWith('</') && !line.endsWith('/>') && !line.includes('</')) indent++;
        return result;
      }).join('\n');
      setRawHtml(formatted);
    } catch {
      // ignore formatting errors
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium">Código HTML</Label>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleFormat}>
          Formatar
        </Button>
      </div>

      <div className="rounded-md border bg-muted/30 overflow-hidden">
        <Textarea
          value={rawHtml}
          onChange={(e) => setRawHtml(e.target.value)}
          className="font-mono text-xs border-0 bg-transparent resize-none focus-visible:ring-0 min-h-[300px]"
          spellCheck={false}
        />
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-3">
        <p className="text-[11px] text-amber-700 dark:text-amber-400">
          ⚠️ Alterações diretas no HTML podem quebrar a estrutura do email. Use com cuidado.
        </p>
      </div>

      <Button onClick={handleApply} size="sm" className="w-full h-9">
        Aplicar alterações
      </Button>
    </div>
  );
}

// ── CTA Editor ──────────────────────────────
function CTAEditor({ element, onUpdate }: { element: EditableElement; onUpdate: (u: ElementUpdate) => void }) {
  const [text, setText] = useState(element.content?.replace(/<[^>]*>/g, '') || '');
  const [href, setHref] = useState(element.attributes.href || '');
  const [bgColor, setBgColor] = useState(element.styles.backgroundColor || '#3b82f6');
  const [textColor, setTextColor] = useState(element.styles.color || '#ffffff');
  const [borderRadius, setBorderRadius] = useState(element.styles.borderRadius || '4px');

  useEffect(() => {
    setText(element.content?.replace(/<[^>]*>/g, '') || '');
    setHref(element.attributes.href || '');
    setBgColor(element.styles.backgroundColor || '#3b82f6');
    setTextColor(element.styles.color || '#ffffff');
    setBorderRadius(element.styles.borderRadius || '4px');
  }, [element.id]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs font-medium">Texto do botão</Label>
        <Input value={text} onChange={(e) => { setText(e.target.value); onUpdate({ id: element.id, property: 'textContent', value: e.target.value }); }} className="h-9" />
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-medium">URL de destino</Label>
        <Input value={href} onChange={(e) => { setHref(e.target.value); onUpdate({ id: element.id, property: 'href', value: e.target.value }); }} placeholder="https://..." className="h-9" />
      </div>
      <Separator />
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs font-medium">Cor de fundo</Label>
          <div className="flex gap-2">
            <input type="color" value={bgColor} onChange={(e) => { setBgColor(e.target.value); onUpdate({ id: element.id, property: 'backgroundColor', value: e.target.value }); }} className="h-9 w-9 rounded border cursor-pointer" />
            <Input value={bgColor} readOnly className="h-9 text-xs font-mono flex-1" />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium">Cor do texto</Label>
          <div className="flex gap-2">
            <input type="color" value={textColor} onChange={(e) => { setTextColor(e.target.value); onUpdate({ id: element.id, property: 'color', value: e.target.value }); }} className="h-9 w-9 rounded border cursor-pointer" />
            <Input value={textColor} readOnly className="h-9 text-xs font-mono flex-1" />
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-medium">Border radius</Label>
        <Input value={borderRadius} onChange={(e) => { setBorderRadius(e.target.value); onUpdate({ id: element.id, property: 'borderRadius', value: e.target.value }); }} placeholder="4px" className="h-9" />
      </div>
    </div>
  );
}

// ── Text / Heading Editor ──────────────────
function TextEditor({ element, onUpdate }: { element: EditableElement; onUpdate: (u: ElementUpdate) => void }) {
  const plainText = element.content?.replace(/<[^>]*>/g, '') || '';
  const [text, setText] = useState(plainText);
  const [fontSize, setFontSize] = useState(element.styles.fontSize || '16px');
  const [color, setColor] = useState(element.styles.color || '#000000');
  const [fontFamily, setFontFamily] = useState(element.styles.fontFamily || 'Arial, Helvetica, sans-serif');
  const [textAlign, setTextAlign] = useState(element.styles.textAlign || 'left');
  const [fontWeight, setFontWeight] = useState(element.styles.fontWeight || '400');

  useEffect(() => {
    setText(element.content?.replace(/<[^>]*>/g, '') || '');
    setFontSize(element.styles.fontSize || '16px');
    setColor(element.styles.color || '#000000');
    setFontFamily(element.styles.fontFamily || 'Arial, Helvetica, sans-serif');
    setTextAlign(element.styles.textAlign || 'left');
    setFontWeight(element.styles.fontWeight || '400');
  }, [element.id]);

  const handleInsertTag = (tag: string) => {
    const newText = text + tag;
    setText(newText);
    onUpdate({ id: element.id, property: 'textContent', value: newText });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs font-medium">Conteúdo</Label>
        <Textarea value={text} onChange={(e) => { setText(e.target.value); onUpdate({ id: element.id, property: 'textContent', value: e.target.value }); }} rows={4} className="text-sm resize-none" />
      </div>

      <MergeTagsBar onInsert={handleInsertTag} />

      <Separator />
      <div className="flex gap-1">
        {['bold', 'normal'].map((w) => (
          <Button key={w} variant={fontWeight === (w === 'bold' ? '700' : '400') ? 'secondary' : 'ghost'} size="sm" className="h-8 w-8 p-0" onClick={() => { const nw = w === 'bold' ? '700' : '400'; setFontWeight(nw); onUpdate({ id: element.id, property: 'fontWeight', value: nw }); }}>
            <span className={cn("text-xs", w === 'bold' && "font-bold")}>{w === 'bold' ? 'B' : 'N'}</span>
          </Button>
        ))}
        <div className="w-px bg-border mx-1" />
        {(['left', 'center', 'right'] as const).map((align) => (
          <Button key={align} variant={textAlign === align ? 'secondary' : 'ghost'} size="sm" className="h-8 w-8 p-0" onClick={() => { setTextAlign(align); onUpdate({ id: element.id, property: 'textAlign', value: align }); }}>
            <span className="text-[10px]">{align === 'left' ? '⫷' : align === 'center' ? '☰' : '⫸'}</span>
          </Button>
        ))}
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-medium">Fonte</Label>
        <Select value={fontFamily} onValueChange={(v) => { setFontFamily(v); onUpdate({ id: element.id, property: 'fontFamily', value: v }); }}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {EMAIL_SAFE_FONTS.map((f) => (<SelectItem key={f} value={f} style={{ fontFamily: f }}>{f.split(',')[0]}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs font-medium">Tamanho</Label>
          <Input value={fontSize} onChange={(e) => { setFontSize(e.target.value); onUpdate({ id: element.id, property: 'fontSize', value: e.target.value }); }} className="h-9" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium">Cor</Label>
          <div className="flex gap-2">
            <input type="color" value={color.startsWith('rgb') ? '#000000' : color} onChange={(e) => { setColor(e.target.value); onUpdate({ id: element.id, property: 'color', value: e.target.value }); }} className="h-9 w-9 rounded border cursor-pointer" />
            <Input value={color} readOnly className="h-9 text-xs font-mono flex-1" />
          </div>
        </div>
      </div>

      <Separator />

      <AIRewritePanel
        currentText={text}
        onApply={(newText) => {
          setText(newText);
          onUpdate({ id: element.id, property: 'textContent', value: newText });
        }}
      />
    </div>
  );
}

// ── Image Editor ────────────────────────────
function ImageEditor({ element, onUpdate }: { element: EditableElement; onUpdate: (u: ElementUpdate) => void }) {
  const [src, setSrc] = useState(element.attributes.src || '');
  const [alt, setAlt] = useState(element.attributes.alt || '');
  const [width, setWidth] = useState(element.attributes.width || element.styles.width || 'auto');
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    setSrc(element.attributes.src || '');
    setAlt(element.attributes.alt || '');
    setWidth(element.attributes.width || element.styles.width || 'auto');
  }, [element.id]);

  const handleImageSelect = (url: string) => {
    setSrc(url);
    onUpdate({ id: element.id, property: 'src', value: url });
  };

  return (
    <div className="space-y-4">
      {src && (
        <div className="rounded-lg border overflow-hidden bg-muted">
          <img src={src} alt={alt} className="w-full h-auto max-h-40 object-contain" />
        </div>
      )}

      <Button
        variant="outline"
        size="sm"
        className="w-full h-9 text-xs gap-1.5"
        onClick={() => setShowUpload(true)}
      >
        <Upload className="h-3 w-3" />
        Substituir imagem
      </Button>

      <ImageUploadDialog
        open={showUpload}
        onClose={() => setShowUpload(false)}
        onSelect={handleImageSelect}
      />

      <div className="space-y-2">
        <Label className="text-xs font-medium">URL da imagem</Label>
        <Input value={src} onChange={(e) => { setSrc(e.target.value); onUpdate({ id: element.id, property: 'src', value: e.target.value }); }} placeholder="https://..." className="h-9 text-xs" />
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-medium">Texto alternativo</Label>
        <Input value={alt} onChange={(e) => { setAlt(e.target.value); onUpdate({ id: element.id, property: 'alt', value: e.target.value }); }} placeholder="Descrição da imagem" className="h-9" />
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-medium">Largura</Label>
        <Input value={width} onChange={(e) => { setWidth(e.target.value); onUpdate({ id: element.id, property: 'width', value: e.target.value }); }} placeholder="100% ou 300px" className="h-9" />
      </div>
    </div>
  );
}

// ── Link Editor ─────────────────────────────
function LinkEditor({ element, onUpdate }: { element: EditableElement; onUpdate: (u: ElementUpdate) => void }) {
  const [text, setText] = useState(element.content?.replace(/<[^>]*>/g, '') || '');
  const [href, setHref] = useState(element.attributes.href || '');
  const [color, setColor] = useState(element.styles.color || '#3b82f6');

  useEffect(() => {
    setText(element.content?.replace(/<[^>]*>/g, '') || '');
    setHref(element.attributes.href || '');
    setColor(element.styles.color || '#3b82f6');
  }, [element.id]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs font-medium">Texto do link</Label>
        <Input value={text} onChange={(e) => { setText(e.target.value); onUpdate({ id: element.id, property: 'textContent', value: e.target.value }); }} className="h-9" />
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-medium">URL</Label>
        <Input value={href} onChange={(e) => { setHref(e.target.value); onUpdate({ id: element.id, property: 'href', value: e.target.value }); }} placeholder="https://..." className="h-9" />
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-medium">Cor</Label>
        <div className="flex gap-2">
          <input type="color" value={color.startsWith('rgb') ? '#3b82f6' : color} onChange={(e) => { setColor(e.target.value); onUpdate({ id: element.id, property: 'color', value: e.target.value }); }} className="h-9 w-9 rounded border cursor-pointer" />
          <Input value={color} readOnly className="h-9 text-xs font-mono flex-1" />
        </div>
      </div>
    </div>
  );
}

// ── Divider Editor ──────────────────────────
function DividerEditor({ element, onUpdate }: { element: EditableElement; onUpdate: (u: ElementUpdate) => void }) {
  const [color, setColor] = useState('#e5e7eb');
  const [width, setWidth] = useState('100%');

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs font-medium">Cor</Label>
        <div className="flex gap-2">
          <input type="color" value={color} onChange={(e) => { setColor(e.target.value); onUpdate({ id: element.id, property: 'borderColor', value: e.target.value }); }} className="h-9 w-9 rounded border cursor-pointer" />
          <Input value={color} readOnly className="h-9 text-xs font-mono flex-1" />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-medium">Largura</Label>
        <Input value={width} onChange={(e) => { setWidth(e.target.value); onUpdate({ id: element.id, property: 'width', value: e.target.value }); }} placeholder="100% ou 300px" className="h-9" />
      </div>
    </div>
  );
}

// ── Container Editor ────────────────────────
function ContainerEditor({ element, onUpdate }: { element: EditableElement; onUpdate: (u: ElementUpdate) => void }) {
  const [bgColor, setBgColor] = useState(element.styles.backgroundColor || '#ffffff');
  const [padding, setPadding] = useState(element.styles.padding || '0px');
  const [borderRadius, setBorderRadius] = useState(element.styles.borderRadius || '0px');

  useEffect(() => {
    setBgColor(element.styles.backgroundColor || '#ffffff');
    setPadding(element.styles.padding || '0px');
    setBorderRadius(element.styles.borderRadius || '0px');
  }, [element.id]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs font-medium">Cor de fundo</Label>
        <div className="flex gap-2">
          <input type="color" value={bgColor.startsWith('rgb') ? '#ffffff' : bgColor} onChange={(e) => { setBgColor(e.target.value); onUpdate({ id: element.id, property: 'backgroundColor', value: e.target.value }); }} className="h-9 w-9 rounded border cursor-pointer" />
          <Input value={bgColor} readOnly className="h-9 text-xs font-mono flex-1" />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-medium">Padding</Label>
        <Input value={padding} onChange={(e) => { setPadding(e.target.value); onUpdate({ id: element.id, property: 'padding', value: e.target.value }); }} placeholder="16px" className="h-9" />
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-medium">Border radius</Label>
        <Input value={borderRadius} onChange={(e) => { setBorderRadius(e.target.value); onUpdate({ id: element.id, property: 'borderRadius', value: e.target.value }); }} placeholder="8px" className="h-9" />
      </div>
    </div>
  );
}
