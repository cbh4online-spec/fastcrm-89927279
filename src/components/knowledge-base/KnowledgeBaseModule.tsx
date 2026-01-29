import { useState, useMemo, useEffect } from 'react';
import { useKnowledgeBase } from '@/hooks/useKnowledgeBase';
import { KnowledgeBaseList } from './KnowledgeBaseList';
import { PersonaList } from './PersonaList';
import { AddSourcePanel } from './AddSourcePanel';
import { AIQueryPanel } from './AIQueryPanel';
import { KnowledgeMetricsCard } from './KnowledgeMetricsCard';
import { KnowledgeEntriesPanel } from './KnowledgeEntriesPanel';
import { KnowledgeSourcesPanel } from './KnowledgeSourcesPanel';
import { PageHeader } from '@/components/common/PageHeader';
import { Toolbar } from '@/components/common/Toolbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BookOpen, 
  RefreshCw, 
  Brain,
  Plus,
  FileText,
  Users,
  MessageSquare,
  Link as LinkIcon,
  ListChecks
} from 'lucide-react';
import { KNOWLEDGE_BASE_TYPES, PERSONA_TYPES, TONE_OPTIONS } from '@/types/knowledge-base';
import type { KnowledgeEntry, KnowledgeSource } from '@/types/knowledge-base';
import { toast } from 'sonner';

type ActiveTab = "bases" | "personas" | "query";

const pageTabs = [
  { id: "bases", label: "Bases", icon: <BookOpen className="h-4 w-4" /> },
  { id: "personas", label: "Personas", icon: <Users className="h-4 w-4" /> },
  { id: "query", label: "Testar IA", icon: <MessageSquare className="h-4 w-4" /> },
];

