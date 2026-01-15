// ============================================
// PERMISSIONS SERVICE
// ============================================
// Controls access to metrics based on user role.

import {
  MetricPermission,
  PermissionLevel,
  MetricAuditLog,
} from "@/types/metrics-governance";
import { METRICS_CATALOG } from "./MetricsCatalog";

// Role hierarchy
const ROLE_HIERARCHY: Record<PermissionLevel, number> = {
  user: 1,
  manager: 2,
  financial: 3,
  admin: 4,
};

export class PermissionsService {
  private userRole: PermissionLevel;
  private auditLogs: MetricAuditLog[] = [];

  constructor(role: PermissionLevel = "user") {
    this.userRole = role;
  }

  // Check if user can access a metric
  public canAccessMetric(metricId: string): boolean {
    const metric = METRICS_CATALOG[metricId];
    if (!metric) return false;

    return ROLE_HIERARCHY[this.userRole] >= ROLE_HIERARCHY[metric.requiredPermission];
  }

  // Get all accessible metrics for current role
  public getAccessibleMetrics(): string[] {
    return Object.entries(METRICS_CATALOG)
      .filter(([_, def]) => ROLE_HIERARCHY[this.userRole] >= ROLE_HIERARCHY[def.requiredPermission])
      .map(([id]) => id);
  }

  // Get metrics by permission level
  public getMetricsByPermission(level: PermissionLevel): string[] {
    return Object.entries(METRICS_CATALOG)
      .filter(([_, def]) => def.requiredPermission === level)
      .map(([id]) => id);
  }

  // Get permissions for a metric
  public getMetricPermissions(metricId: string): MetricPermission | null {
    const metric = METRICS_CATALOG[metricId];
    if (!metric) return null;

    const canAccess = this.canAccessMetric(metricId);

    return {
      metricId,
      role: this.userRole,
      canView: canAccess,
      canExport: canAccess && ROLE_HIERARCHY[this.userRole] >= ROLE_HIERARCHY.manager,
      canModifyDefinition: ROLE_HIERARCHY[this.userRole] >= ROLE_HIERARCHY.admin,
    };
  }

  // Filter metrics by module and permission
  public filterMetricsForModule(moduleName: string): string[] {
    return Object.entries(METRICS_CATALOG)
      .filter(([_, def]) => {
        const hasModuleContext = def.contexts.some((c) => c.module === moduleName);
        const hasPermission = this.canAccessMetric(def.id);
        return hasModuleContext && hasPermission;
      })
      .map(([id]) => id);
  }

  // Log metric access
  public logAccess(metricId: string, action: string): void {
    const log: MetricAuditLog = {
      id: crypto.randomUUID(),
      metricId,
      action: action as any,
      performedBy: "current-user", // Would be replaced with actual user ID
      performedAt: new Date().toISOString(),
      impactedModules: [],
    };

    this.auditLogs.push(log);

    // In production, this would be sent to the database
    console.debug("Metric access logged:", log);
  }

  // Get metrics summary by category and permission
  public getMetricsSummaryByCategory(): Record<string, { total: number; accessible: number }> {
    const summary: Record<string, { total: number; accessible: number }> = {};

    Object.values(METRICS_CATALOG).forEach((metric) => {
      if (!summary[metric.category]) {
        summary[metric.category] = { total: 0, accessible: 0 };
      }
      summary[metric.category].total++;
      if (this.canAccessMetric(metric.id)) {
        summary[metric.category].accessible++;
      }
    });

    return summary;
  }

  // Check if user can export financial data
  public canExportFinancialData(): boolean {
    return ROLE_HIERARCHY[this.userRole] >= ROLE_HIERARCHY.financial;
  }

  // Check if user can modify definitions
  public canModifyDefinitions(): boolean {
    return ROLE_HIERARCHY[this.userRole] >= ROLE_HIERARCHY.admin;
  }

  // Set user role
  public setUserRole(role: PermissionLevel): void {
    this.userRole = role;
  }

  // Get current role
  public getCurrentRole(): PermissionLevel {
    return this.userRole;
  }
}

// Default instance
export const permissionsService = new PermissionsService("user");
