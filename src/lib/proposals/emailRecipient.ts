import type { Proposal } from "@/types/proposal";

export type ProposalEmailRecipient = {
  email: string;
  name: string;
  entityType: "contact" | "company" | "lead";
  entityId: string;
};

/** Resolves who receives an in-platform email for a proposal (contact → company → lead). */
export function getProposalEmailRecipient(proposal: Proposal): ProposalEmailRecipient | null {
  const c = proposal.contact as any;
  const co = proposal.company as any;
  const l = proposal.opportunity?.lead as any;
  if (c?.email) return { email: c.email, name: c.name || c.email, entityType: "contact", entityId: c.id || "new" };
  if (co?.email) return { email: co.email, name: co.name || co.email, entityType: "company", entityId: co.id || "new" };
  if (l?.email) return { email: l.email, name: l.name || l.email, entityType: "lead", entityId: l.id || "new" };
  return null;
}
