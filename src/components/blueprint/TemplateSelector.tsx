import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BlueprintTemplate, blueprintTemplates, searchTemplates } from '@/data/blueprintTemplates';
import { Search, LayoutTemplate, Sparkles, FileUp, ArrowRight, Check } from 'lucide-react';

interface TemplateSelectorProps {
  onSelectTemplate: (template: BlueprintTemplate) => void;
  onStartFromScratch: () => void;
  onImportForm: () => void;
  selectedTemplate?: BlueprintTemplate | null;
}

export function TemplateSelector({
  onSelectTemplate,
  onStartFromScratch,
  onImportForm,
  selectedTemplate,
}: TemplateSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [mode, setMode] = useState<'template' | 'scratch' | 'import'>('template');

  const filteredTemplates = searchQuery.trim()
    ? searchTemplates(searchQuery)
    : blueprintTemplates;

  const industries = [...new Set(blueprintTemplates.map(t => t.industry))];

  return (
    <div className="space-y-6">
      {/* Mode selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          className={`cursor-pointer transition-all hover:border-primary ${
            mode === 'template' ? 'border-primary bg-primary/5' : ''
          }`}
          onClick={() => setMode('template')}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <LayoutTemplate className="h-8 w-8 text-primary" />
              {mode === 'template' && <Check className="h-5 w-5 text-primary" />}
            </div>
            <CardTitle className="text-lg">Template da Indústria</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Comece com um template pré-configurado para a sua indústria e personalize-o.
            </CardDescription>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all hover:border-primary ${
            mode === 'scratch' ? 'border-primary bg-primary/5' : ''
          }`}
          onClick={() => setMode('scratch')}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Sparkles className="h-8 w-8 text-primary" />
              {mode === 'scratch' && <Check className="h-5 w-5 text-primary" />}
            </div>
            <CardTitle className="text-lg">Começar do Zero</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Deixe a AI criar um blueprint único baseado na sua descrição.
            </CardDescription>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all hover:border-primary ${
            mode === 'import' ? 'border-primary bg-primary/5' : ''
          }`}
          onClick={() => setMode('import')}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <FileUp className="h-8 w-8 text-primary" />
              {mode === 'import' && <Check className="h-5 w-5 text-primary" />}
            </div>
            <CardTitle className="text-lg">Importar Formulário</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Importe um formulário e a AI adapta automaticamente o melhor template.
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* Template selection mode */}
      {mode === 'template' && (
        <Card>
          <CardHeader>
            <CardTitle>Escolher Template</CardTitle>
            <CardDescription>
              Selecione um template para usar como base. A AI pode personalizá-lo depois.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Industry tabs */}
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="flex flex-wrap h-auto gap-1">
                <TabsTrigger value="all" className="text-xs">Todos</TabsTrigger>
                {industries.map((industry) => (
                  <TabsTrigger key={industry} value={industry} className="text-xs">
                    {industry}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="all" className="mt-4">
                <TemplateGrid
                  templates={filteredTemplates}
                  selectedTemplate={selectedTemplate}
                  onSelect={onSelectTemplate}
                />
              </TabsContent>

              {industries.map((industry) => (
                <TabsContent key={industry} value={industry} className="mt-4">
                  <TemplateGrid
                    templates={filteredTemplates.filter(t => t.industry === industry)}
                    selectedTemplate={selectedTemplate}
                    onSelect={onSelectTemplate}
                  />
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Scratch mode */}
      {mode === 'scratch' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Gerar Blueprint Personalizado
            </CardTitle>
            <CardDescription>
              A AI irá fazer-lhe perguntas para entender as suas necessidades e criar um blueprint único.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={onStartFromScratch} className="w-full">
              Começar Geração
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Import mode */}
      {mode === 'import' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileUp className="h-5 w-5" />
              Importar Formulário
            </CardTitle>
            <CardDescription>
              Use um formulário existente do Form Studio. A AI irá recomendar e adaptar o template mais adequado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={onImportForm} className="w-full">
              Selecionar Formulário
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface TemplateGridProps {
  templates: BlueprintTemplate[];
  selectedTemplate?: BlueprintTemplate | null;
  onSelect: (template: BlueprintTemplate) => void;
}

function TemplateGrid({ templates, selectedTemplate, onSelect }: TemplateGridProps) {
  if (templates.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum template encontrado.
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-4">
        {templates.map((template) => (
          <Card
            key={template.id}
            className={`cursor-pointer transition-all hover:border-primary ${
              selectedTemplate?.id === template.id ? 'border-primary ring-2 ring-primary/20' : ''
            }`}
            onClick={() => onSelect(template)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{template.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    {selectedTemplate?.id === template.id && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <Badge variant="secondary" className="text-xs mt-1">
                    {template.industry}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline" className="text-xs">
                  {template.blueprint.customFields.length} campos
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {template.blueprint.sections.length} secções
                </Badge>
                {template.blueprint.pipelineStages && (
                  <Badge variant="outline" className="text-xs">
                    {template.blueprint.pipelineStages.length} etapas
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  {template.blueprint.automations.length} automações
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}
