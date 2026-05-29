/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as eventInvitation } from './event-invitation.tsx'
import { template as eventConfirmation } from './event-confirmation.tsx'
import { template as eventReminder } from './event-reminder.tsx'
import { template as funnelRegistrationThanks } from './funnel-registration-thanks.tsx'
import { template as funnelMeetingTrialInvite } from './funnel-meeting-trial-invite.tsx'
import { template as funnelNurtureValue } from './funnel-nurture-value.tsx'
import { template as funnelNurtureSocialProof } from './funnel-nurture-social-proof.tsx'
import { template as funnelNurtureLastChance } from './funnel-nurture-last-chance.tsx'
import { template as cartRecovery } from './cart-recovery.tsx'
import { template as orderConfirmation } from './order-confirmation.tsx'
import { template as orderShipped } from './order-shipped.tsx'
import { template as orderDelivered } from './order-delivered.tsx'
import { template as partnerOrderDecision } from './partner-order-decision.tsx'
import { template as accountStatement } from './account-statement.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'event-invitation': eventInvitation,
  'event-confirmation': eventConfirmation,
  'event-reminder': eventReminder,
  'funnel-registration-thanks': funnelRegistrationThanks,
  'funnel-meeting-trial-invite': funnelMeetingTrialInvite,
  'funnel-nurture-value': funnelNurtureValue,
  'funnel-nurture-social-proof': funnelNurtureSocialProof,
  'funnel-nurture-last-chance': funnelNurtureLastChance,
  'cart-recovery': cartRecovery,
  'order-confirmation': orderConfirmation,
  'order-shipped': orderShipped,
  'order-delivered': orderDelivered,
  'partner-order-decision': partnerOrderDecision,
  'account-statement': accountStatement,
}
