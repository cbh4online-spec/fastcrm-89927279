import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "fastcrm"

interface EventConfirmationProps {
  name?: string
  eventTitle?: string
  eventDate?: string
  eventLocation?: string
  eventUrl?: string
}

const EventConfirmationEmail = ({
  name,
  eventTitle = 'Evento',
  eventDate,
  eventLocation,
  eventUrl,
}: EventConfirmationProps) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>Presença confirmada — {eventTitle}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>✅ Presença Confirmada!</Heading>
        </Section>
        <Section style={content}>
          <Text style={greeting}>
            {name ? `Olá ${name}!` : 'Olá!'}
          </Text>
          <Text style={text}>
            A sua presença no evento <strong>{eventTitle}</strong> foi confirmada com sucesso.
          </Text>
          <Section style={detailsBox}>
            <Text style={detailRow}>📅 <strong>Data:</strong> {eventDate || 'A definir'}</Text>
            {eventLocation && (
              <Text style={detailRow}>📍 <strong>Local:</strong> {eventLocation}</Text>
            )}
          </Section>
          <Text style={text}>
            Esperamos por si! Caso precise de alterar a sua resposta, contacte o organizador.
          </Text>
          {eventUrl && (
            <Section style={{ textAlign: 'center' as const }}>
              <Button style={viewBtn} href={eventUrl}>
                Ver Detalhes do Evento
              </Button>
            </Section>
          )}
          <Hr style={hr} />
          <Text style={footer}>Equipa {SITE_NAME}</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: EventConfirmationEmail,
  subject: (data: Record<string, any>) => `Presença confirmada — ${data.eventTitle || 'Evento'}`,
  displayName: 'Confirmação de presença',
  previewData: {
    name: 'Maria Silva',
    eventTitle: 'Workshop de Vendas 2026',
    eventDate: 'sexta-feira, 4 de abril de 2026, 14:00',
    eventLocation: 'Escritório Central, Lisboa',
    eventUrl: '#event',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }
const container = { maxWidth: '600px', margin: '0 auto' }
const header = { backgroundColor: '#22c55e', padding: '32px 40px 20px', borderRadius: '12px 12px 0 0', textAlign: 'center' as const }
const h1 = { margin: '0', color: '#ffffff', fontSize: '24px', fontWeight: '700' as const }
const content = { padding: '32px 40px' }
const greeting = { fontSize: '20px', fontWeight: '600' as const, color: '#18181b', margin: '0 0 16px' }
const text = { fontSize: '16px', color: '#52525b', lineHeight: '1.6', margin: '0 0 24px' }
const detailsBox = { backgroundColor: '#f0fdf4', borderRadius: '8px', padding: '16px', margin: '0 0 24px' }
const detailRow = { fontSize: '15px', color: '#18181b', margin: '8px 0' }
const viewBtn = { display: 'inline-block', padding: '14px 36px', backgroundColor: '#b8860b', color: '#ffffff', textDecoration: 'none', fontSize: '16px', fontWeight: '600' as const, borderRadius: '8px' }
const hr = { borderColor: '#e4e4e7', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#a1a1aa', textAlign: 'center' as const }
