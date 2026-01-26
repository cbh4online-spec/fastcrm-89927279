import { useState } from "react";
import { Brain, Plus, Trash2, Check, X, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAgentMemory } from "@/hooks/useAgentMemory";
import { MemoryInsightCard } from "./MemoryInsightCard";
import type { MemoryType, MemoryCategory } from "@/types/agentMemory";
import { getMemoryTypeLabel } from "@/types/agentMemory";

interface EntityMemoryPanelProps {
  entityId: string;
  entityType: string;
  entityName?: string;
  compact?: boolean;
}

export function EntityMemoryPanel({ 
  entityId, 
  entityType, 
  entityName,
  compact = false 
}: EntityMemoryPanelProps) {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMemoryContent, setNewMemoryContent] = useState("");
  const [newMemoryType, setNewMemoryType] = useState<MemoryType>("fact");
  const [newMemoryCategory, setNewMemoryCategory] = useState<MemoryCategory>("general");

  const {
    memories,
    isLoading,
    isStoring,
    isConsolidating,
    storeMemory,
    validateMemory,
    deleteMemory,
    consolidateMemories,
    memoryCount,
    validatedCount,
    averageRelevance
  } = useAgentMemory(entityId, entityType);

  const handleAddMemory = async () => {
    if (!newMemoryContent.trim()) return;

    await storeMemory(newMemoryType, newMemoryContent.trim(), 0.8, newMemoryCategory);
    setNewMemoryContent("");
    setShowAddForm(false);
  };

  const memoryTypes: MemoryType[] = ['fact', 'preference', 'pattern', 'objection', 'risk', 'important_signal'];
  const categories: MemoryCategory[] = ['general', 'contact_preference', 'decision_criteria', 'price_sensitivity', 'competitive', 'product_interest'];

  if (compact) {
    return (
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm">Memória IA</CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {memoryCount}
                  </Badge>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <MemoryPanelContent
                memories={memories}
                isLoading={isLoading}
                showAddForm={showAddForm}
                setShowAddForm={setShowAddForm}
                newMemoryContent={newMemoryContent}
                setNewMemoryContent={setNewMemoryContent}
                newMemoryType={newMemoryType}
                setNewMemoryType={setNewMemoryType}
                newMemoryCategory={newMemoryCategory}
                setNewMemoryCategory={setNewMemoryCategory}
                memoryTypes={memoryTypes}
                categories={categories}
                handleAddMemory={handleAddMemory}
                isStoring={isStoring}
                validateMemory={validateMemory}
                deleteMemory={deleteMemory}
                consolidateMemories={consolidateMemories}
                isConsolidating={isConsolidating}
              />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base">Memória do Agente IA</CardTitle>
              <CardDescription>
                {entityName ? `Memórias sobre ${entityName}` : 'Factos e insights guardados'}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {memoryCount} memórias
            </Badge>
            {validatedCount > 0 && (
              <Badge variant="secondary">
                {validatedCount} validadas
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <MemoryPanelContent
          memories={memories}
          isLoading={isLoading}
          showAddForm={showAddForm}
          setShowAddForm={setShowAddForm}
          newMemoryContent={newMemoryContent}
          setNewMemoryContent={setNewMemoryContent}
          newMemoryType={newMemoryType}
          setNewMemoryType={setNewMemoryType}
          newMemoryCategory={newMemoryCategory}
          setNewMemoryCategory={setNewMemoryCategory}
          memoryTypes={memoryTypes}
          categories={categories}
          handleAddMemory={handleAddMemory}
          isStoring={isStoring}
          validateMemory={validateMemory}
          deleteMemory={deleteMemory}
          consolidateMemories={consolidateMemories}
          isConsolidating={isConsolidating}
        />
      </CardContent>
    </Card>
  );
}

// Extracted content component to avoid repetition
interface MemoryPanelContentProps {
  memories: any[];
  isLoading: boolean;
  showAddForm: boolean;
  setShowAddForm: (show: boolean) => void;
  newMemoryContent: string;
  setNewMemoryContent: (content: string) => void;
  newMemoryType: MemoryType;
  setNewMemoryType: (type: MemoryType) => void;
  newMemoryCategory: MemoryCategory;
  setNewMemoryCategory: (category: MemoryCategory) => void;
  memoryTypes: MemoryType[];
  categories: MemoryCategory[];
  handleAddMemory: () => void;
  isStoring: boolean;
  validateMemory: (id: string, valid: boolean) => void;
  deleteMemory: (id: string) => void;
  consolidateMemories: () => void;
  isConsolidating: boolean;
}

function MemoryPanelContent({
  memories,
  isLoading,
  showAddForm,
  setShowAddForm,
  newMemoryContent,
  setNewMemoryContent,
  newMemoryType,
  setNewMemoryType,
  newMemoryCategory,
  setNewMemoryCategory,
  memoryTypes,
  categories,
  handleAddMemory,
  isStoring,
  validateMemory,
  deleteMemory,
  consolidateMemories,
  isConsolidating
}: MemoryPanelContentProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
        A carregar memórias...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Adicionar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => consolidateMemories()}
          disabled={isConsolidating}
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${isConsolidating ? 'animate-spin' : ''}`} />
          Consolidar
        </Button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
          <div className="flex gap-2">
            <Select value={newMemoryType} onValueChange={(v) => setNewMemoryType(v as MemoryType)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                {memoryTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {getMemoryTypeLabel(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={newMemoryCategory} onValueChange={(v) => setNewMemoryCategory(v as MemoryCategory)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {cat.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Textarea
            value={newMemoryContent}
            onChange={(e) => setNewMemoryContent(e.target.value)}
            placeholder="Descreva o facto ou insight a guardar..."
            className="min-h-[80px]"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
              Cancelar
            </Button>
            <Button 
              size="sm" 
              onClick={handleAddMemory}
              disabled={!newMemoryContent.trim() || isStoring}
            >
              {isStoring ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                  A guardar...
                </>
              ) : (
                'Guardar'
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Memory list */}
      {memories.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Sem memórias guardadas</p>
          <p className="text-sm">O agente IA irá guardar insights automaticamente.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {memories.map(memory => (
            <MemoryInsightCard
              key={memory.id}
              memory={memory}
              onValidate={(isValid) => validateMemory(memory.id, isValid)}
              onDelete={() => deleteMemory(memory.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
