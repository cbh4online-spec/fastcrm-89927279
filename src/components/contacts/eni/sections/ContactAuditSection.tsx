import { EntityAuditSection } from "@/components/leads/sections/LeadAuditSection";

/** Shared audit trail (activity_logs): every create/update/delete with user and before/after values. */
export function ContactAuditSection({ contactId }: { contactId: string }) {
  return <EntityAuditSection table="contacts" recordId={contactId} />;
}
