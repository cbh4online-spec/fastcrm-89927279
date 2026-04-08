/**
 * Assignment Engine — Round-robin + capacity-based auto-assign
 *
 * Formulas:
 * - Pipeline: SUM(opportunities.value) WHERE owner_id = manager AND status != 'lost'
 * - Conversion: COUNT(opportunities WHERE status='won' AND owner_id=manager)
 *               / COUNT(leads WHERE assigned_to=manager) * 100
 * - Capacity score: lower is better (more loaded). Higher score = more capacity.
 */

import type { EntityType } from "./ownershipResolver";
import { OWNERSHIP_FIELD, ENTITY_TABLE } from "./ownershipResolver";

// ─── Types ─────────────────────────────────────────────────

export interface ManagerWorkload {
  managerId: string;
  openLeads: number;
  activeContacts: number;
  managedCompanies: number;
  openOpportunities: number;
  totalLoad: number;
  capacityScore: number; // 0-100, higher = more available
  workloadBucket: "low" | "medium" | "high" | "overloaded";
  eligibleForAutoAssign: boolean;
}

export interface AssignmentLogEntry {
  workspace_id: string;
  entity_type: EntityType;
  entity_id: string;
  entity_name?: string | null;
  previous_manager_id?: string | null;
  new_manager_id: string;
  assignment_mode: "manual" | "bulk" | "round_robin" | "auto_capacity" | "fallback";
  rule_id?: string | null;
  assigned_by?: string | null;
  reason?: string | null;
}

// ─── Capacity calculator ───────────────────────────────────

const MAX_IDEAL_LOAD = 100; // above this → overloaded

export function calculateManagerCapacity(
  openLeads: number,
  activeContacts: number,
  managedCompanies: number,
  openOpportunities: number
): Pick<ManagerWorkload, "totalLoad" | "capacityScore" | "workloadBucket" | "eligibleForAutoAssign"> {
  // Weighted total: leads=1, contacts=0.5, companies=0.3, opps=2
  const totalLoad = openLeads * 1 + activeContacts * 0.5 + managedCompanies * 0.3 + openOpportunities * 2;
  const capacityScore = Math.max(0, Math.min(100, Math.round(100 - (totalLoad / MAX_IDEAL_LOAD) * 100)));

  let workloadBucket: ManagerWorkload["workloadBucket"];
  if (totalLoad <= 30) workloadBucket = "low";
  else if (totalLoad <= 60) workloadBucket = "medium";
  else if (totalLoad <= MAX_IDEAL_LOAD) workloadBucket = "high";
  else workloadBucket = "overloaded";

  return {
    totalLoad,
    capacityScore,
    workloadBucket,
    eligibleForAutoAssign: workloadBucket !== "overloaded",
  };
}

// ─── Round-robin resolver ──────────────────────────────────

/**
 * Given ordered member IDs and the last-assigned ID,
 * returns the next manager in rotation.
 */
export function getNextRoundRobin(
  orderedMemberIds: string[],
  lastAssignedId: string | null
): string | null {
  if (orderedMemberIds.length === 0) return null;
  if (!lastAssignedId) return orderedMemberIds[0];

  const currentIdx = orderedMemberIds.indexOf(lastAssignedId);
  const nextIdx = (currentIdx + 1) % orderedMemberIds.length;
  return orderedMemberIds[nextIdx];
}

// ─── Capacity-based selector ───────────────────────────────

/**
 * Select the best manager based on capacity score (highest wins).
 */
export function selectByCapacity(workloads: ManagerWorkload[]): string | null {
  const eligible = workloads.filter(w => w.eligibleForAutoAssign);
  if (eligible.length === 0) return null;
  eligible.sort((a, b) => b.capacityScore - a.capacityScore);
  return eligible[0].managerId;
}

// ─── Bulk assign helper ────────────────────────────────────

