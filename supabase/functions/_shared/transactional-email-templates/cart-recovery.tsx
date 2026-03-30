import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = '{{ .SiteName }}'

interface CartRecoveryProps {
  bodyHtml?: string
  storeName?: string
  previewText?: string
}

const CartRecoveryEmail = ({ bodyHtml, storeName, previewText }: CartRecoveryProps) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>{previewText || `Recupere o seu carrinho — ${storeName || SITE_NAME}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>{storeName || SITE_NAME}</Heading>
        </Section>
        {bodyHtml ? (
          <Section dangerouslySetInnerHTML={{ __html: bodyHtml }} />
        ) : (
          <Text style={text}>Tem artigos à sua espera no carrinho.</Text>
        )}
        <Section style={footerSection}>
          <Text style={footer}>
            {storeName || SITE_NAME}
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: CartRecoveryEmail,
  subject: (data: Record<string, any>) => data?.subject || 'Tem artigos à sua espera',
  displayName: 'Recuperação de carrinho',
  previewData: {
    bodyHtml: '<p>Olá <strong>Cliente</strong>, o seu carrinho de <strong>€49.90</strong> ainda está disponível.</p>',
    storeName: 'Loja Demo',
    previewText: 'O seu carrinho ainda está à sua espera',
    subject: 'Esqueceu-se de algo?',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '0', maxWidth: '600px', margin: '0 auto' }
const header = { padding: '24px 25px 16px', borderBottom: '1px solid #e5e7eb' }
const h1 = { fontSize: '18px', fontWeight: '700' as const, color: '#1a1a2e', margin: '0' }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.5', margin: '0 0 25px' }
const footerSection = { padding: '20px 25px', borderTop: '1px solid #e5e7eb', marginTop: '24px' }
const footer = { fontSize: '12px', color: '#999999', margin: '0', textAlign: 'center' as const }
