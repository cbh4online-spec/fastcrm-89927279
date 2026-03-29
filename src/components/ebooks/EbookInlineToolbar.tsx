import { useState, useRef, useEffect } from 'react';
import {
  Bold, Italic, Underline, Strikethrough, Link,
  AlignLeft, AlignCenter, AlignRight, List, ListOrdered,
  Heading1, Heading2, Type, Palette, Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface EbookInlineToolbarProps {
  position: { top: number; left: number };
  onCommand: (command: string, value?: string) => void;
  onAIRewrite?: () => void;
}

const COLORS = [
  '#000000', '#333333', '#666666', '#999999',
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899',
];

export function EbookInlineToolbar({ position, onCommand, onAIRewrite }: EbookInlineToolbarProps) {
  const [linkUrl, setLinkUrl] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [clampedPos, setClampedPos] = useState(position);

  useEffect(() => {
    const el = toolbarRef.current;
    if (!el) {
      setClampedPos({ top: Math.max(8, position.top), left: position.left });
      return;
    }
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const parent = el.offsetParent as HTMLElement | null;
    const parentW = parent?.clientWidth ?? window.innerWidth;

    const halfW = w / 2;
    const clampedLeft = Math.max(halfW + 8, Math.min(position.left, parentW - halfW - 8));
    const clampedTop = Math.max(8, position.top);

    setClampedPos({ top: clampedTop, left: clampedLeft });
  }, [position]);

  const handleLink = () => {
    if (linkUrl) {
      onCommand('createLink', linkUrl);
      setLinkUrl('');
      setShowLinkInput(false);
    }
  };

  return (
    <div
      ref={toolbarRef}
      className={cn(
        "absolute z-50 flex items-center gap-0.5 p-1 rounded-lg",
        "bg-popover border shadow-xl animate-fade-in"
      )}
      style={{
        top: clampedPos.top,
        left: clampedPos.left,
        transform: 'translateX(-50%)',
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {[
        { icon: Bold, cmd: 'bold', title: 'Negrito' },
        { icon: Italic, cmd: 'italic', title: 'Itálico' },
        { icon: Underline, cmd: 'underline', title: 'Sublinhado' },
        { icon: Strikethrough, cmd: 'strikeThrough', title: 'Riscado' },
      ].map(({ icon: Icon, cmd, title }) => (
        <Button key={cmd} variant="ghost" size="icon" className="h-7 w-7" onClick={() => onCommand(cmd)} title={title}>
          <Icon className="h-3.5 w-3.5" />
        </Button>
      ))}

      <div className="w-px h-5 bg-border mx-0.5" />

      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onCommand('formatBlock', 'h1')} title="Título 1">
        <Heading1 className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onCommand('formatBlock', 'h2')} title="Título 2">
        <Heading2 className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onCommand('formatBlock', 'p')} title="Parágrafo">
        <Type className="h-3.5 w-3.5" />
      </Button>

      <div className="w-px h-5 bg-border mx-0.5" />

      {[
        { icon: AlignLeft, cmd: 'justifyLeft' },
        { icon: AlignCenter, cmd: 'justifyCenter' },
        { icon: AlignRight, cmd: 'justifyRight' },
      ].map(({ icon: Icon, cmd }) => (
        <Button key={cmd} variant="ghost" size="icon" className="h-7 w-7" onClick={() => onCommand(cmd)}>
          <Icon className="h-3.5 w-3.5" />
        </Button>
      ))}

      <div className="w-px h-5 bg-border mx-0.5" />

      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onCommand('insertUnorderedList')}>
        <List className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onCommand('insertOrderedList')}>
        <ListOrdered className="h-3.5 w-3.5" />
      </Button>

      <div className="w-px h-5 bg-border mx-0.5" />

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Cor do texto">
            <Palette className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" side="top">
          <div className="grid grid-cols-4 gap-1">
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
            <Button size="sm" className="h-8" onClick={handleLink}>OK</Button>
          </div>
        </PopoverContent>
      </Popover>

      {onAIRewrite && (
        <>
          <div className="w-px h-5 bg-border mx-0.5" />
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1 text-primary hover:text-primary"
            onClick={onAIRewrite}
            title="Reescrever com IA"
          >
            <Sparkles className="h-3 w-3" /> IA
          </Button>
        </>
      )}
    </div>
  );
}
