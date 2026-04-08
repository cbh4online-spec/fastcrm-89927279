/**
 * Ownership Resolver — Single source of truth for entity ownership
 * 
 * Normalises ownership fields across tables:
 * - leads, contacts, companies → assigned_to
 * - opportunities → owner_id
 * 
 * Ownership states:
 * - assigned   → valid UUID pointing to an active workspace member
 * - unassigned → null or empty string
 * - orphan     → UUID that does NOT match any active workspace member
 */

export type OwnershipStatus = "assigned" | "unassigned" | "orphan";

export interface ResolvedOwnership {
  ownerId: string | null;
  status: OwnershipStatus;
}

export type EntityType = "lead" | "contact" | "company" | "opportunity";

/** Field that holds the owner for each entity type */
export const OWNERSHIP_FIELD: Record<EntityType, string> = {
  lead: "assigned_to",
  contact: "assigned_to",
  company: "assigned_to",
  opportunity: "owner_id",
};

/** Table name for each entity type */
export const ENTITY_TABLE: Record<EntityType, string> = {
  lead: "leads",
  contact: "contacts",
  company: "companies",
  opportunity: "opportunities",
};

/**
 * Resolve the ownership status of a single entity.
 */
export function resolveOwnership(
  ownerFieldValue: string | null | undefined,
  activeMemberIds: Set<string>
): ResolvedOwnership {
  if (!ownerFieldValue || ownerFieldValue.trim() === "") {
    return { ownerId: null, status: "unassigned" };
  }
  if (activeMemberIds.has(ownerFieldValue)) {
    return { ownerId: ownerFieldValue, status: "assigned" };
  }
  return { ownerId: ownerFieldValue, status: "orphan" };
}

/**
 * Returns true if the value represents "no owner".
 */
export function isUnassigned(value: string | null | undefined): boolean {
  return !value || value.trim() === "";
}

/**
 * Supabase OR filter string for unassigned entities.
 */
export function unassignedFilter(entityType: EntityType): string {
  const field = OWNERSHIP_FIELD[entityType];
  return `${field}.is.null,${field}.eq.`;
}
