import { EntityAuditSection } from "@/components/leads/sections/LeadAuditSection";

/** Shared audit trail (activity_logs): every create/update/delete with user and before/after values. */
export function CompanyAuditSection({ companyId }: { companyId: string }) {
  return <EntityAuditSection table="companies" recordId={companyId} />;
}
