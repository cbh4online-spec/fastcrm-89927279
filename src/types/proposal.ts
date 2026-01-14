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
}

export interface CreateProposalTemplateInput {
  name: string;
  description?: string;
  content_blocks: ContentBlock[];
  styles?: Record<string, unknown>;
  cta_text?: string;
  cta_color?: string;
}
