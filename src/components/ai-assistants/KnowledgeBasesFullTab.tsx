/**
 * Knowledge Bases Full Tab - Complete management of knowledge bases
 * Replaces the quick access tab with full CRUD functionality
 */

import { useState, useEffect, useCallback } from "react";
import { useKnowledgeBase } from "@/hooks/useKnowledgeBase";
import { KnowledgeBaseList } from "@/components/knowledge-base/KnowledgeBaseList";
import { KnowledgeEntriesPanel } from "@/components/knowledge-base/KnowledgeEntriesPanel";
import { KnowledgeSourcesPanel } from "@/components/knowledge-base/KnowledgeSourcesPanel";
import { AddSourcePanel } from "@/components/knowledge-base/AddSourcePanel";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ListChecks, Link as LinkIcon, ArrowLeft } from "lucide-react";
import { KNOWLEDGE_BASE_TYPES } from "@/types/knowledge-base";
import type { KnowledgeEntry, KnowledgeSource } from "@/types/knowledge-base";
import { toast } from "sonner";

interface KnowledgeBasesFullTabProps {
  searchValue: string;
}

export function KnowledgeBasesFullTab({ searchValue }: KnowledgeBasesFullTabProps) {
  const {
    knowledgeBases,
    isLoading,
    createKnowledgeBase,
    addSource,
    uploadDocument,
    createEntry,
    validateEntry,
    updateEntry,
    deleteEntry,
    archiveEntry,
    fetchEntries,
    fetchSources,
  } = useKnowledgeBase();

  const [selectedKB, setSelectedKB] = useState<string | null>(null);
  const [showCreateKB, setShowCreateKB] = useState(false);
  const [kbDetailTab, setKbDetailTab] = useState<'add' | 'entries' | 'sources'>('entries');
  const [isProcessing, setIsProcessing] = useState(false);

  // Knowledge base entries and sources for selected KB
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Create KB form state
  const [kbName, setKbName] = useState('');
  const [kbDescription, setKbDescription] = useState('');
  const [kbType, setKbType] = useState('general');

  // Function to load KB details
  const loadKBDetails = useCallback(async (kbId: string) => {
    try {
      const [entriesData, sourcesData] = await Promise.all([
        fetchEntries(kbId),
        fetchSources(kbId)
      ]);
      setEntries(entriesData);
      setSources(sourcesData as KnowledgeSource[]);
      return sourcesData;
    } catch (error) {
      console.error('Error loading KB details:', error);
      return [];
    }
  }, [fetchEntries, fetchSources]);

  // Load entries and sources when a KB is selected
  useEffect(() => {
    if (!selectedKB) {
      setEntries([]);
      setSources([]);
      setIsLoadingDetails(false);
      return;
    }
    
    setIsLoadingDetails(true);
    loadKBDetails(selectedKB).finally(() => setIsLoadingDetails(false));
  }, [selectedKB, loadKBDetails]);

  // Auto-refresh when there are pending/processing sources
  useEffect(() => {
    if (!selectedKB) return;
    
    const hasPending = sources.some(s => 
      s.processingStatus === 'pending' || s.processingStatus === 'processing'
    );
    
    if (!hasPending) return;

    const interval = setInterval(async () => {
      const updatedSources = await loadKBDetails(selectedKB);
      const stillPending = (updatedSources as KnowledgeSource[]).some(s => 
        s.processingStatus === 'pending' || s.processingStatus === 'processing'
      );
      
      if (!stillPending) {
        clearInterval(interval);
        toast.success('Processamento concluído!');
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedKB, sources, loadKBDetails]);

  const filteredBases = knowledgeBases.filter(kb =>
    kb.name.toLowerCase().includes(searchValue.toLowerCase()) ||
    kb.description?.toLowerCase().includes(searchValue.toLowerCase())
  );

  const handleCreateKB = async () => {
    if (!kbName.trim()) return;
    
    await createKnowledgeBase({
      name: kbName,
      description: kbDescription,
      type: kbType as any
    });

    setShowCreateKB(false);
    setKbName('');
    setKbDescription('');
    setKbType('general');
  };

  const handleAddUrl = async (url: string) => {
    if (!selectedKB) {
      toast.error('Seleciona uma base de conhecimento primeiro');
      return;
    }
    setIsProcessing(true);
    await addSource(selectedKB, 'url', { url });
    await loadKBDetails(selectedKB);
    setIsProcessing(false);
  };

  const handleAddManual = async (data: { title: string; question?: string; content: string }) => {
    if (!selectedKB) {
      toast.error('Seleciona uma base de conhecimento primeiro');
      return;
    }
    setIsProcessing(true);
    await createEntry(selectedKB, {
      title: data.title,
      question: data.question,
      content: data.content,
      entryType: data.question ? 'faq' : 'article'
    });
    await loadKBDetails(selectedKB);
    setIsProcessing(false);
  };

  const handleAddDocument = async (file: File) => {
    if (!selectedKB) {
      toast.error('Seleciona uma base de conhecimento primeiro');
      return;
    }
    setIsProcessing(true);
    await uploadDocument(selectedKB, file);
    await loadKBDetails(selectedKB);
    setIsProcessing(false);
  };

  return (
    <div className="space-y-4">
      {/* Knowledge Bases List - visible when no KB selected */}
      <div className={`${selectedKB ? 'hidden md:block' : ''}`}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            Gestão completa das bases de conhecimento que alimentam os agentes IA.
          </p>
          <Button size="sm" onClick={() => setShowCreateKB(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Nova Base
          </Button>
        </div>
        <KnowledgeBaseList 
          knowledgeBases={filteredBases}
          isLoading={isLoading}
          selectedId={selectedKB}
          onSelect={(kb) => {
            setSelectedKB(kb.id);
            setKbDetailTab('entries');
          }}
          onCreateNew={() => setShowCreateKB(true)}
        />
      </div>

      {/* KB Details Panel */}
      {selectedKB && (
        <div className="space-y-4">
          {/* Back button for mobile */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="md:hidden mb-2"
            onClick={() => setSelectedKB(null)}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar às Bases
          </Button>

          {/* Sub-tabs for KB details */}
          <Tabs value={kbDetailTab} onValueChange={(v) => setKbDetailTab(v as any)}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="entries" className="flex items-center gap-1 text-xs sm:text-sm px-2">
                <ListChecks className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Entradas</span> ({entries.length})
              </TabsTrigger>
              <TabsTrigger value="sources" className="flex items-center gap-1 text-xs sm:text-sm px-2">
                <LinkIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Fontes</span> ({sources.length})
              </TabsTrigger>
              <TabsTrigger value="add" className="flex items-center gap-1 text-xs sm:text-sm px-2">
                <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Adicionar</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="entries" className="mt-4">
              <KnowledgeEntriesPanel
                entries={entries}
                isLoading={isLoadingDetails}
                knowledgeBaseId={selectedKB}
                onValidate={(id) => validateEntry(id)}
                onArchive={(id) => archiveEntry(id)}
                onDelete={(id) => deleteEntry(id)}
                onUpdate={(id, data) => updateEntry(id, data)}
              />
            </TabsContent>

            <TabsContent value="sources" className="mt-4">
              <KnowledgeSourcesPanel
                sources={sources}
                isLoading={isLoadingDetails}
              />
            </TabsContent>

            <TabsContent value="add" className="mt-4">
              <AddSourcePanel
                onAddUrl={handleAddUrl}
                onAddManual={handleAddManual}
                onAddDocument={handleAddDocument}
                isProcessing={isProcessing}
              />
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Create KB Dialog */}
      <Dialog open={showCreateKB} onOpenChange={setShowCreateKB}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Base de Conhecimento</DialogTitle>
            <DialogDescription>
              Cria uma nova base para organizar informações específicas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={kbName}
                onChange={(e) => setKbName(e.target.value)}
                placeholder="Ex: FAQ Produtos"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={kbDescription}
                onChange={(e) => setKbDescription(e.target.value)}
                placeholder="Descreve o propósito desta base..."
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={kbType} onValueChange={setKbType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(KNOWLEDGE_BASE_TYPES).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleCreateKB} disabled={!kbName.trim()}>
              Criar Base
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
