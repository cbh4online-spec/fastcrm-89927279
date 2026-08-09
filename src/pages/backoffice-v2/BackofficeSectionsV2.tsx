/**
 * Páginas do backoffice V2 que reutilizam as secções já existentes do
 * backoffice antigo, dentro do shell V2. Sem duplicação de lógica.
 */
import type { ReactNode } from "react";
import { useState } from "react";
import { BackofficeShellV2 } from "@/components/backoffice-v2/BackofficeShellV2";
import {
  PricingManagementSection,
  AIUsageSection,
  BillingSection,
  AlertsSection,
  ModerationSection,
  LogsSection,
  ActivityLogsSection,
  FeatureRegistrySection,
  RolloutDashboardSection,
  WorkspaceMenusSection,
} from "@/components/super-admin";
import BugReportsAdminPage from "@/components/super-admin/BugReportsSection";
import { AdminSettingsPanel } from "@/components/admin/AdminSettingsPanel";
import { UserRolesPanel } from "@/components/admin/UserRolesPanel";
import { WorkspaceInstancesTable } from "@/components/admin/WorkspaceInstancesTable";
import { WorkspaceInstanceForm } from "@/components/admin/WorkspaceInstanceForm";
import type { WorkspaceInstance } from "@/hooks/useWorkspaceInstances";

function ShellPage({ children }: { children: ReactNode }) {
  return (
    <BackofficeShellV2>
      <div className="space-y-7 px-4 py-7 md:px-8">{children}</div>
    </BackofficeShellV2>
  );
}

export function BackofficePricingV2() {
  return <ShellPage><PricingManagementSection /></ShellPage>;
}

export function BackofficeLimitsV2() {
  return <ShellPage><PricingManagementSection /></ShellPage>;
}

export function BackofficeAIUsageV2() {
  return <ShellPage><AIUsageSection /></ShellPage>;
}

export function BackofficePaymentsV2() {
  return <ShellPage><BillingSection initialTab="payments" /></ShellPage>;
}

export function BackofficeStripeSyncV2() {
  return <ShellPage><BillingSection initialTab="sync" /></ShellPage>;
}

export function BackofficeAlertsV2() {
  return <ShellPage><AlertsSection initialTab="alerts" /></ShellPage>;
}

export function BackofficeIncidentsV2() {
  return <ShellPage><AlertsSection initialTab="incidents" /></ShellPage>;
}

export function BackofficeModerationV2() {
  return <ShellPage><ModerationSection /></ShellPage>;
}

export function BackofficeBugsV2() {
  return <ShellPage><BugReportsAdminPage /></ShellPage>;
}

export function BackofficeLogsV2() {
  return <ShellPage><LogsSection /></ShellPage>;
}

export function BackofficeActivityLogsV2() {
  return <ShellPage><ActivityLogsSection /></ShellPage>;
}

export function BackofficeFeaturesV2() {
  return <ShellPage><FeatureRegistrySection /></ShellPage>;
}

export function BackofficeRolloutV2() {
  return <ShellPage><RolloutDashboardSection /></ShellPage>;
}

export function BackofficeWorkspaceMenusV2() {
  return <ShellPage><WorkspaceMenusSection /></ShellPage>;
}

export function BackofficeSettingsV2() {
  const [formOpen, setFormOpen] = useState(false);
  const [editInstance, setEditInstance] = useState<WorkspaceInstance | null>(null);

  const handleEdit = (instance: WorkspaceInstance) => {
    setEditInstance(instance);
    setFormOpen(true);
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) setEditInstance(null);
  };

  return (
    <ShellPage>
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações Globais</h1>
        <p className="text-muted-foreground">Gerir configurações do sistema e instâncias</p>
      </div>
      <AdminSettingsPanel />
      <div>
        <h2 className="mb-4 text-xl font-semibold">Gestão de Roles</h2>
        <UserRolesPanel />
      </div>
      <div>
        <h2 className="mb-4 text-xl font-semibold">Instâncias de Workspace</h2>
        <WorkspaceInstancesTable onEdit={handleEdit} />
      </div>
      <WorkspaceInstanceForm
        open={formOpen}
        onOpenChange={handleFormClose}
        editInstance={editInstance}
      />
    </ShellPage>
  );
}
