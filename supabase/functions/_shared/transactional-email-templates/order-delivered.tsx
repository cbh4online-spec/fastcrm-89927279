import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = '{{ .SiteName }}'

interface OrderDeliveredProps {
  customerName?: string
  orderNumber?: string
}

const OrderDeliveredEmail = ({ customerName, orderNumber }: OrderDeliveredProps) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>A sua encomenda{orderNumber ? ` #${orderNumber}` : ''} foi entregue!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>{SITE_NAME}</Heading>
        </Section>
        <Heading style={h2}>
          {customerName ? `${customerName}, a sua encomenda chegou!` : 'A sua encomenda chegou!'}
        </Heading>
        <Text style={text}>
          Confirmamos que a encomenda{orderNumber ? ` #${orderNumber}` : ''} foi entregue com sucesso.
        </Text>
        <Section style={successBox}>
          <Text style={successEmoji}>✓</Text>
          <Text style={successText}>Entrega concluída</Text>
        </Section>
        <Text style={text}>
          Esperamos que esteja satisfeito(a) com a sua compra. Se tiver alguma questão ou precisar de ajuda, não hesite em contactar-nos.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>Obrigado por comprar connosco!</Text>
        <Text style={footerBrand}>— Equipa {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: OrderDeliveredEmail,
  subject: (data: Record<string, any>) =>
    data.orderNumber
      ? `Encomenda #${data.orderNumber} entregue — ${SITE_NAME}`
      : `A sua encomenda foi entregue — ${SITE_NAME}`,
  displayName: 'Encomenda entregue',
  previewData: { customerName: 'Maria', orderNumber: '1042' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '520px', margin: '0 auto' }
const header = { textAlign: 'center' as const, paddingBottom: '16px' }
const h1 = { fontSize: '20px', fontWeight: '700' as const, color: '#b5891a', margin: '0' }
const h2 = { fontSize: '18px', fontWeight: '600' as const, color: '#1a1a2e', margin: '0 0 12px' }
const text = { fontSize: '14px', color: '#4a4a5a', lineHeight: '1.6', margin: '0 0 16px' }
const successBox = { background: '#f0faf0', borderRadius: '8px', padding: '20px', marginBottom: '16px', textAlign: 'center' as const, border: '1px solid #c8e6c8' }
const successEmoji = { fontSize: '32px', color: '#2e7d32', margin: '0 0 4px', fontWeight: '700' as const }
const successText = { fontSize: '16px', fontWeight: '600' as const, color: '#2e7d32', margin: '0' }
const hr = { borderColor: '#e8e8ed', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#999', margin: '0 0 4px' }
const footerBrand = { fontSize: '12px', color: '#b5891a', margin: '0' }
