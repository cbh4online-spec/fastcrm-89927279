import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text, Hr, Button,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = '{{ .SiteName }}'

interface PartnerOrderDecisionProps {
  partnerName?: string
  orderNumber?: string
  decision?: 'approved' | 'rejected' | 'reopened' | 'cancelled'
  reason?: string
  total?: string
  orderUrl?: string
}

const DECISION_COPY: Record<string, { title: string; lead: string; tone: string }> = {
  approved:  { title: 'Encomenda aprovada', lead: 'foi aprovada e entrou em processamento.', tone: '#16a34a' },
  rejected:  { title: 'Encomenda rejeitada', lead: 'não foi aprovada.', tone: '#dc2626' },
  reopened:  { title: 'Encomenda reaberta', lead: 'foi reaberta e está novamente em análise.', tone: '#2563eb' },
  cancelled: { title: 'Encomenda cancelada', lead: 'foi cancelada.', tone: '#6b7280' },
}

const PartnerOrderDecisionEmail = ({
  partnerName, orderNumber, decision = 'approved', reason, total, orderUrl,
}: PartnerOrderDecisionProps) => {
  const copy = DECISION_COPY[decision] ?? DECISION_COPY.approved
  return (
    <Html lang="pt" dir="ltr">
      <Head />
      <Preview>{copy.title}{orderNumber ? ` — #${orderNumber}` : ''}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>{SITE_NAME}</Heading>
          </Section>
          <Heading style={{ ...h2, color: copy.tone }}>{copy.title}</Heading>
          <Text style={text}>
            {partnerName ? `Olá ${partnerName},` : 'Olá,'}
          </Text>
          <Text style={text}>
            A sua encomenda{orderNumber ? <strong> #{orderNumber}</strong> : ''} {copy.lead}
          </Text>
          {total && (
            <Section style={summaryBox}>
              <Text style={summaryLabel}>Total</Text>
              <Text style={summaryValue}>{total}</Text>
            </Section>
          )}
          {reason && (
            <Section style={reasonBox}>
              <Text style={reasonLabel}>Motivo</Text>
              <Text style={reasonText}>{reason}</Text>
            </Section>
          )}
          {orderUrl && (
            <Section style={{ textAlign: 'center' as const, margin: '24px 0' }}>
              <Button href={orderUrl} style={button}>Ver encomenda</Button>
            </Section>
          )}
          <Hr style={hr} />
          <Text style={footer}>
            Em caso de dúvidas, responda diretamente a este email.
          </Text>
          <Text style={footerBrand}>— Equipa {SITE_NAME}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: PartnerOrderDecisionEmail,
  subject: (data: Record<string, any>) => {
    const map: Record<string, string> = {
      approved: 'Encomenda aprovada',
      rejected: 'Encomenda rejeitada',
      reopened: 'Encomenda reaberta',
      cancelled: 'Encomenda cancelada',
    }
    const base = map[data?.decision] ?? 'Atualização da sua encomenda'
    return data?.orderNumber ? `${base} — #${data.orderNumber}` : base
  },
  displayName: 'B2B — Decisão de encomenda',
  previewData: {
    partnerName: 'Acme Lda',
    orderNumber: 'B2B-00123',
    decision: 'approved',
    total: '€ 1.240,00',
    orderUrl: 'https://example.com/dashboard/b2b/orders/123',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '560px', margin: '0 auto' }
const header = { borderBottom: '1px solid #e5e7eb', paddingBottom: '12px', marginBottom: '20px' }
const h1 = { fontSize: '20px', fontWeight: 'bold', color: '#111827', margin: 0 }
const h2 = { fontSize: '22px', fontWeight: 'bold', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: '0 0 12px' }
const summaryBox = { backgroundColor: '#f9fafb', borderRadius: '8px', padding: '16px', margin: '16px 0' }
const summaryLabel = { fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' as const, margin: 0 }
const summaryValue = { fontSize: '20px', fontWeight: 'bold', color: '#111827', margin: '4px 0 0' }
const reasonBox = { borderLeft: '3px solid #dc2626', backgroundColor: '#fef2f2', padding: '12px 16px', margin: '16px 0' }
const reasonLabel = { fontSize: '12px', color: '#991b1b', fontWeight: 'bold', margin: 0 }
const reasonText = { fontSize: '14px', color: '#374151', margin: '4px 0 0' }
const button = {
  backgroundColor: '#111827', color: '#ffffff', padding: '12px 24px',
  borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: 'bold',
}
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#6b7280', margin: '0 0 4px' }
const footerBrand = { fontSize: '12px', color: '#9ca3af', margin: 0 }
