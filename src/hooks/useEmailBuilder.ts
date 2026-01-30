import { useState, useCallback } from 'react';
import type { 
  EmailDesign, 
  EmailBlock, 
  EmailBlockType,
  EmailGlobalStyles,
} from '@/types/emailBuilder';
import { 
  DEFAULT_GLOBAL_STYLES, 
  DEFAULT_BLOCKS,
  generateBlockId,
} from '@/types/emailBuilder';

interface UseEmailBuilderOptions {
  initialDesign?: EmailDesign;
  onChange?: (design: EmailDesign) => void;
}

export function useEmailBuilder(options: UseEmailBuilderOptions = {}) {
  const [design, setDesign] = useState<EmailDesign>(
    options.initialDesign || {
      blocks: [],
      globalStyles: { ...DEFAULT_GLOBAL_STYLES },
    }
  );
  
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [draggedBlockType, setDraggedBlockType] = useState<EmailBlockType | null>(null);

  const updateDesign = useCallback((newDesign: EmailDesign) => {
    setDesign(newDesign);
    options.onChange?.(newDesign);
  }, [options]);

  // Add a new block at the end or at a specific index
  const addBlock = useCallback((type: EmailBlockType, index?: number) => {
    const newBlock = DEFAULT_BLOCKS[type]();
    
    setDesign(prev => {
      const newBlocks = [...prev.blocks];
      if (index !== undefined && index >= 0 && index <= newBlocks.length) {
        newBlocks.splice(index, 0, newBlock);
      } else {
        newBlocks.push(newBlock);
      }
      
      const newDesign = { ...prev, blocks: newBlocks };
      options.onChange?.(newDesign);
      return newDesign;
    });
    
    setSelectedBlockId(newBlock.id);
    return newBlock.id;
  }, [options]);

  // Update a specific block
  const updateBlock = useCallback((blockId: string, updates: Partial<EmailBlock>) => {
    setDesign(prev => {
      const newBlocks = prev.blocks.map(block => 
        block.id === blockId 
          ? { ...block, ...updates }
          : block
      );
      const newDesign = { ...prev, blocks: newBlocks };
      options.onChange?.(newDesign);
      return newDesign;
    });
  }, [options]);

  // Delete a block
  const deleteBlock = useCallback((blockId: string) => {
    setDesign(prev => {
      const newBlocks = prev.blocks.filter(block => block.id !== blockId);
      const newDesign = { ...prev, blocks: newBlocks };
      options.onChange?.(newDesign);
      return newDesign;
    });
    
    if (selectedBlockId === blockId) {
      setSelectedBlockId(null);
    }
  }, [selectedBlockId, options]);

  // Move a block up or down
  const moveBlock = useCallback((blockId: string, direction: 'up' | 'down') => {
    setDesign(prev => {
      const index = prev.blocks.findIndex(b => b.id === blockId);
      if (index === -1) return prev;
      
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= prev.blocks.length) return prev;
      
      const newBlocks = [...prev.blocks];
      [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
      
      const newDesign = { ...prev, blocks: newBlocks };
      options.onChange?.(newDesign);
      return newDesign;
    });
  }, [options]);

  // Reorder blocks (for drag and drop)
  const reorderBlocks = useCallback((fromIndex: number, toIndex: number) => {
    setDesign(prev => {
      if (fromIndex === toIndex) return prev;
      if (fromIndex < 0 || fromIndex >= prev.blocks.length) return prev;
      if (toIndex < 0 || toIndex >= prev.blocks.length) return prev;
      
      const newBlocks = [...prev.blocks];
      const [removed] = newBlocks.splice(fromIndex, 1);
      newBlocks.splice(toIndex, 0, removed);
      
      const newDesign = { ...prev, blocks: newBlocks };
      options.onChange?.(newDesign);
      return newDesign;
    });
  }, [options]);

  // Duplicate a block
  const duplicateBlock = useCallback((blockId: string) => {
    setDesign(prev => {
      const index = prev.blocks.findIndex(b => b.id === blockId);
      if (index === -1) return prev;
      
      const block = prev.blocks[index];
      const newBlock: EmailBlock = {
        ...JSON.parse(JSON.stringify(block)),
        id: generateBlockId(),
      };
      
      const newBlocks = [...prev.blocks];
      newBlocks.splice(index + 1, 0, newBlock);
      
      const newDesign = { ...prev, blocks: newBlocks };
      options.onChange?.(newDesign);
      return newDesign;
    });
  }, [options]);

  // Update global styles
  const updateGlobalStyles = useCallback((updates: Partial<EmailGlobalStyles>) => {
    setDesign(prev => {
      const newDesign = {
        ...prev,
        globalStyles: { ...prev.globalStyles, ...updates },
      };
      options.onChange?.(newDesign);
      return newDesign;
    });
  }, [options]);

  // Load a predefined layout
  const loadLayout = useCallback((blocks: EmailBlock[], globalStyles?: Partial<EmailGlobalStyles>) => {
    // Deep clone the blocks to avoid mutation issues
    const clonedBlocks = JSON.parse(JSON.stringify(blocks)).map((block: EmailBlock) => ({
      ...block,
      id: generateBlockId(),
    }));
    
    const newDesign: EmailDesign = {
      blocks: clonedBlocks,
      globalStyles: globalStyles 
        ? { ...DEFAULT_GLOBAL_STYLES, ...globalStyles }
        : { ...DEFAULT_GLOBAL_STYLES },
    };
    
    setDesign(newDesign);
    setSelectedBlockId(null);
    options.onChange?.(newDesign);
  }, [options]);

  // Clear all blocks
  const clearDesign = useCallback(() => {
    const newDesign: EmailDesign = {
      blocks: [],
      globalStyles: { ...DEFAULT_GLOBAL_STYLES },
    };
    setDesign(newDesign);
    setSelectedBlockId(null);
    options.onChange?.(newDesign);
  }, [options]);

  // Get selected block
  const selectedBlock = design.blocks.find(b => b.id === selectedBlockId) || null;

  return {
    design,
    setDesign: updateDesign,
    selectedBlockId,
    setSelectedBlockId,
    selectedBlock,
    draggedBlockType,
    setDraggedBlockType,
    // Block operations
    addBlock,
    updateBlock,
    deleteBlock,
    moveBlock,
    reorderBlocks,
    duplicateBlock,
    // Global styles
    updateGlobalStyles,
    // Layout
    loadLayout,
    clearDesign,
  };
}
