/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>Redefinir palavra-passe — {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://xqepxufdrsuxlnubuatz.supabase.co/storage/v1/object/public/email-assets/logo.svg"
          width="36"
          height="36"
          alt="FastCRM OS"
          style={logo}
        />
        <Heading style={h1}>Redefinir palavra-passe</Heading>
        <Text style={text}>
          Recebemos um pedido para redefinir a sua palavra-passe no {siteName}.
          Clique no botão abaixo para escolher uma nova palavra-passe.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Redefinir Palavra-passe
        </Button>
        <Text style={footer}>
          Se não solicitou esta alteração, pode ignorar este email. A sua
          palavra-passe não será alterada.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '32px 28px' }
const logo = { marginBottom: '24px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#0F172A',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#6B7280',
  lineHeight: '1.6',
  margin: '0 0 24px',
}
const button = {
  backgroundColor: '#C28816',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600' as const,
  borderRadius: '8px',
  padding: '12px 24px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#9CA3AF', margin: '32px 0 0' }
