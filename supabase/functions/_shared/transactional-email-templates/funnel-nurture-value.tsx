import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "fastcrm"

interface FunnelNurtureValueProps {
  name?: string
  funnelName?: string
}

const FunnelNurtureValueEmail = ({ name, funnelName }: FunnelNurtureValueProps) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>Descubra como o {SITE_NAME} pode transformar os seus resultados</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>💡 O valor que podemos trazer ao seu negócio</Heading>
        </Section>
        <Section style={content}>
          <Text style={greeting}>
            {name ? `Olá ${name}!` : 'Olá!'}
          </Text>
          <Text style={text}>
            Registou-se recentemente{funnelName ? ` em <strong>${funnelName}</strong>` : ''} e gostaríamos de partilhar como o {SITE_NAME} pode fazer a diferença no seu dia-a-dia.
          </Text>

          <Section style={benefitBox}>
            <Text style={benefitTitle}>🚀 Automatize o seu pipeline de vendas</Text>
            <Text style={benefitText}>
              Reduza tarefas manuais e foque-se no que realmente importa — fechar negócios. O nosso CRM inteligente organiza leads, follow-ups e propostas automaticamente.
            </Text>
          </Section>

          <Section style={benefitBox}>
            <Text style={benefitTitle}>📊 Insights acionáveis em tempo real</Text>
            <Text style={benefitText}>
              Dashboards personalizados com métricas que importam. Saiba exatamente onde está cada oportunidade e que ações tomar.
            </Text>
          </Section>

          <Section style={benefitBox}>
            <Text style={benefitTitle}>🤖 IA ao serviço das suas vendas</Text>
            <Text style={benefitText}>
              Análise automática de contas, geração de emails e sugestões inteligentes para cada interação com os seus clientes.
            </Text>
          </Section>

          <Text style={text}>
            Quer ver isto em ação? Agende uma breve demonstração connosco — leva apenas 15 minutos.
          </Text>

          <Section style={{ textAlign: 'center' as const }}>
            <Button style={ctaBtn} href="https://fastcrm.lovable.app">
              Agendar Demonstração
            </Button>
          </Section>

          <Hr style={hr} />
          <Text style={footer}>Equipa {SITE_NAME}</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: FunnelNurtureValueEmail,
  subject: 'Descubra como podemos transformar os seus resultados',
  displayName: 'Nurture — Valor e caso de uso (Dia 2)',
  previewData: {
    name: 'Maria Silva',
    funnelName: 'Webinar de Vendas 2026',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }
const container = { maxWidth: '600px', margin: '0 auto' }
const header = { backgroundColor: '#1a1a2e', padding: '32px 40px 20px', borderRadius: '12px 12px 0 0', textAlign: 'center' as const }
const h1 = { margin: '0', color: '#b8860b', fontSize: '22px', fontWeight: '700' as const }
const content = { padding: '32px 40px' }
const greeting = { fontSize: '20px', fontWeight: '600' as const, color: '#18181b', margin: '0 0 16px' }
const text = { fontSize: '16px', color: '#52525b', lineHeight: '1.6', margin: '0 0 24px' }
const benefitBox = { backgroundColor: '#faf5e4', borderLeft: '4px solid #b8860b', padding: '16px 20px', margin: '0 0 16px', borderRadius: '0 8px 8px 0' }
const benefitTitle = { fontSize: '16px', fontWeight: '700' as const, color: '#18181b', margin: '0 0 8px' }
const benefitText = { fontSize: '14px', color: '#52525b', lineHeight: '1.5', margin: '0' }
const ctaBtn = { display: 'inline-block', padding: '14px 36px', backgroundColor: '#b8860b', color: '#ffffff', textDecoration: 'none', fontSize: '16px', fontWeight: '600' as const, borderRadius: '8px' }
const hr = { borderColor: '#e4e4e7', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#a1a1aa', textAlign: 'center' as const }
