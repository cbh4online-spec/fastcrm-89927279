import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text, Hr, Button,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = '{{ .SiteName }}'

interface OrderShippedProps {
  customerName?: string
  orderNumber?: string
  trackingNumber?: string
  trackingCarrier?: string
  trackingUrl?: string
  publicTrackingUrl?: string
}

const OrderShippedEmail = ({ customerName, orderNumber, trackingNumber, trackingCarrier, trackingUrl, publicTrackingUrl }: OrderShippedProps) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>A sua encomenda{orderNumber ? ` #${orderNumber}` : ''} foi enviada!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>{SITE_NAME}</Heading>
        </Section>
        <Heading style={h2}>
          {customerName ? `${customerName}, a sua encomenda foi enviada!` : 'A sua encomenda foi enviada!'}
        </Heading>
        <Text style={text}>
          A encomenda{orderNumber ? ` #${orderNumber}` : ''} está a caminho.
          {trackingCarrier ? ` Transportadora: ${trackingCarrier}.` : ''}
        </Text>
        {trackingNumber && (
          <Section style={trackingBox}>
            <Text style={trackingLabel}>Número de tracking</Text>
            <Text style={trackingValue}>{trackingNumber}</Text>
          </Section>
        )}
        {(trackingUrl || publicTrackingUrl) && (
          <Section style={{ textAlign: 'center' as const, margin: '20px 0' }}>
            {trackingUrl && (
              <Button href={trackingUrl} style={button}>
                Rastrear na Transportadora
              </Button>
            )}
            {publicTrackingUrl && (
              <>
                <Text style={orText}>ou</Text>
                <Button href={publicTrackingUrl} style={buttonOutline}>
                  Ver Estado da Encomenda
                </Button>
              </>
            )}
          </Section>
        )}
        <Hr style={hr} />
        <Text style={footer}>Obrigado pela sua compra!</Text>
        <Text style={footerBrand}>— Equipa {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: OrderShippedEmail,
  subject: (data: Record<string, any>) =>
    data.orderNumber
      ? `Encomenda #${data.orderNumber} enviada — ${SITE_NAME}`
      : `A sua encomenda foi enviada — ${SITE_NAME}`,
  displayName: 'Encomenda enviada',
  previewData: { customerName: 'Maria', orderNumber: '1042', trackingNumber: 'CT123456789PT', trackingCarrier: 'CTT', trackingUrl: 'https://www.ctt.pt' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '520px', margin: '0 auto' }
const header = { textAlign: 'center' as const, paddingBottom: '16px' }
const h1 = { fontSize: '20px', fontWeight: '700' as const, color: '#b5891a', margin: '0' }
const h2 = { fontSize: '18px', fontWeight: '600' as const, color: '#1a1a2e', margin: '0 0 12px' }
const text = { fontSize: '14px', color: '#4a4a5a', lineHeight: '1.6', margin: '0 0 16px' }
const trackingBox = { background: '#f0f7ff', borderRadius: '8px', padding: '16px', marginBottom: '16px', textAlign: 'center' as const, border: '1px solid #d0e3f7' }
const trackingLabel = { fontSize: '12px', color: '#5a7a9a', margin: '0 0 4px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }
const trackingValue = { fontSize: '18px', fontWeight: '700' as const, color: '#1a3a5e', margin: '0', fontFamily: 'monospace' }
const button = { backgroundColor: '#b5891a', color: '#ffffff', padding: '12px 28px', borderRadius: '6px', fontSize: '14px', fontWeight: '600' as const, textDecoration: 'none' }
const buttonOutline = { backgroundColor: '#ffffff', color: '#b5891a', padding: '10px 24px', borderRadius: '6px', fontSize: '13px', fontWeight: '600' as const, textDecoration: 'none', border: '1.5px solid #b5891a' }
const orText = { fontSize: '12px', color: '#999', margin: '8px 0', textAlign: 'center' as const }
const hr = { borderColor: '#e8e8ed', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#999', margin: '0 0 4px' }
const footerBrand = { fontSize: '12px', color: '#b5891a', margin: '0' }
