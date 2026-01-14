import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { FormStudio } from '@/components/form-studio/FormStudio';
import { FormSchema } from '@/types/formSchema';

export default function FormStudioPage() {
  const handleSave = (schema: FormSchema) => {
    console.log('Form schema saved:', schema);
    // TODO: Save to database or use in landing pages
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Form Studio</h1>
          <p className="text-muted-foreground">
            Crie formulários personalizados com IA ou manualmente
          </p>
        </div>

        <FormStudio onSave={handleSave} />
      </div>
    </DashboardLayout>
  );
}
