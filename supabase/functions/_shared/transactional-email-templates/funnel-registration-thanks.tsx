import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "fastcrm"

interface FunnelRegistrationThanksProps {
  name?: string
  funnelName?: string
}

const FunnelRegistrationThanksEmail = ({
  name,
  funnelName,
}: FunnelRegistrationThanksProps) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>Obrigado pelo seu registo{funnelName ? ` — ${funnelName}` : ''}!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>🎉 Obrigado pelo seu registo!</Heading>
        </Section>
        <Section style={content}>
          <Text style={greeting}>
            {name ? `Olá ${name}!` : 'Olá!'}
          </Text>
          <Text style={text}>
            O seu registo{funnelName ? ` em <strong>${funnelName}</strong>` : ''} foi recebido com sucesso. Estamos muito contentes por tê-lo connosco!
          </Text>
          <Text style={text}>
            A nossa equipa está disponível para o ajudar em tudo o que precisar. Fique atento ao seu email — em breve receberá mais informações sobre os próximos passos.
          </Text>
          <Section style={{ textAlign: 'center' as const }}>
            <Button style={ctaBtn} href="https://fastcrm.lovable.app">
              Visitar o nosso site
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
  component: FunnelRegistrationThanksEmail,
  subject: 'Obrigado pelo seu registo!',
  displayName: 'Agradecimento de registo (Funil)',
  previewData: {
    name: 'Maria Silva',
    funnelName: 'Webinar de Vendas 2026',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }
const container = { maxWidth: '600px', margin: '0 auto' }
const header = { backgroundColor: '#b8860b', padding: '32px 40px 20px', borderRadius: '12px 12px 0 0', textAlign: 'center' as const }
const h1 = { margin: '0', color: '#ffffff', fontSize: '24px', fontWeight: '700' as const }
const content = { padding: '32px 40px' }
const greeting = { fontSize: '20px', fontWeight: '600' as const, color: '#18181b', margin: '0 0 16px' }
const text = { fontSize: '16px', color: '#52525b', lineHeight: '1.6', margin: '0 0 24px' }
const ctaBtn = { display: 'inline-block', padding: '14px 36px', backgroundColor: '#b8860b', color: '#ffffff', textDecoration: 'none', fontSize: '16px', fontWeight: '600' as const, borderRadius: '8px' }
const hr = { borderColor: '#e4e4e7', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#a1a1aa', textAlign: 'center' as const }
