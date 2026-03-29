import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "fastcrm"

interface FunnelNurtureSocialProofProps {
  name?: string
  funnelName?: string
}

const FunnelNurtureSocialProofEmail = ({ name, funnelName }: FunnelNurtureSocialProofProps) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>Veja os resultados que empresas como a sua estão a alcançar</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>⭐ Resultados reais de empresas reais</Heading>
        </Section>
        <Section style={content}>
          <Text style={greeting}>
            {name ? `Olá ${name}!` : 'Olá!'}
          </Text>
          <Text style={text}>
            Desde o seu registo{funnelName ? ` em <strong>${funnelName}</strong>` : ''}, muita coisa aconteceu na nossa comunidade. Eis o que empresas como a sua estão a conseguir:
          </Text>

          <Section style={testimonialBox}>
            <Text style={testimonialQuote}>
              "O {SITE_NAME} reduziu o nosso tempo de prospeção em 60%. A análise automática de contas dá-nos insights que antes levavam horas a compilar."
            </Text>
            <Text style={testimonialAuthor}>— Diretor Comercial, empresa de tecnologia</Text>
          </Section>

          <Section style={testimonialBox}>
            <Text style={testimonialQuote}>
              "Desde que começámos a usar a plataforma, a taxa de conversão de leads para reuniões subiu 40%. O follow-up automatizado faz toda a diferença."
            </Text>
            <Text style={testimonialAuthor}>— Gestor de Vendas, consultora de gestão</Text>
          </Section>

          <Section style={statsRow}>
            <Section style={statBox}>
              <Text style={statValue}>+40%</Text>
              <Text style={statLabel}>Conversão de leads</Text>
            </Section>
            <Section style={statBox}>
              <Text style={statValue}>-60%</Text>
              <Text style={statLabel}>Tempo de prospeção</Text>
            </Section>
            <Section style={statBox}>
              <Text style={statValue}>3x</Text>
              <Text style={statLabel}>Mais produtividade</Text>
            </Section>
          </Section>

          <Text style={text}>
            Junte-se a estas empresas. Experimente gratuitamente e veja os resultados por si.
          </Text>

          <Section style={{ textAlign: 'center' as const }}>
            <Button style={ctaBtn} href="https://fastcrm.lovable.app">
              Começar Trial Gratuito
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
  component: FunnelNurtureSocialProofEmail,
  subject: 'Veja os resultados que empresas como a sua estão a alcançar',
  displayName: 'Nurture — Prova social (Dia 4)',
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
const testimonialBox = { backgroundColor: '#f8f8f8', borderLeft: '4px solid #b8860b', padding: '20px 24px', margin: '0 0 16px', borderRadius: '0 8px 8px 0' }
const testimonialQuote = { fontSize: '15px', color: '#18181b', lineHeight: '1.6', margin: '0 0 8px', fontStyle: 'italic' as const }
const testimonialAuthor = { fontSize: '13px', color: '#71717a', margin: '0', fontWeight: '600' as const }
const statsRow = { display: 'flex' as const, justifyContent: 'space-between' as const, margin: '24px 0', textAlign: 'center' as const }
const statBox = { display: 'inline-block' as const, width: '30%', textAlign: 'center' as const }
const statValue = { fontSize: '28px', fontWeight: '800' as const, color: '#b8860b', margin: '0 0 4px' }
const statLabel = { fontSize: '12px', color: '#71717a', margin: '0', textTransform: 'uppercase' as const }
const ctaBtn = { display: 'inline-block', padding: '14px 36px', backgroundColor: '#b8860b', color: '#ffffff', textDecoration: 'none', fontSize: '16px', fontWeight: '600' as const, borderRadius: '8px' }
const hr = { borderColor: '#e4e4e7', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#a1a1aa', textAlign: 'center' as const }