export function KnowledgeBaseModule() {
  const {
    knowledgeBases,
    personas,
    metrics,
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
    createPersona,
    queryKnowledge,
    semanticSearch,
    refresh
  } = useKnowledgeBase();

  const [activeTab, setActiveTab] = useState<ActiveTab>("bases");
  const [selectedKB, setSelectedKB] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [showCreateKB, setShowCreateKB] = useState(false);
  const [showCreatePersona, setShowCreatePersona] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [kbDetailTab, setKbDetailTab] = useState<'add' | 'entries' | 'sources'>('entries');

  // Knowledge base entries and sources for selected KB
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Create KB form state
  const [kbName, setKbName] = useState('');
  const [kbDescription, setKbDescription] = useState('');
  const [kbType, setKbType] = useState('general');

  // Create Persona form state
  const [personaName, setPersonaName] = useState('');
  const [personaDescription, setPersonaDescription] = useState('');
  const [personaType, setPersonaType] = useState('atendimento');
  const [personaTone, setPersonaTone] = useState('empático');

  // Load entries and sources when a KB is selected
  useEffect(() => {
    const loadKBDetails = async () => {
      if (!selectedKB) {
        setEntries([]);
        setSources([]);
        setIsLoadingDetails(false);
        return;
      }
      
      setIsLoadingDetails(true);
      try {
        const [entriesData, sourcesData] = await Promise.all([
          fetchEntries(selectedKB),
          fetchSources(selectedKB)
        ]);
        setEntries(entriesData);
        setSources(sourcesData as KnowledgeSource[]);
      } catch (error) {
        console.error('Error loading KB details:', error);
      } finally {
        setIsLoadingDetails(false);
      }
    };

    loadKBDetails();
  }, [selectedKB, fetchEntries, fetchSources]);

  // Tabs with counts
  const tabsWithCounts = useMemo(() => {
    return pageTabs.map(tab => ({
      ...tab,
      count: tab.id === "bases" 
        ? knowledgeBases.length 
        : tab.id === "personas" 
          ? personas.length 
          : undefined
    }));
  }, [knowledgeBases.length, personas.length]);

  // Quick stats
  const quickStats = useMemo(() => {
    return {
      totalBases: knowledgeBases.length,
      totalPersonas: personas.length,
      totalEntries: metrics?.totalEntries || 0,
      totalQueries: metrics?.totalQueries || 0,
    };
  }, [knowledgeBases.length, personas.length, metrics]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    if (selectedKB) {
      const [entriesData, sourcesData] = await Promise.all([
        fetchEntries(selectedKB),
        fetchSources(selectedKB)
      ]);
      setEntries(entriesData);
      setSources(sourcesData as KnowledgeSource[]);
    }
    setIsRefreshing(false);
    toast.success('Dados atualizados');
  };

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

  const handleCreatePersona = async () => {
    if (!personaName.trim()) return;
    
    const typeConfig = PERSONA_TYPES[personaType as keyof typeof PERSONA_TYPES];
    
    await createPersona({
      name: personaName,
      description: personaDescription,
      personaType: personaType as any,
      toneOfVoice: personaTone as any,
      systemPrompt: typeConfig?.defaultPrompt
    });

    setShowCreatePersona(false);
    setPersonaName('');
    setPersonaDescription('');
    setPersonaType('atendimento');
    setPersonaTone('empático');
  };

  const handleAddUrl = async (url: string) => {
    if (!selectedKB) {
      toast.error('Seleciona uma base de conhecimento primeiro');
      return;
    }
    setIsProcessing(true);
    await addSource(selectedKB, 'url', { url });
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
    setIsProcessing(false);
  };
  const handleAddDocument = async (file: File) => {
    if (!selectedKB) {
      toast.error('Seleciona uma base de conhecimento primeiro');
      return;
    }
    setIsProcessing(true);
    await uploadDocument(selectedKB, file);
    setIsProcessing(false);
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <PageHeader
        title="Bases de Conhecimento & IA"
        count={knowledgeBases.length}
        description="Transforme a IA num verdadeiro especialista do seu negócio"
        tabs={tabsWithCounts}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as ActiveTab)}
      />

      {/* Quick KPIs Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="hover:border-primary/50 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Bases</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-12 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{quickStats.totalBases}</p>
                )}
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Personas</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-12 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{quickStats.totalPersonas}</p>
                )}
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Entradas</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-12 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{quickStats.totalEntries}</p>
                )}
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Consultas</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-12 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{quickStats.totalQueries}</p>
                )}
              </div>
              <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <Brain className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <Toolbar
        searchValue={searchValue}
        searchPlaceholder={
          activeTab === "bases" 
            ? "Pesquisar bases..." 
            : activeTab === "personas" 
              ? "Pesquisar personas..." 
              : "Pesquisar..."
        }
        onSearchChange={setSearchValue}
        showFilters={false}
        rightActions={
          <div className="flex items-center gap-2">
            {activeTab === "bases" && (
              <Button size="sm" onClick={() => setShowCreateKB(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Nova Base
              </Button>
            )}
            {activeTab === "personas" && (
              <Button size="sm" onClick={() => setShowCreatePersona(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Nova Persona
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        }
      />

      {/* Tab Content */}
      {activeTab === "bases" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Knowledge Bases */}
          <div className="lg:col-span-1">
            <KnowledgeBaseList 
              knowledgeBases={knowledgeBases.filter(kb => 
                kb.name.toLowerCase().includes(searchValue.toLowerCase())
              )}
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
          <div className="lg:col-span-2 space-y-4">
            {selectedKB ? (
              <>
                {/* Sub-tabs for KB details */}
                <Tabs value={kbDetailTab} onValueChange={(v) => setKbDetailTab(v as any)}>
                  <TabsList className="grid grid-cols-3 w-full max-w-md">
                    <TabsTrigger value="entries" className="flex items-center gap-1">
                      <ListChecks className="h-4 w-4" />
                      Entradas ({entries.length})
                    </TabsTrigger>
                    <TabsTrigger value="sources" className="flex items-center gap-1">
                      <LinkIcon className="h-4 w-4" />
                      Fontes ({sources.length})
                    </TabsTrigger>
                    <TabsTrigger value="add" className="flex items-center gap-1">
                      <Plus className="h-4 w-4" />
                      Adicionar
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="entries" className="mt-4">
                    <KnowledgeEntriesPanel
                      entries={entries}
                      isLoading={isLoadingDetails}
                      knowledgeBaseId={selectedKB}
                      onValidate={async (id) => {
                        await validateEntry(id);
                        const updated = await fetchEntries(selectedKB);
                        setEntries(updated);
                      }}
                      onUpdate={async (id, data) => {
                        await updateEntry(id, data);
                        const updated = await fetchEntries(selectedKB);
                        setEntries(updated);
                      }}
                      onDelete={async (id) => {
                        await deleteEntry(id);
                        const updated = await fetchEntries(selectedKB);
                        setEntries(updated);
                      }}
                      onArchive={async (id) => {
                        await archiveEntry(id);
                        const updated = await fetchEntries(selectedKB);
                        setEntries(updated);
                      }}
                      onSemanticSearch={semanticSearch}
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
                      onAddUrl={async (url) => {
                        await handleAddUrl(url);
                        // Refresh after processing
                        setTimeout(async () => {
                          const [entriesData, sourcesData] = await Promise.all([
                            fetchEntries(selectedKB),
                            fetchSources(selectedKB)
                          ]);
                          setEntries(entriesData);
                          setSources(sourcesData as KnowledgeSource[]);
                        }, 3000);
                      }}
                      onAddManual={async (data) => {
                        await handleAddManual(data);
                        const updated = await fetchEntries(selectedKB);
                        setEntries(updated);
                      }}
                      onAddDocument={async (file) => {
                        await handleAddDocument(file);
                        // Refresh after processing (documents take longer)
                        setTimeout(async () => {
                          const [entriesData, sourcesData] = await Promise.all([
                            fetchEntries(selectedKB),
                            fetchSources(selectedKB)
                          ]);
                          setEntries(entriesData);
                          setSources(sourcesData as KnowledgeSource[]);
                        }, 5000);
                      }}
                      isProcessing={isProcessing}
                    />
                  </TabsContent>
                </Tabs>
              </>
            ) : (
              <Card className="border-dashed">
                <CardContent className="py-12">
                  <div className="text-center text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">Seleciona uma base de conhecimento</p>
                    <p className="text-sm mt-1">Ou cria uma nova para começar</p>
                    <Button 
                      className="mt-4" 
                      onClick={() => setShowCreateKB(true)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Criar Base
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {activeTab === "personas" && (
        <PersonaList 
          personas={personas.filter(p => 
            p.name.toLowerCase().includes(searchValue.toLowerCase())
          )}
          isLoading={isLoading}
          onCreateNew={() => setShowCreatePersona(true)}
        />
      )}

      {activeTab === "query" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AIQueryPanel 
            personas={personas}
            onQuery={queryKnowledge}
            context="test"
          />
          <KnowledgeMetricsCard metrics={metrics} isLoading={isLoading} />
        </div>
      )}

      {/* Create KB Dialog */}
      <Dialog open={showCreateKB} onOpenChange={setShowCreateKB}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Base de Conhecimento</DialogTitle>
            <DialogDescription>
              Cria uma base para organizar informação que a IA pode usar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input
                value={kbName}
                onChange={(e) => setKbName(e.target.value)}
                placeholder="Ex: FAQ Geral, Scripts de Vendas..."
              />
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Textarea
                value={kbDescription}
                onChange={(e) => setKbDescription(e.target.value)}
                placeholder="Para que serve esta base..."
              />
            </div>
            <div>
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
            <Button onClick={handleCreateKB} className="w-full" disabled={!kbName.trim()}>
              <Plus className="h-4 w-4 mr-1" />
              Criar Base
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Persona Dialog */}
      <Dialog open={showCreatePersona} onOpenChange={setShowCreatePersona}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Persona IA</DialogTitle>
            <DialogDescription>
              Define como a IA deve comunicar em cada contexto.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input
                value={personaName}
                onChange={(e) => setPersonaName(e.target.value)}
                placeholder="Ex: Consultor de Vendas, Suporte Técnico..."
              />
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Textarea
                value={personaDescription}
                onChange={(e) => setPersonaDescription(e.target.value)}
                placeholder="Quando usar esta persona..."
              />
            </div>
            <div>
              <Label>Tipo de Persona</Label>
              <Select value={personaType} onValueChange={setPersonaType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PERSONA_TYPES).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tom de Voz</Label>
              <Select value={personaTone} onValueChange={setPersonaTone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TONE_OPTIONS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCreatePersona} className="w-full" disabled={!personaName.trim()}>
              <Plus className="h-4 w-4 mr-1" />
              Criar Persona
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
