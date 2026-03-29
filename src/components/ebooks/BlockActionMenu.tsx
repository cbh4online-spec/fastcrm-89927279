import {
  MoreVertical, Copy, Trash2, ArrowUp, ArrowDown, Sparkles,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface BlockActionMenuProps {
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAIRewrite?: () => void;
}

export function BlockActionMenu({
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onAIRewrite,
}: BlockActionMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <MoreVertical className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44" collisionPadding={8}>
        <DropdownMenuItem onClick={onMoveUp}>
          <ArrowUp className="h-3.5 w-3.5 mr-2" /> Mover acima
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onMoveDown}>
          <ArrowDown className="h-3.5 w-3.5 mr-2" /> Mover abaixo
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDuplicate}>
          <Copy className="h-3.5 w-3.5 mr-2" /> Duplicar
        </DropdownMenuItem>
        {onAIRewrite && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onAIRewrite}>
              <Sparkles className="h-3.5 w-3.5 mr-2 text-primary" /> Reescrever com IA
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
          <Trash2 className="h-3.5 w-3.5 mr-2" /> Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
