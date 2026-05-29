import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = '{{ .SiteName }}'

interface StatementLine {
  type: 'invoice' | 'payment'
  date: string
  ref: string
  description: string
  debit?: string
  credit?: string
}

interface AccountStatementProps {
  customerName?: string
  customMessage?: string
  totalInvoiced?: string
  totalPaid?: string
  totalOutstanding?: string
  generatedAt?: string
  lines?: StatementLine[]
}

const AccountStatementEmail = ({
  customerName, customMessage, totalInvoiced, totalPaid, totalOutstanding, generatedAt, lines = [],
}: AccountStatementProps) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>Extrato de conta — {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>{SITE_NAME}</Heading>
          <Text style={meta}>Extrato de conta {generatedAt ? `· ${generatedAt}` : ''}</Text>
        </Section>

        <Heading style={h2}>{customerName ? `Olá ${customerName},` : 'Olá,'}</Heading>

        {customMessage ? (
          <Text style={text}>{customMessage}</Text>
        ) : (
          <Text style={text}>
            Enviamos em anexo o seu extrato de conta com a lista de faturas emitidas e pagamentos registados.
          </Text>
        )}

        <Section style={summaryBox}>
          <table style={summaryTable as React.CSSProperties}>
            <tbody>
              <tr>
                <td style={summaryLabel}>Total faturado</td>
                <td style={summaryValue}>{totalInvoiced ?? '—'}</td>
              </tr>
              <tr>
                <td style={summaryLabel}>Total pago</td>
                <td style={{ ...summaryValue, color: '#2f855a' }}>{totalPaid ?? '—'}</td>
              </tr>
              <tr>
                <td style={summaryLabelBold}>Saldo em dívida</td>
                <td style={{ ...summaryValueBold, color: '#b5891a' }}>{totalOutstanding ?? '—'}</td>
              </tr>
            </tbody>
          </table>
        </Section>

        {lines.length > 0 && (
          <Section>
            <table style={lineTable as React.CSSProperties}>
              <thead>
                <tr>
                  <th style={th}>Data</th>
                  <th style={th}>Documento</th>
                  <th style={thRight}>Débito</th>
                  <th style={thRight}>Crédito</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, idx) => (
                  <tr key={idx} style={l.type === 'payment' ? trPay : trInv}>
                    <td style={td}>{l.date}</td>
                    <td style={td}>
                      <div style={{ fontWeight: 600 }}>{l.ref}</div>
                      <div style={{ fontSize: 11, color: '#888' }}>{l.description}</div>
                    </td>
                    <td style={tdRight}>{l.debit ?? ''}</td>
                    <td style={{ ...tdRight, color: '#2f855a' }}>{l.credit ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        <Hr style={hr} />
        <Text style={footer}>
          Caso tenha alguma questão ou já tenha efetuado algum pagamento ainda não refletido, responda a este email.
        </Text>
        <Text style={footerBrand}>— Equipa {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AccountStatementEmail,
  subject: (data: Record<string, any>) =>
    `Extrato de conta${data.totalOutstanding ? ` · saldo em dívida ${data.totalOutstanding}` : ''} — ${SITE_NAME}`,
  displayName: 'Extrato de conta',
  previewData: {
    customerName: 'Maria Silva',
    totalInvoiced: '€2.450,00',
    totalPaid: '€1.200,00',
    totalOutstanding: '€1.250,00',
    generatedAt: '29/05/2026',
    lines: [
      { type: 'invoice', date: '01/03/2026', ref: 'FT 2026/0012', description: 'Venc. 31/03/2026', debit: '€1.230,00' },
      { type: 'payment', date: '15/03/2026', ref: 'Pagamento', description: 'Transferência', credit: '€1.200,00' },
      { type: 'invoice', date: '01/04/2026', ref: 'FT 2026/0021', description: 'Venc. 30/04/2026', debit: '€1.220,00' },
    ],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '640px', margin: '0 auto' }
const header = { textAlign: 'center' as const, paddingBottom: '12px', borderBottom: '1px solid #e8e8ed' }
const h1 = { fontSize: '20px', fontWeight: '700' as const, color: '#b5891a', margin: '0' }
const meta = { fontSize: '12px', color: '#888', margin: '4px 0 0' }
const h2 = { fontSize: '18px', fontWeight: '600' as const, color: '#1a1a2e', margin: '20px 0 12px' }
const text = { fontSize: '14px', color: '#4a4a5a', lineHeight: '1.6', margin: '0 0 16px', whiteSpace: 'pre-line' as const }
const summaryBox = { background: '#f8f6f1', borderRadius: '8px', padding: '16px', marginBottom: '20px' }
const summaryTable = { width: '100%', borderCollapse: 'collapse' as const }
const summaryLabel = { fontSize: '13px', color: '#666', padding: '4px 0' }
const summaryValue = { fontSize: '14px', textAlign: 'right' as const, padding: '4px 0', color: '#333' }
const summaryLabelBold = { ...summaryLabel, fontWeight: 700 as const, fontSize: '14px', paddingTop: '8px', borderTop: '1px solid #e8d9b0' }
const summaryValueBold = { ...summaryValue, fontWeight: 700 as const, fontSize: '16px', paddingTop: '8px', borderTop: '1px solid #e8d9b0' }
const lineTable = { width: '100%', borderCollapse: 'collapse' as const, fontSize: '12px' }
const th = { textAlign: 'left' as const, padding: '8px 6px', borderBottom: '2px solid #e8e8ed', color: '#888', fontWeight: 600 as const, fontSize: '11px', textTransform: 'uppercase' as const }
const thRight = { ...th, textAlign: 'right' as const }
const td = { padding: '8px 6px', borderBottom: '1px solid #f0f0f0', verticalAlign: 'top' as const }
const tdRight = { ...td, textAlign: 'right' as const, whiteSpace: 'nowrap' as const }
const trInv = {}
const trPay = { background: '#f6fbf8' }
const hr = { borderColor: '#e8e8ed', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#666', margin: '0 0 4px', lineHeight: '1.5' }
const footerBrand = { fontSize: '12px', color: '#999', margin: '0' }
