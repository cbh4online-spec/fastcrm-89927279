import { ReactNode } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PageBreadcrumbs } from '@/components/layout/PageBreadcrumbs';
import { EntityDetailHeader } from './EntityDetailHeader';
import { EntitySidebarMenu } from './EntitySidebarMenu';
import { EntityContextSidebar } from './EntityContextSidebar';
import { EntityType, Entity, MenuSection } from '@/types/entity';

interface EntityDetailLayoutProps {
  entityType: EntityType;
  entity: Entity;
  isLoading?: boolean;
  isEditing: boolean;
  editedName: string;
  onEditedNameChange: (name: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onDelete: () => void;
  onGenerateSuggestions: () => void;
  onOpenTemplates: () => void;
  onCreateTask: () => void;
  isSaving?: boolean;
  isGeneratingSuggestions?: boolean;
  activeSection: MenuSection;
  onSectionChange: (section: MenuSection) => void;
  breadcrumbs: { label: string; href?: string }[];
  backPath: string;
  statusBadge?: ReactNode;
  extraBadges?: ReactNode;
  counts?: {
    messages?: number;
    tasks?: number;
    opportunities?: number;
    proposals?: number;
    contacts?: number;
  };
  children: ReactNode;
}

export function EntityDetailLayout({
  entityType,
  entity,
  isEditing,
  editedName,
  onEditedNameChange,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
  onGenerateSuggestions,
  onOpenTemplates,
  onCreateTask,
  isSaving,
  isGeneratingSuggestions,
  activeSection,
  onSectionChange,
  breadcrumbs,
  backPath,
  statusBadge,
  extraBadges,
  counts,
  children,
}: EntityDetailLayoutProps) {
  return (
    <div className="h-full flex flex-col -m-6">
      {/* Breadcrumbs */}
      <div className="bg-background px-6 pt-4">
        <PageBreadcrumbs items={breadcrumbs} />
      </div>
      
      {/* Header */}
      <EntityDetailHeader
        entityType={entityType}
        entity={entity}
        isEditing={isEditing}
        editedName={editedName}
        onEditedNameChange={onEditedNameChange}
        onStartEdit={onStartEdit}
        onCancelEdit={onCancelEdit}
        onSave={onSave}
        onDelete={onDelete}
        onGenerateSuggestions={onGenerateSuggestions}
        onOpenTemplates={onOpenTemplates}
        onCreateTask={onCreateTask}
        isSaving={isSaving}
        isGeneratingSuggestions={isGeneratingSuggestions}
        backPath={backPath}
        statusBadge={statusBadge}
        extraBadges={extraBadges}
      />

      {/* Main Content - 3 Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Menu */}
        <EntitySidebarMenu
          entityType={entityType}
          activeSection={activeSection}
          onSectionChange={onSectionChange}
          counts={counts}
        />

        {/* Center Content */}
        <main className="flex-1 overflow-auto">
          <ScrollArea className="h-full">
            <div className="p-6 max-w-4xl">
              {children}
            </div>
          </ScrollArea>
        </main>

        {/* Right Sidebar - Context */}
        <EntityContextSidebar
          entityType={entityType}
          entity={entity}
        />
      </div>
    </div>
  );
}

// Export all entity components
export * from './EntityDetailHeader';
export * from './EntitySidebarMenu';
export * from './EntityContextSidebar';
export * from './EntityAISuggestionsPanel';
export * from './EntityEmptyState';
export * from './EntityOverviewSection';
