import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "fastcrm"

interface EventInvitationProps {
  name?: string
  eventTitle?: string
  eventDate?: string
  eventLocation?: string
  eventLink?: string
  confirmUrl?: string
  declineUrl?: string
  eventUrl?: string
}

const EventInvitationEmail = ({
  name,
  eventTitle = 'Evento',
  eventDate,
  eventLocation,
  eventLink,
  confirmUrl,
  declineUrl,
  eventUrl,
}: EventInvitationProps) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>Convite: {eventTitle}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>📅 Convite para Evento</Heading>
          <Text style={headerSub}>{eventTitle}</Text>
        </Section>
        <Section style={content}>
          <Text style={greeting}>
            {name ? `Olá ${name}!` : 'Olá!'}
          </Text>
          <Text style={text}>
            Foi convidado(a) para o evento <strong>{eventTitle}</strong>. Aqui estão os detalhes:
          </Text>
          <Section style={detailsBox}>
            <Text style={detailRow}>📅 <strong>Data e hora:</strong> {eventDate || 'A definir'}</Text>
            {eventLocation && (
              <Text style={detailRow}>📍 <strong>Local:</strong> {eventLocation}</Text>
            )}
            {eventLink && (
              <Text style={detailRow}>🔗 <strong>Link:</strong> {eventLink}</Text>
            )}
          </Section>
          {confirmUrl && declineUrl && (
            <Section style={buttonRow}>
              <Button style={confirmBtn} href={confirmUrl}>
                ✅ Confirmar Presença
              </Button>
              <Button style={declineBtn} href={declineUrl}>
                ❌ Recusar
              </Button>
            </Section>
          )}
          {eventUrl && (
            <Section style={{ textAlign: 'center' as const, marginTop: '16px' }}>
              <Button style={viewBtn} href={eventUrl}>
                Ver Evento
              </Button>
            </Section>
          )}
          <Hr style={hr} />
          <Text style={footer}>
            Se não esperava este convite, pode ignorar este email.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: EventInvitationEmail,
  subject: (data: Record<string, any>) => `Convite: ${data.eventTitle || 'Evento'}`,
  displayName: 'Convite para evento',
  previewData: {
    name: 'Maria Silva',
    eventTitle: 'Workshop de Vendas 2026',
    eventDate: 'sexta-feira, 4 de abril de 2026, 14:00',
    eventLocation: 'Escritório Central, Lisboa',
    confirmUrl: '#confirm',
    declineUrl: '#decline',
    eventUrl: '#event',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }
const container = { maxWidth: '600px', margin: '0 auto' }
const header = { backgroundColor: '#b8860b', padding: '32px 40px 20px', borderRadius: '12px 12px 0 0', textAlign: 'center' as const }
const h1 = { margin: '0', color: '#ffffff', fontSize: '24px', fontWeight: '700' as const }
const headerSub = { margin: '8px 0 0', color: 'rgba(255,255,255,0.9)', fontSize: '16px' }
const content = { padding: '32px 40px' }
const greeting = { fontSize: '20px', fontWeight: '600' as const, color: '#18181b', margin: '0 0 16px' }
const text = { fontSize: '16px', color: '#52525b', lineHeight: '1.6', margin: '0 0 24px' }
const detailsBox = { backgroundColor: '#f9fafb', borderRadius: '8px', padding: '16px', margin: '0 0 24px' }
const detailRow = { fontSize: '15px', color: '#18181b', margin: '8px 0' }
const buttonRow = { textAlign: 'center' as const, margin: '24px 0' }
const confirmBtn = { display: 'inline-block', padding: '14px 28px', backgroundColor: '#22c55e', color: '#ffffff', textDecoration: 'none', fontSize: '15px', fontWeight: '600' as const, borderRadius: '8px', marginRight: '12px' }
const declineBtn = { display: 'inline-block', padding: '14px 28px', backgroundColor: '#71717a', color: '#ffffff', textDecoration: 'none', fontSize: '15px', fontWeight: '600' as const, borderRadius: '8px' }
const viewBtn = { display: 'inline-block', padding: '14px 36px', backgroundColor: '#b8860b', color: '#ffffff', textDecoration: 'none', fontSize: '16px', fontWeight: '600' as const, borderRadius: '8px' }
const hr = { borderColor: '#e4e4e7', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#a1a1aa', textAlign: 'center' as const }
