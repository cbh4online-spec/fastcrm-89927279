import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "fastcrm"

interface FunnelMeetingTrialInviteProps {
  name?: string
  funnelName?: string
  meetingUrl?: string
}

const FunnelMeetingTrialInviteEmail = ({
  name,
  funnelName,
  meetingUrl,
}: FunnelMeetingTrialInviteProps) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>Convidamo-lo para uma reunião e trial gratuito — {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>📅 Reunião + Trial Gratuito</Heading>
        </Section>
        <Section style={content}>
          <Text style={greeting}>
            {name ? `Olá ${name}!` : 'Olá!'}
          </Text>
          <Text style={text}>
            Obrigado pelo seu interesse{funnelName ? ` em <strong>${funnelName}</strong>` : ''}. Gostaríamos de o convidar para uma breve reunião onde poderá conhecer a nossa solução em detalhe e iniciar um período de trial gratuito.
          </Text>
          <Section style={benefitsBox}>
            <Text style={benefitsTitle}>✨ O que vai obter no trial:</Text>
            <Text style={benefitItem}>✅ Acesso completo à plataforma durante o período experimental</Text>
            <Text style={benefitItem}>✅ Acompanhamento personalizado pela nossa equipa</Text>
            <Text style={benefitItem}>✅ Configuração inicial assistida para o seu negócio</Text>
            <Text style={benefitItem}>✅ Sem compromisso — cancele a qualquer momento</Text>
          </Section>
          <Text style={text}>
            Agende uma breve reunião de 15 minutos connosco. Vamos mostrar-lhe como a nossa solução pode ajudar o seu negócio a crescer.
          </Text>
          <Section style={{ textAlign: 'center' as const }}>
            <Button style={ctaBtn} href={meetingUrl || 'https://fastcrm.lovable.app'}>
              Agendar Reunião
            </Button>
          </Section>
          <Text style={smallText}>
            Prefere outro horário? Responda a este email e combinamos a melhor data.
          </Text>
          <Hr style={hr} />
          <Text style={footer}>Equipa {SITE_NAME}</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: FunnelMeetingTrialInviteEmail,
  subject: 'Convidamo-lo para uma reunião e trial gratuito',
  displayName: 'Convite reunião e trial (Funil)',
  previewData: {
    name: 'Maria Silva',
    funnelName: 'Webinar de Vendas 2026',
    meetingUrl: '#meeting',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }
const container = { maxWidth: '600px', margin: '0 auto' }
const header = { backgroundColor: '#18181b', padding: '32px 40px 20px', borderRadius: '12px 12px 0 0', textAlign: 'center' as const }
const h1 = { margin: '0', color: '#b8860b', fontSize: '24px', fontWeight: '700' as const }
const content = { padding: '32px 40px' }
const greeting = { fontSize: '20px', fontWeight: '600' as const, color: '#18181b', margin: '0 0 16px' }
const text = { fontSize: '16px', color: '#52525b', lineHeight: '1.6', margin: '0 0 24px' }
const benefitsBox = { backgroundColor: '#fef9ee', border: '1px solid #f5d98a', borderRadius: '8px', padding: '20px', margin: '0 0 24px' }
const benefitsTitle = { fontSize: '16px', fontWeight: '700' as const, color: '#18181b', margin: '0 0 12px' }
const benefitItem = { fontSize: '15px', color: '#52525b', margin: '6px 0', lineHeight: '1.5' }
const ctaBtn = { display: 'inline-block', padding: '14px 36px', backgroundColor: '#b8860b', color: '#ffffff', textDecoration: 'none', fontSize: '16px', fontWeight: '600' as const, borderRadius: '8px' }
const smallText = { fontSize: '14px', color: '#71717a', textAlign: 'center' as const, margin: '16px 0 0' }
const hr = { borderColor: '#e4e4e7', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#a1a1aa', textAlign: 'center' as const }
