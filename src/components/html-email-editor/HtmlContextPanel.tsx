import { useState, useEffect } from 'react';
import { MousePointer, Type, Heading, Image, Link2, Minus, Square, PaintBucket } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
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
    <div className="flex flex-col min-h-0">
      {/* Header */}
      <div className="p-4 border-b">
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

      {/* Content based on type */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {selectedElement.type === 'cta' && (
          <CTAEditor element={selectedElement} onUpdate={onUpdate} />
        )}
        {(selectedElement.type === 'text' || selectedElement.type === 'heading') && (
          <TextEditor element={selectedElement} onUpdate={onUpdate} />
        )}
        {selectedElement.type === 'image' && (
          <ImageEditor element={selectedElement} onUpdate={onUpdate} />
        )}
        {selectedElement.type === 'link' && (
          <LinkEditor element={selectedElement} onUpdate={onUpdate} />
        )}
        {selectedElement.type === 'divider' && (
          <DividerEditor element={selectedElement} onUpdate={onUpdate} />
        )}
        {selectedElement.type === 'container' && (
          <ContainerEditor element={selectedElement} onUpdate={onUpdate} />
        )}
      </div>
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
        <Input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            onUpdate({ id: element.id, property: 'textContent', value: e.target.value });
          }}
          className="h-9"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium">URL de destino</Label>
        <Input
          value={href}
          onChange={(e) => {
            setHref(e.target.value);
            onUpdate({ id: element.id, property: 'href', value: e.target.value });
          }}
          placeholder="https://..."
          className="h-9"
        />
      </div>

      <Separator />

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs font-medium">Cor de fundo</Label>
          <div className="flex gap-2">
            <input
              type="color"
              value={bgColor}
              onChange={(e) => {
                setBgColor(e.target.value);
                onUpdate({ id: element.id, property: 'backgroundColor', value: e.target.value });
              }}
              className="h-9 w-9 rounded border cursor-pointer"
            />
            <Input value={bgColor} readOnly className="h-9 text-xs font-mono flex-1" />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium">Cor do texto</Label>
          <div className="flex gap-2">
            <input
              type="color"
              value={textColor}
              onChange={(e) => {
                setTextColor(e.target.value);
                onUpdate({ id: element.id, property: 'color', value: e.target.value });
              }}
              className="h-9 w-9 rounded border cursor-pointer"
            />
            <Input value={textColor} readOnly className="h-9 text-xs font-mono flex-1" />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium">Border radius</Label>
        <Input
          value={borderRadius}
          onChange={(e) => {
            setBorderRadius(e.target.value);
            onUpdate({ id: element.id, property: 'borderRadius', value: e.target.value });
          }}
          placeholder="4px"
          className="h-9"
        />
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

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs font-medium">Conteúdo</Label>
        <Textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            onUpdate({ id: element.id, property: 'textContent', value: e.target.value });
          }}
          rows={4}
          className="text-sm resize-none"
        />
      </div>

      <Separator />

      {/* Formatting toolbar */}
      <div className="flex gap-1">
        {['bold', 'normal'].map((w) => (
          <Button
            key={w}
            variant={fontWeight === (w === 'bold' ? '700' : '400') ? 'secondary' : 'ghost'}
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => {
              const newWeight = w === 'bold' ? '700' : '400';
              setFontWeight(newWeight);
              onUpdate({ id: element.id, property: 'fontWeight', value: newWeight });
            }}
          >
            <span className={cn("text-xs", w === 'bold' && "font-bold")}>
              {w === 'bold' ? 'B' : 'N'}
            </span>
          </Button>
        ))}
        <div className="w-px bg-border mx-1" />
        {(['left', 'center', 'right'] as const).map((align) => (
          <Button
            key={align}
            variant={textAlign === align ? 'secondary' : 'ghost'}
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => {
              setTextAlign(align);
              onUpdate({ id: element.id, property: 'textAlign', value: align });
            }}
          >
            <span className="text-[10px]">
              {align === 'left' ? '⫷' : align === 'center' ? '☰' : '⫸'}
            </span>
          </Button>
        ))}
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium">Fonte</Label>
        <Select
          value={fontFamily}
          onValueChange={(v) => {
            setFontFamily(v);
            onUpdate({ id: element.id, property: 'fontFamily', value: v });
          }}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EMAIL_SAFE_FONTS.map((f) => (
              <SelectItem key={f} value={f} style={{ fontFamily: f }}>
                {f.split(',')[0]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs font-medium">Tamanho</Label>
          <Input
            value={fontSize}
            onChange={(e) => {
              setFontSize(e.target.value);
              onUpdate({ id: element.id, property: 'fontSize', value: e.target.value });
            }}
            className="h-9"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium">Cor</Label>
          <div className="flex gap-2">
            <input
              type="color"
              value={color.startsWith('rgb') ? '#000000' : color}
              onChange={(e) => {
                setColor(e.target.value);
                onUpdate({ id: element.id, property: 'color', value: e.target.value });
              }}
              className="h-9 w-9 rounded border cursor-pointer"
            />
            <Input value={color} readOnly className="h-9 text-xs font-mono flex-1" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Image Editor ────────────────────────────
function ImageEditor({ element, onUpdate }: { element: EditableElement; onUpdate: (u: ElementUpdate) => void }) {
  const [src, setSrc] = useState(element.attributes.src || '');
  const [alt, setAlt] = useState(element.attributes.alt || '');
  const [width, setWidth] = useState(element.attributes.width || element.styles.width || 'auto');

  useEffect(() => {
    setSrc(element.attributes.src || '');
    setAlt(element.attributes.alt || '');
    setWidth(element.attributes.width || element.styles.width || 'auto');
  }, [element.id]);

  return (
    <div className="space-y-4">
      {/* Image preview */}
      {src && (
        <div className="rounded-lg border overflow-hidden bg-muted">
          <img src={src} alt={alt} className="w-full h-auto max-h-40 object-contain" />
        </div>
      )}

      <div className="space-y-2">
        <Label className="text-xs font-medium">URL da imagem</Label>
        <Input
          value={src}
          onChange={(e) => {
            setSrc(e.target.value);
            onUpdate({ id: element.id, property: 'src', value: e.target.value });
          }}
          placeholder="https://..."
          className="h-9 text-xs"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium">Texto alternativo</Label>
        <Input
          value={alt}
          onChange={(e) => {
            setAlt(e.target.value);
            onUpdate({ id: element.id, property: 'alt', value: e.target.value });
          }}
          placeholder="Descrição da imagem"
          className="h-9"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium">Largura</Label>
        <Input
          value={width}
          onChange={(e) => {
            setWidth(e.target.value);
            onUpdate({ id: element.id, property: 'width', value: e.target.value });
          }}
          placeholder="100% ou 300px"
          className="h-9"
        />
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
        <Input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            onUpdate({ id: element.id, property: 'textContent', value: e.target.value });
          }}
          className="h-9"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-medium">URL</Label>
        <Input
          value={href}
          onChange={(e) => {
            setHref(e.target.value);
            onUpdate({ id: element.id, property: 'href', value: e.target.value });
          }}
          placeholder="https://..."
          className="h-9"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-medium">Cor</Label>
        <div className="flex gap-2">
          <input
            type="color"
            value={color.startsWith('rgb') ? '#3b82f6' : color}
            onChange={(e) => {
              setColor(e.target.value);
              onUpdate({ id: element.id, property: 'color', value: e.target.value });
            }}
            className="h-9 w-9 rounded border cursor-pointer"
          />
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
          <input
            type="color"
            value={color}
            onChange={(e) => {
              setColor(e.target.value);
              onUpdate({ id: element.id, property: 'borderColor', value: e.target.value });
            }}
            className="h-9 w-9 rounded border cursor-pointer"
          />
          <Input value={color} readOnly className="h-9 text-xs font-mono flex-1" />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-medium">Largura</Label>
        <Input
          value={width}
          onChange={(e) => {
            setWidth(e.target.value);
            onUpdate({ id: element.id, property: 'width', value: e.target.value });
          }}
          placeholder="100% ou 300px"
          className="h-9"
        />
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
          <input
            type="color"
            value={bgColor.startsWith('rgb') ? '#ffffff' : bgColor}
            onChange={(e) => {
              setBgColor(e.target.value);
              onUpdate({ id: element.id, property: 'backgroundColor', value: e.target.value });
            }}
            className="h-9 w-9 rounded border cursor-pointer"
          />
          <Input value={bgColor} readOnly className="h-9 text-xs font-mono flex-1" />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium">Padding</Label>
        <Input
          value={padding}
          onChange={(e) => {
            setPadding(e.target.value);
            onUpdate({ id: element.id, property: 'padding', value: e.target.value });
          }}
          placeholder="16px"
          className="h-9"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium">Border radius</Label>
        <Input
          value={borderRadius}
          onChange={(e) => {
            setBorderRadius(e.target.value);
            onUpdate({ id: element.id, property: 'borderRadius', value: e.target.value });
          }}
          placeholder="8px"
          className="h-9"
        />
      </div>
    </div>
  );
}
