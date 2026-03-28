import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { SmartFormsList } from '@/components/smart-forms/SmartFormsList';
import { SmartFormBuilder } from '@/components/smart-forms/SmartFormBuilder';
import { FormSubmissionsPanel } from '@/components/smart-forms/FormSubmissionsPanel';
import { FormAnalyticsDashboard } from '@/components/smart-forms/FormAnalyticsDashboard';
import { PartialSubmissionTracker } from '@/components/smart-forms/PartialSubmissionTracker';
import { FormABTestPanel } from '@/components/smart-forms/FormABTestPanel';
import { SmartForm } from '@/types/smartForm';

type View = 'list' | 'create' | 'edit' | 'submissions' | 'analytics' | 'partials' | 'abtest';

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

  const handleViewAnalytics = (form: SmartForm) => {
    setSelectedForm(form);
    setView('analytics');
  };

  const handleViewPartials = (form: SmartForm) => {
    setSelectedForm(form);
    setView('partials');
  };

  const handleViewABTest = (form: SmartForm) => {
    setSelectedForm(form);
    setView('abtest');
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
              onViewAnalytics={handleViewAnalytics}
              onViewPartials={handleViewPartials}
              onViewABTest={handleViewABTest}
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

        {view === 'analytics' && selectedForm && (
          <FormAnalyticsDashboard
            form={selectedForm}
            onBack={handleBack}
          />
        )}

        {view === 'partials' && selectedForm && (
          <PartialSubmissionTracker
            form={selectedForm}
            onBack={handleBack}
          />
        )}

        {view === 'abtest' && selectedForm && (
          <FormABTestPanel
            form={selectedForm}
            onBack={handleBack}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
