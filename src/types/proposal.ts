export type ProposalStatus = 'draft' | 'published' | 'accepted' | 'expired' | 'rejected';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ContentBlock {
  id: string;
  type: 'text' | 'image' | 'offer' | 'testimonials' | 'faq' | 'divider' | 'cta';
  content: Record<string, unknown>;
  order: number;
}

export interface ProposalTemplate {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  content_blocks: ContentBlock[];
  styles: Record<string, unknown>;
  cta_text: string;
  cta_color: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Proposal {
  id: string;
  workspace_id: string;
  opportunity_id: string;
  template_id: string | null;
  slug: string;
  title: string;
  content_blocks: ContentBlock[];
  variables: Record<string, string>;
  styles: Record<string, unknown>;
  cta_text: string;
  cta_color: string;
  price: number | null;
  currency: string;
  stripe_price_id: string | null;
  status: ProposalStatus;
  published_at: string | null;
  expires_at: string | null;
  accepted_at: string | null;
  payment_status: PaymentStatus | null;
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  views_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Client fields
  contact_id: string | null;
  company_id: string | null;
  // Conditions fields
  payment_conditions: string | null;
  validity_days: number | null;
  notes: string | null;
  billing_address: string | null;
  billing_nif: string | null;
  // Account manager
  assigned_to: string | null;
  assigned_to_profile?: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
  opportunity?: {
    id: string;
    title: string;
    value: number | null;
    lead?: {
      id: string;
      name: string;
      email: string | null;
    } | null;
  };
  contact?: {
    id: string;
    name: string;
    email: string | null;
    tax_id: string | null;
    address: string | null;
  } | null;
  company?: {
    id: string;
    name: string;
    email: string | null;
    tax_id: string | null;
    address: string | null;
  } | null;
}

export interface ProposalVersion {
  id: string;
  proposal_id: string;
  version: number;
  content_blocks: ContentBlock[];
  variables: Record<string, string>;
  change_summary: string | null;
  created_by: string | null;
  created_at: string;
}

export interface ProposalActivityLog {
  id: string;
  proposal_id: string;
  workspace_id: string;
  action: string;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface CreateProposalInput {
  opportunity_id: string;
  template_id?: string;
  title: string;
  content_blocks: ContentBlock[];
  variables?: Record<string, string>;
  styles?: Record<string, unknown>;
  cta_text?: string;
  cta_color?: string;
  price?: number;
  currency?: string;
  expires_at?: string;
}

export interface UpdateProposalInput {
  title?: string;
  content_blocks?: ContentBlock[];
  variables?: Record<string, string>;
  styles?: Record<string, unknown>;
  cta_text?: string;
  cta_color?: string;
  price?: number;
  currency?: string;
  expires_at?: string;
  status?: ProposalStatus;
  // Client fields
  contact_id?: string | null;
  company_id?: string | null;
  // Conditions fields
  payment_conditions?: string;
  validity_days?: number;
  notes?: string;
  billing_address?: string;
  billing_nif?: string;
  // Account manager
  assigned_to?: string | null;
}

export interface CreateProposalTemplateInput {
  name: string;
  description?: string;
  content_blocks: ContentBlock[];
  styles?: Record<string, unknown>;
  cta_text?: string;
  cta_color?: string;
}
