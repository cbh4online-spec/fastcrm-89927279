import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text, Hr, Button,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = '{{ .SiteName }}'

interface OrderConfirmationProps {
  customerName?: string
  orderNumber?: string
  total?: string
  itemsSummary?: string
  trackingUrl?: string
}

const OrderConfirmationEmail = ({ customerName, orderNumber, total, itemsSummary, trackingUrl }: OrderConfirmationProps) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>A sua encomenda {orderNumber ? `#${orderNumber}` : ''} foi confirmada — {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>{SITE_NAME}</Heading>
        </Section>
        <Heading style={h2}>
          {customerName ? `Olá ${customerName},` : 'Olá,'}
        </Heading>
        <Text style={text}>
          A sua encomenda{orderNumber ? ` #${orderNumber}` : ''} foi recebida com sucesso e o pagamento confirmado!
        </Text>
        {total && (
          <Section style={summaryBox}>
            <Text style={summaryLabel}>Total pago</Text>
            <Text style={summaryValue}>{total}</Text>
          </Section>
        )}
        {itemsSummary && (
          <Text style={textSmall}>{itemsSummary}</Text>
        )}
        {trackingUrl && (
          <Section style={{ textAlign: 'center' as const, margin: '24px 0' }}>
            <Button href={trackingUrl} style={button}>
              Acompanhar Encomenda
            </Button>
          </Section>
        )}
        <Hr style={hr} />
        <Text style={footer}>
          Obrigado pela sua compra. Se tiver dúvidas, responda a este email.
        </Text>
        <Text style={footerBrand}>— Equipa {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: OrderConfirmationEmail,
  subject: (data: Record<string, any>) =>
    data.orderNumber
      ? `Encomenda #${data.orderNumber} confirmada — ${SITE_NAME}`
      : `A sua encomenda foi confirmada — ${SITE_NAME}`,
  displayName: 'Confirmação de encomenda',
  previewData: { customerName: 'Maria', orderNumber: '1042', total: '€49,90', itemsSummary: '2× Camisola Azul, 1× Calças Pretas' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '520px', margin: '0 auto' }
const header = { textAlign: 'center' as const, paddingBottom: '16px' }
const h1 = { fontSize: '20px', fontWeight: '700' as const, color: '#b5891a', margin: '0' }
const h2 = { fontSize: '18px', fontWeight: '600' as const, color: '#1a1a2e', margin: '0 0 12px' }
const text = { fontSize: '14px', color: '#4a4a5a', lineHeight: '1.6', margin: '0 0 16px' }
const textSmall = { fontSize: '13px', color: '#6b6b7b', lineHeight: '1.5', margin: '0 0 16px' }
const summaryBox = { background: '#f8f6f1', borderRadius: '8px', padding: '16px', marginBottom: '16px', textAlign: 'center' as const }
const summaryLabel = { fontSize: '12px', color: '#8a8a9a', margin: '0 0 4px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }
const summaryValue = { fontSize: '24px', fontWeight: '700' as const, color: '#b5891a', margin: '0' }
const button = { backgroundColor: '#b5891a', color: '#ffffff', padding: '12px 28px', borderRadius: '6px', fontSize: '14px', fontWeight: '600' as const, textDecoration: 'none' }
const hr = { borderColor: '#e8e8ed', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#999', margin: '0 0 4px' }
const footerBrand = { fontSize: '12px', color: '#b5891a', margin: '0' }
