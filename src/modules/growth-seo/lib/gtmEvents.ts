/**
 * GTM Custom Events for Conversion Tracking
 * 
 * These events are pushed to the dataLayer and can be captured in GTM
 * to configure tags for Google Ads, Meta Pixel, etc.
 */

// Extend Window for dataLayer typing
declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
  }
}

interface LeadCreatedData {
  lead_id: string;
  lead_name?: string;
  lead_email?: string;
  lead_source?: string;
  workspace_id?: string;
}

interface OpportunityWonData {
  opportunity_id: string;
  opportunity_title?: string;
  value: number;
  currency?: string;
  lead_id?: string;
  workspace_id?: string;
}

interface ProposalAcceptedData {
  proposal_id: string;
  proposal_title?: string;
  value: number;
  currency?: string;
  opportunity_id?: string;
  workspace_id?: string;
}

interface PaymentReceivedData {
  invoice_id?: string;
  proposal_id?: string;
  value: number;
  currency?: string;
  payment_method?: string;
  customer_id?: string;
  workspace_id?: string;
}

/**
 * Push an event to GTM dataLayer
 */
function pushToDataLayer(eventName: string, eventData: Record<string, unknown>) {
  if (typeof window !== 'undefined' && window.dataLayer) {
    window.dataLayer.push({
      event: eventName,
      ...eventData,
      event_timestamp: new Date().toISOString(),
    });
    console.log(`[GTM Event] ${eventName}:`, eventData);
  }
}

/**
 * Track when a new lead is created
 * GTM Event Name: 'lead_created'
 */
export function trackLeadCreated(data: LeadCreatedData) {
  pushToDataLayer('lead_created', {
    lead_id: data.lead_id,
    lead_name: data.lead_name,
    lead_email: data.lead_email,
    lead_source: data.lead_source,
    workspace_id: data.workspace_id,
  });
}

/**
 * Track when an opportunity is won (closed-won)
 * GTM Event Name: 'opportunity_won'
 */
export function trackOpportunityWon(data: OpportunityWonData) {
  pushToDataLayer('opportunity_won', {
    opportunity_id: data.opportunity_id,
    opportunity_title: data.opportunity_title,
    value: data.value,
    currency: data.currency || 'EUR',
    lead_id: data.lead_id,
    workspace_id: data.workspace_id,
    // For Google Ads conversion value tracking
    transaction_id: data.opportunity_id,
    conversion_value: data.value,
  });
}

/**
 * Track when a proposal is accepted by the client
 * GTM Event Name: 'proposal_accepted'
 */
export function trackProposalAccepted(data: ProposalAcceptedData) {
  pushToDataLayer('proposal_accepted', {
    proposal_id: data.proposal_id,
    proposal_title: data.proposal_title,
    value: data.value,
    currency: data.currency || 'EUR',
    opportunity_id: data.opportunity_id,
    workspace_id: data.workspace_id,
    // For Google Ads conversion value tracking
    transaction_id: data.proposal_id,
    conversion_value: data.value,
  });
}

/**
 * Track when a payment is received (invoice paid or proposal checkout completed)
 * GTM Event Name: 'payment_received'
 * Also sends 'purchase' event for e-commerce tracking compatibility
 */
export function trackPaymentReceived(data: PaymentReceivedData) {
  const transactionId = data.invoice_id || data.proposal_id || `payment_${Date.now()}`;
  
  // Custom event for internal tracking
  pushToDataLayer('payment_received', {
    invoice_id: data.invoice_id,
    proposal_id: data.proposal_id,
    value: data.value,
    currency: data.currency || 'EUR',
    payment_method: data.payment_method,
    customer_id: data.customer_id,
    workspace_id: data.workspace_id,
    transaction_id: transactionId,
    conversion_value: data.value,
  });

  // Standard e-commerce 'purchase' event for Google Analytics 4
  pushToDataLayer('purchase', {
    transaction_id: transactionId,
    value: data.value,
    currency: data.currency || 'EUR',
    // E-commerce data
    ecommerce: {
      transaction_id: transactionId,
      value: data.value,
      currency: data.currency || 'EUR',
    },
  });
}

/**
 * Generic event tracker for custom events
 * Use this for any additional events not covered above
 */
export function trackCustomEvent(eventName: string, eventData: Record<string, unknown> = {}) {
  pushToDataLayer(eventName, eventData);
}