export async function executeBulkAssign(
  workspaceClient: any,
  entityType: EntityType,
  entityIds: string[],
  managerId: string,
  workspaceId: string,
  assignedBy: string,
  mode: AssignmentLogEntry["assignment_mode"] = "bulk",
  entityNames?: Record<string, string>
): Promise<{ success: number; failed: number }> {
  const table = ENTITY_TABLE[entityType];
  const field = OWNERSHIP_FIELD[entityType];

  // Get current owners for logging
  const { data: currentEntities } = await workspaceClient
    .from(table)
    .select(`id, name, ${field}`)
    .in("id", entityIds);

  // Update ownership
  const { error } = await workspaceClient
    .from(table)
    .update({ [field]: managerId })
    .in("id", entityIds);

  if (error) throw error;

  // Log assignments
  const logs: AssignmentLogEntry[] = entityIds.map(eid => {
    const current = currentEntities?.find((e: any) => e.id === eid);
    return {
      workspace_id: workspaceId,
      entity_type: entityType,
      entity_id: eid,
      entity_name: current?.name || entityNames?.[eid] || null,
      previous_manager_id: current?.[field] || null,
      new_manager_id: managerId,
      assignment_mode: mode,
      assigned_by: assignedBy,
      reason: mode === "bulk" ? `Bulk assign de ${entityIds.length} entidades` : null,
    };
  });

  await workspaceClient.from("entity_assignment_logs").insert(logs);

  return { success: entityIds.length, failed: 0 };
}

// ─── Round-robin execution ─────────────────────────────────

export async function executeRoundRobin(
  workspaceClient: any,
  groupId: string,
  entityType: EntityType,
  entityIds: string[],
  workspaceId: string,
  assignedBy: string
): Promise<{ assignments: Array<{ entityId: string; managerId: string }>; success: number }> {
  // Get group with members
  const { data: group } = await workspaceClient
    .from("assignment_rotation_groups")
    .select("id, last_assigned_manager_id")
    .eq("id", groupId)
    .single();

  if (!group) throw new Error("Grupo de rotação não encontrado");

  const { data: groupMembers } = await workspaceClient
    .from("rotation_group_members")
    .select("manager_id, position")
    .eq("group_id", groupId)
    .eq("is_active", true)
    .order("position", { ascending: true });

  if (!groupMembers || groupMembers.length === 0) {
    throw new Error("Grupo de rotação sem membros ativos");
  }

  const orderedIds = groupMembers.map((m: any) => m.manager_id);
  let lastAssigned = group.last_assigned_manager_id;
  const assignments: Array<{ entityId: string; managerId: string }> = [];
  const table = ENTITY_TABLE[entityType];
  const field = OWNERSHIP_FIELD[entityType];

  for (const entityId of entityIds) {
    const nextManager = getNextRoundRobin(orderedIds, lastAssigned);
    if (!nextManager) break;

    assignments.push({ entityId, managerId: nextManager });
    lastAssigned = nextManager;
  }

  // Batch update by manager
  const byManager = new Map<string, string[]>();
  for (const a of assignments) {
    const list = byManager.get(a.managerId) || [];
    list.push(a.entityId);
    byManager.set(a.managerId, list);
  }

  for (const [managerId, ids] of byManager) {
    await workspaceClient.from(table).update({ [field]: managerId }).in("id", ids);
  }

  // Update last assigned
  await workspaceClient
    .from("assignment_rotation_groups")
    .update({ last_assigned_manager_id: lastAssigned, updated_at: new Date().toISOString() })
    .eq("id", groupId);

  // Log
  const logs: AssignmentLogEntry[] = assignments.map(a => ({
    workspace_id: workspaceId,
    entity_type: entityType,
    entity_id: a.entityId,
    new_manager_id: a.managerId,
    assignment_mode: "round_robin" as const,
    assigned_by: assignedBy,
    reason: `Round-robin via grupo ${groupId}`,
  }));

  await workspaceClient.from("entity_assignment_logs").insert(logs);

  return { assignments, success: assignments.length };
}
