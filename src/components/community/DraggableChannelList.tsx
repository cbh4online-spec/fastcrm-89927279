import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { ForumCategory } from "@/hooks/useForum";
import { useReorderForumCategories } from "@/hooks/useForumMutations";
import { ChannelData } from "./AddChannelDialog";

interface DraggableChannelListProps {
  categories: ForumCategory[];
  workspaceId: string | undefined;
  isAdmin: boolean;
  selectedCategory?: string;
  onSelectCategory?: (id: string | undefined) => void;
  onClickChannel?: (category: ForumCategory) => void;
  onEditChannel?: (channel: ChannelData) => void;
  onAddChannel?: () => void;
  showAllButton?: boolean;
}

export function DraggableChannelList({
  categories,
  workspaceId,
  isAdmin,
  selectedCategory,
  onSelectCategory,
  onClickChannel,
  onEditChannel,
  onAddChannel,
  showAllButton = false,
}: DraggableChannelListProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [localOrder, setLocalOrder] = useState<ForumCategory[] | null>(null);
  const dragCounterRef = useRef<Record<string, number>>({});
  const reorder = useReorderForumCategories(workspaceId);

  const displayCategories = localOrder || categories;

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };

  const handleDragEnter = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    dragCounterRef.current[id] = (dragCounterRef.current[id] || 0) + 1;
    if (id !== draggedId) setDragOverId(id);
  };

  const handleDragLeave = (id: string) => {
    dragCounterRef.current[id] = (dragCounterRef.current[id] || 0) - 1;
    if (dragCounterRef.current[id] <= 0) {
      dragCounterRef.current[id] = 0;
      if (dragOverId === id) setDragOverId(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    dragCounterRef.current = {};
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const items = [...displayCategories];
    const fromIndex = items.findIndex(c => c.id === draggedId);
    const toIndex = items.findIndex(c => c.id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;

    const [moved] = items.splice(fromIndex, 1);
    items.splice(toIndex, 0, moved);

    setLocalOrder(items);
    setDraggedId(null);
    setDragOverId(null);

    // Persist new order
    reorder.mutate(items.map(c => c.id), {
      onSettled: () => setLocalOrder(null),
    });
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
    dragCounterRef.current = {};
  };

  const toChannelData = (c: ForumCategory): ChannelData => ({
    id: c.id,
    name: c.name,
    description: c.description,
    icon: c.icon,
    color: (c as any).color || null,
    is_private: (c as any).is_private || false,
    is_read_only: (c as any).is_read_only || false,
    is_paid: (c as any).is_paid || false,
    price: (c as any).price || null,
  });

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
      {showAllButton && onSelectCategory && (
        <motion.button
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          whileHover={{ scale: 1.05, transition: { duration: 0.15 } }}
          onClick={() => onSelectCategory(undefined)}
          className={cn(
            "shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border transition-colors text-xs font-medium",
            !selectedCategory ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted/50"
          )}
        >
          Todos
        </motion.button>
      )}
      {displayCategories.map((c, i) => (
        <motion.div
          key={c.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.04, type: "spring", stiffness: 300, damping: 25 }}
          whileHover={{ scale: 1.05, transition: { duration: 0.15 } }}
          className={cn(
            "shrink-0 flex items-center gap-1 group",
            draggedId === c.id && "opacity-40",
            dragOverId === c.id && "ring-2 ring-primary rounded-full",
          )}
          draggable={isAdmin}
          onDragStart={(e: any) => handleDragStart(e, c.id)}
          onDragEnter={(e: any) => handleDragEnter(e, c.id)}
          onDragLeave={() => handleDragLeave(c.id)}
          onDragOver={(e: any) => handleDragOver(e)}
          onDrop={(e: any) => handleDrop(e, c.id)}
          onDragEnd={handleDragEnd}
        >
          {isAdmin && (
            <GripVertical className="h-3 w-3 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab shrink-0" />
          )}
          <button
            onClick={() => {
              if (onSelectCategory) onSelectCategory(c.id);
              if (onClickChannel) onClickChannel(c);
            }}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border transition-colors text-xs font-medium",
              selectedCategory === c.id ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted/50"
            )}
          >
            <span>{c.icon || "💬"}</span>
            {c.name}
          </button>
          {isAdmin && onEditChannel && (
            <button
              onClick={() => onEditChannel(toChannelData(c))}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-muted"
              title="Editar canal"
            >
              <Pencil className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
        </motion.div>
      ))}
      {isAdmin && onAddChannel && (
        <motion.button
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: displayCategories.length * 0.04, type: "spring", stiffness: 300, damping: 25 }}
          whileHover={{ scale: 1.05, transition: { duration: 0.15 } }}
          onClick={onAddChannel}
          className="shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-dashed hover:bg-muted/50 transition-colors text-xs font-medium text-muted-foreground"
        >
          <Plus className="h-3 w-3" /> Canal
        </motion.button>
      )}
    </div>
  );
}
