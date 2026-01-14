import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { FormStudio } from '@/components/form-studio/FormStudio';
import { BlueprintGenerator } from '@/components/blueprint/BlueprintGenerator';
import { FormSchema } from '@/types/formSchema';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Sparkles } from 'lucide-react';

export default function FormStudioPage() {
  const [savedSchema, setSavedSchema] = useState<FormSchema | null>(null);

  const handleSave = (schema: FormSchema) => {
    console.log('Form schema saved:', schema);
    setSavedSchema(schema);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Form Studio</h1>
          <p className="text-muted-foreground">
            Crie formulários e gere blueprints CRM com IA
          </p>
        </div>

        <Tabs defaultValue="forms" className="space-y-6">
          <TabsList>
            <TabsTrigger value="forms" className="gap-2">
              <FileText className="h-4 w-4" />
              Formulários
            </TabsTrigger>
            <TabsTrigger value="blueprint" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Blueprint Generator
            </TabsTrigger>
          </TabsList>

          <TabsContent value="forms">
            <FormStudio onSave={handleSave} />
          </TabsContent>

          <TabsContent value="blueprint">
            <BlueprintGenerator
              formSchema={savedSchema || undefined}
              onBlueprintSaved={(bp) => console.log('Blueprint saved:', bp)}
            />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
