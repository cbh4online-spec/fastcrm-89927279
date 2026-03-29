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

export const TEMPLATES: Record<string, TemplateEntry> = {
  'event-invitation': eventInvitation,
  'event-confirmation': eventConfirmation,
  'event-reminder': eventReminder,
  'funnel-registration-thanks': funnelRegistrationThanks,
  'funnel-meeting-trial-invite': funnelMeetingTrialInvite,
}
