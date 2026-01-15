import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { SmartFormsList } from '@/components/smart-forms/SmartFormsList';
import { SmartFormBuilder } from '@/components/smart-forms/SmartFormBuilder';
import { FormSubmissionsPanel } from '@/components/smart-forms/FormSubmissionsPanel';
import { SmartForm } from '@/types/smartForm';

type View = 'list' | 'create' | 'edit' | 'submissions';

export default function SmartForms() {
  const [view, setView] = useState<View>('list');
  const [selectedForm, setSelectedForm] = useState<SmartForm | null>(null);

  const handleCreateNew = () => {
    setSelectedForm(null);
    setView('create');
  };

  const handleEdit = (form: SmartForm) => {
    setSelectedForm(form);
    setView('edit');
  };

  const handleViewSubmissions = (form: SmartForm) => {
    setSelectedForm(form);
    setView('submissions');
  };

  const handleBack = () => {
    setSelectedForm(null);
    setView('list');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {view === 'list' && (
          <>
            <div>
              <h1 className="text-2xl font-bold">Formulários Inteligentes</h1>
              <p className="text-muted-foreground">
                Formulários que captam, qualificam e ativam leads automaticamente
              </p>
            </div>
            <SmartFormsList
              onCreateNew={handleCreateNew}
              onEdit={handleEdit}
              onViewSubmissions={handleViewSubmissions}
            />
          </>
        )}

        {(view === 'create' || view === 'edit') && (
          <SmartFormBuilder
            form={selectedForm || undefined}
            onBack={handleBack}
          />
        )}

        {view === 'submissions' && selectedForm && (
          <FormSubmissionsPanel
            form={selectedForm}
            onBack={handleBack}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
