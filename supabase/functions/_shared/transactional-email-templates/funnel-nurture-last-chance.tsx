import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "fastcrm"

interface FunnelNurtureLastChanceProps {
  name?: string
  funnelName?: string
}

const FunnelNurtureLastChanceEmail = ({ name, funnelName }: FunnelNurtureLastChanceProps) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>Última oportunidade — o seu trial gratuito expira em breve</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>⏰ Última oportunidade!</Heading>
        </Section>
        <Section style={content}>
          <Text style={greeting}>
            {name ? `Olá ${name}!` : 'Olá!'}
          </Text>
          <Text style={text}>
            Há uma semana registou-se{funnelName ? ` em <strong>${funnelName}</strong>` : ''} e queremos garantir que não perde esta oportunidade.
          </Text>

          <Section style={urgencyBox}>
            <Text style={urgencyTitle}>🎁 A sua oferta exclusiva</Text>
            <Text style={urgencyText}>
              Ative o seu <strong>trial gratuito de 14 dias</strong> agora e tenha acesso completo a todas as funcionalidades do {SITE_NAME}, sem compromisso.
            </Text>
          </Section>

          <Text style={text}>O que está incluído no trial:</Text>

          <Text style={checkItem}>✅ CRM completo com pipeline visual</Text>
          <Text style={checkItem}>✅ Análise inteligente de contas com IA</Text>
          <Text style={checkItem}>✅ Automações de follow-up</Text>
          <Text style={checkItem}>✅ Dashboard de métricas em tempo real</Text>
          <Text style={checkItem}>✅ Suporte dedicado durante o trial</Text>

          <Text style={text}>
            Não precisa de cartão de crédito. Basta clicar no botão abaixo e começar a explorar.
          </Text>

          <Section style={{ textAlign: 'center' as const }}>
            <Button style={ctaBtn} href="https://fastcrm.lovable.app">
              Ativar Trial Gratuito Agora
            </Button>
          </Section>

          <Text style={subtext}>
            Se já não tiver interesse, não se preocupe — este é o nosso último email sobre o assunto. Desejamos-lhe todo o sucesso! 🙌
          </Text>

          <Hr style={hr} />
          <Text style={footer}>Equipa {SITE_NAME}</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: FunnelNurtureLastChanceEmail,
  subject: 'Última oportunidade — ative o seu trial gratuito',
  displayName: 'Nurture — Última oportunidade (Dia 7)',
  previewData: {
    name: 'Maria Silva',
    funnelName: 'Webinar de Vendas 2026',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }
const container = { maxWidth: '600px', margin: '0 auto' }
const header = { backgroundColor: '#7f1d1d', padding: '32px 40px 20px', borderRadius: '12px 12px 0 0', textAlign: 'center' as const }
const h1 = { margin: '0', color: '#fbbf24', fontSize: '24px', fontWeight: '700' as const }
const content = { padding: '32px 40px' }
const greeting = { fontSize: '20px', fontWeight: '600' as const, color: '#18181b', margin: '0 0 16px' }
const text = { fontSize: '16px', color: '#52525b', lineHeight: '1.6', margin: '0 0 24px' }
const urgencyBox = { backgroundColor: '#fef3c7', border: '2px solid #f59e0b', padding: '20px 24px', margin: '0 0 24px', borderRadius: '8px', textAlign: 'center' as const }
const urgencyTitle = { fontSize: '18px', fontWeight: '700' as const, color: '#92400e', margin: '0 0 8px' }
const urgencyText = { fontSize: '15px', color: '#78350f', lineHeight: '1.5', margin: '0' }
const checkItem = { fontSize: '15px', color: '#18181b', margin: '0 0 8px', lineHeight: '1.4' }
const ctaBtn = { display: 'inline-block', padding: '16px 40px', backgroundColor: '#b8860b', color: '#ffffff', textDecoration: 'none', fontSize: '18px', fontWeight: '700' as const, borderRadius: '8px' }
const subtext = { fontSize: '13px', color: '#a1a1aa', lineHeight: '1.5', margin: '24px 0 0', textAlign: 'center' as const }
const hr = { borderColor: '#e4e4e7', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#a1a1aa', textAlign: 'center' as const }
