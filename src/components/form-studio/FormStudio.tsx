import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FormField, FormSchema } from '@/types/formSchema';
import { NaturalLanguageMode } from './NaturalLanguageMode';
import { FormBuilderMode } from './FormBuilderMode';
import { FormPreview } from './FormPreview';
import { Sparkles, Wrench, Eye, Save, FileJson } from 'lucide-react';
import { toast } from 'sonner';

interface FormStudioProps {
  initialSchema?: FormSchema;
  onSave?: (schema: FormSchema) => void;
}

export function FormStudio({ initialSchema, onSave }: FormStudioProps) {
  const [mode, setMode] = useState<'natural' | 'builder'>('natural');
  const [title, setTitle] = useState(initialSchema?.title || '');
  const [description, setDescription] = useState(initialSchema?.description || '');
  const [fields, setFields] = useState<FormField[]>(initialSchema?.fields || []);
  const [submitButtonText, setSubmitButtonText] = useState(
    initialSchema?.settings?.submitButtonText || 'Enviar'
  );

  const handleFieldsGenerated = (generatedFields: FormField[]) => {
    setFields(generatedFields);
    setMode('builder');
  };

  const handleSave = () => {
    if (!title.trim()) {
      toast.error('Por favor, adicione um título ao formulário');
      return;
    }

    if (fields.length === 0) {
      toast.error('Adicione pelo menos um campo ao formulário');
      return;
    }

    const schema: FormSchema = {
      id: initialSchema?.id || crypto.randomUUID(),
      title,
      description: description || undefined,
      fields,
      settings: {
        submitButtonText,
      },
      createdAt: initialSchema?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave?.(schema);
    toast.success('Formulário guardado com sucesso!');
  };

  const handleExportSchema = () => {
    const schema: FormSchema = {
      id: initialSchema?.id || crypto.randomUUID(),
      title: title || 'Formulário sem título',
      description: description || undefined,
      fields,
      settings: { submitButtonText },
      createdAt: initialSchema?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(schema, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'formulario'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Schema exportado!');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Editor Panel */}
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Definições do formulário</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="form-title">Título</Label>
              <Input
                id="form-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Formulário de contacto"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="form-description">Descrição (opcional)</Label>
              <Textarea
                id="form-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Breve descrição do formulário"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="submit-text">Texto do botão</Label>
              <Input
                id="submit-text"
                value={submitButtonText}
                onChange={(e) => setSubmitButtonText(e.target.value)}
                placeholder="Enviar"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Campos</CardTitle>
              <Badge variant="secondary">{fields.length} campos</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={mode} onValueChange={(v) => setMode(v as 'natural' | 'builder')}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="natural" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Linguagem natural
                </TabsTrigger>
                <TabsTrigger value="builder" className="gap-2">
                  <Wrench className="h-4 w-4" />
                  Construtor
                </TabsTrigger>
              </TabsList>

              <TabsContent value="natural" className="mt-0">
                <NaturalLanguageMode onFieldsGenerated={handleFieldsGenerated} />
              </TabsContent>

              <TabsContent value="builder" className="mt-0">
                <FormBuilderMode fields={fields} onFieldsChange={setFields} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button onClick={handleSave} className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            Guardar formulário
          </Button>
          <Button variant="outline" onClick={handleExportSchema}>
            <FileJson className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Preview Panel */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Eye className="h-4 w-4" />
          <span className="text-sm font-medium">Pré-visualização</span>
        </div>
        <FormPreview
          title={title}
          description={description}
          fields={fields}
          submitButtonText={submitButtonText}
        />
      </div>
    </div>
  );
}
