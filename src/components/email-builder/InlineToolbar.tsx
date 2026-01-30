import { useState } from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough,
  Link,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Type,
  Palette,
  Variable,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { DYNAMIC_VARIABLES } from '@/types/emailBuilder';

interface InlineToolbarProps {
  position: { top: number; left: number };
  onCommand: (command: string, value?: string) => void;
  onInsertVariable: (variable: string) => void;
}

const COLORS = [
  '#000000', '#333333', '#666666', '#999999',
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
];

export function InlineToolbar({ position, onCommand, onInsertVariable }: InlineToolbarProps) {
  const [linkUrl, setLinkUrl] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);

  const handleLink = () => {
    if (linkUrl) {
      onCommand('createLink', linkUrl);
      setLinkUrl('');
      setShowLinkInput(false);
    }
  };

  const toolbarButtons = [
    { icon: Bold, command: 'bold', title: 'Negrito (Ctrl+B)' },
    { icon: Italic, command: 'italic', title: 'Itálico (Ctrl+I)' },
    { icon: Underline, command: 'underline', title: 'Sublinhado (Ctrl+U)' },
    { icon: Strikethrough, command: 'strikeThrough', title: 'Riscado' },
  ];

  const alignButtons = [
    { icon: AlignLeft, command: 'justifyLeft', title: 'Alinhar à esquerda' },
    { icon: AlignCenter, command: 'justifyCenter', title: 'Centrar' },
    { icon: AlignRight, command: 'justifyRight', title: 'Alinhar à direita' },
  ];

  return (
    <div
      className={cn(
        "absolute z-50 flex items-center gap-0.5 p-1 rounded-lg",
        "bg-popover border shadow-lg animate-fade-in"
      )}
      style={{
        top: position.top,
        left: position.left,
        transform: 'translateX(-50%)',
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {/* Format buttons */}
      {toolbarButtons.map(({ icon: Icon, command, title }) => (
        <Button
          key={command}
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onCommand(command)}
          title={title}
        >
          <Icon className="h-3.5 w-3.5" />
        </Button>
      ))}

      <div className="w-px h-5 bg-border mx-1" />

      {/* Headings */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => onCommand('formatBlock', 'h1')}
        title="Título 1"
      >
        <Heading1 className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => onCommand('formatBlock', 'h2')}
        title="Título 2"
      >
        <Heading2 className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => onCommand('formatBlock', 'p')}
        title="Parágrafo"
      >
        <Type className="h-3.5 w-3.5" />
      </Button>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Alignment */}
      {alignButtons.map(({ icon: Icon, command, title }) => (
        <Button
          key={command}
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onCommand(command)}
          title={title}
        >
          <Icon className="h-3.5 w-3.5" />
        </Button>
      ))}

      <div className="w-px h-5 bg-border mx-1" />

      {/* Lists */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => onCommand('insertUnorderedList')}
        title="Lista"
      >
        <List className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => onCommand('insertOrderedList')}
        title="Lista numerada"
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </Button>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Color picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Cor do texto">
            <Palette className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" side="top">
          <div className="grid grid-cols-5 gap-1">
            {COLORS.map((color) => (
              <button
                key={color}
                className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
                onClick={() => onCommand('foreColor', color)}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Link */}
      <Popover open={showLinkInput} onOpenChange={setShowLinkInput}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Inserir link">
            <Link className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-2" side="top">
          <div className="flex gap-2">
            <Input
              placeholder="https://..."
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="h-8 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleLink()}
            />
            <Button size="sm" className="h-8" onClick={handleLink}>
              OK
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Variables */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Inserir variável">
            <Variable className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" side="top">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground mb-2">Variáveis</p>
            {DYNAMIC_VARIABLES.slice(0, 6).map((variable) => (
              <button
                key={variable.key}
                className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent flex items-center justify-between"
                onClick={() => onInsertVariable(variable.key)}
              >
                <span>{variable.label}</span>
                <span className="text-xs text-muted-foreground">{variable.key}</span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
