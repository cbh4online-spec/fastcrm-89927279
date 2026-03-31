import type { MarketingCampaign } from '@/types/marketing';

export type PreflightSeverity = 'error' | 'warning';

export interface PreflightCheck {
  id: string;
  label: string;
  severity: PreflightSeverity;
  passed: boolean;
  detail?: string;
}

export interface PreflightResult {
  checks: PreflightCheck[];
  errors: PreflightCheck[];
  warnings: PreflightCheck[];
  score: number; // 0-100
  canSend: boolean;
}

export function runCampaignPreflight(campaign: MarketingCampaign): PreflightResult {
  const checks: PreflightCheck[] = [];

  // --- ERRORS (bloqueantes) ---

  checks.push({
    id: 'subject',
    label: 'Assunto definido',
    severity: 'error',
    passed: !!campaign.subject?.trim(),
    detail: !campaign.subject?.trim() ? 'O assunto é obrigatório' : undefined,
  });

  checks.push({
    id: 'from_name',
    label: 'Nome do remetente definido',
    severity: 'error',
    passed: !!campaign.fromName?.trim(),
    detail: !campaign.fromName?.trim() ? 'O nome do remetente é obrigatório' : undefined,
  });

  checks.push({
    id: 'body_html',
    label: 'Conteúdo HTML existe',
    severity: 'error',
    passed: !!campaign.bodyHtml?.trim(),
    detail: !campaign.bodyHtml?.trim() ? 'O corpo do email é obrigatório' : undefined,
  });

  const hasRecipients = campaign.totalRecipients > 0;
  checks.push({
    id: 'recipients',
    label: 'Destinatários configurados',
    severity: 'error',
    passed: hasRecipients,
    detail: !hasRecipients ? 'A campanha não tem destinatários' : `${campaign.totalRecipients} destinatários`,
  });

  // Reply-to validation
  if (campaign.replyTo?.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validReply = emailRegex.test(campaign.replyTo);
    checks.push({
      id: 'reply_to',
      label: 'Reply-to válido',
      severity: 'error',
      passed: validReply,
      detail: !validReply ? 'O email de reply-to é inválido' : undefined,
    });
  }

  // Unsubscribe link
  const hasUnsubscribe = campaign.bodyHtml?.includes('unsubscribe') || 
    campaign.bodyHtml?.includes('{{unsubscribe}}') ||
    campaign.bodyHtml?.includes('cancelar subscrição');
  checks.push({
    id: 'unsubscribe',
    label: 'Link de cancelamento presente',
    severity: 'error',
    passed: !!hasUnsubscribe,
    detail: !hasUnsubscribe ? 'Adicione um link de cancelamento de subscrição' : undefined,
  });

  // --- WARNINGS (não bloqueantes) ---

  checks.push({
    id: 'preview_text',
    label: 'Preview text definido',
    severity: 'warning',
    passed: !!campaign.previewText?.trim(),
    detail: !campaign.previewText?.trim() ? 'Preview text melhora a taxa de abertura' : undefined,
  });

  checks.push({
    id: 'design_json',
    label: 'Layout estruturado (editor visual)',
    severity: 'warning',
    passed: !!campaign.designJson,
    detail: !campaign.designJson ? 'Campanha sem layout do editor visual — não é reabrível no builder' : undefined,
  });

  const validationRecent = campaign.validationRunAt
    ? (Date.now() - new Date(campaign.validationRunAt).getTime()) < 24 * 60 * 60 * 1000
    : false;
  checks.push({
    id: 'validation',
    label: 'Validação de lista recente',
    severity: 'warning',
    passed: validationRecent,
    detail: !validationRecent ? 'Valide a lista de destinatários antes de enviar' : undefined,
  });

  checks.push({
    id: 'test_sent',
    label: 'Teste enviado',
    severity: 'warning',
    passed: !!campaign.testSentAt,
    detail: !campaign.testSentAt ? 'Envie um email de teste antes de lançar' : undefined,
  });

  const errors = checks.filter(c => c.severity === 'error' && !c.passed);
  const warnings = checks.filter(c => c.severity === 'warning' && !c.passed);
  const passedCount = checks.filter(c => c.passed).length;
  const score = Math.round((passedCount / checks.length) * 100);

  return {
    checks,
    errors,
    warnings,
    score,
    canSend: errors.length === 0,
  };
}
