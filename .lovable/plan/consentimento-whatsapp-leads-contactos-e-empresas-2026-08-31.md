# Consentimento WhatsApp (Leads, Contactos e Empresas)

Sistema de consentimento explícito e auditável para campanhas WhatsApp: recolha, prova, revogação por STOP e bloqueio técnico de envios sem autorização.

## Estado atual verificado

- Existe `whatsapp_optouts` e o detetor `whatsapp-pro-optout-detect` (STOP/SAIR/CANCELAR…), usado pelos dispatchers de campanhas, sequências e agendamentos.
- `src/pages/WhatsAppConsentPage.tsx` existe, mas gere apenas opt-outs (não há registo de consentimento concedido).
- Não existe tabela `whatsapp_consents` no projeto.
- O assistente `WhatsAppCampaignWizard.tsx` já separa audiência por Lista manual / Contactos / Leads / Empresas com normalização E.164 e deduplicação, mas não filtra por consentimento.

## O que vai ser construído

### 1. Base de dados
Nova tabela `whatsapp_consents` com todos os campos pedidos (workspace_id, phone E.164, contact_id/lead_id/company_id, status, consent_category, consent_text, consent_version, source, source_reference, granted_at, revoked_at, ip_address, user_agent, metadata, timestamps).
- Índice único por (workspace_id, phone, consent_category) para upsert idempotente; índices para lead/contacto/empresa e estado.
- RLS por workspace: leitura/gestão para membros; escrita pública apenas via edge function com service_role. GRANTs explícitos.
- Função `has_whatsapp_consent(workspace_id, phone)` (SECURITY DEFINER, search_path=public) usada pelo servidor.

### 2. Texto e checkbox
Componente reutilizável `WhatsAppConsentCheckbox`, com o texto oficial pedido, link para a Política de Privacidade, desmarcado por defeito, opcional, e registo da versão exata (`v1-2026-08`). Nunca marcado automaticamente.

### 3. Formulários e landing pages
- Campo de consentimento WhatsApp no Form Studio e nas landing pages.
- Ao submeter com aceitação, a edge function normaliza o telefone, grava/atualiza o consentimento com data, origem, IP, user-agent e referência do formulário, e liga à Lead/Contacto criado.

### 4. Assistente de campanhas
No passo Audiência (Contactos/Leads/Empresas) passam a contar-se e mostrar-se: total com telefone, com consentimento, sem consentimento, opt-outs, inválidos, duplicados e total elegível. Só entram destinatários com `granted`. Criação/lançamento bloqueado enquanto houver destinatários sem consentimento na seleção.

### 5. Revogação por STOP
O detetor de opt-out passa também a marcar o consentimento como `revoked` com `revoked_at`, e a cancelar mensagens agendadas/sequências para esse telefone, respondendo apenas a confirmação de remoção.

### 6. Leads existentes
Sem consentimento retroativo. Criação dos quatro segmentos: Consentimento confirmado, Sem consentimento, Consentimento revogado, Telefone inválido.

### 7. Landing page pública de recolha
Rota pública `/consentimento-whatsapp` com identificação da marca, benefícios, campo de telefone, checkbox, Política de Privacidade e ecrã de sucesso. Grava via edge function dedicada (validação zod, sem confiar no cliente).

### 8. Auditoria
Novo separador "Consentimentos" no ecrã existente de Consentimentos WhatsApp: pesquisa por telefone/entidade, filtros por estado/origem/data, histórico e exportação CSV da prova, sempre restrita ao workspace.

### 9. Segurança
Revalidação de consentimento + opt-out no dispatcher imediatamente antes de cada envio (fail-closed). Nenhuma mensagem enviada durante os testes.

## Detalhes técnicos

- Migration nativa: `whatsapp_consents` + índices + RLS + GRANTs + função `has_whatsapp_consent`.
- Edge functions: nova `whatsapp-consent-record` (pública, valida zod, captura IP/UA); alterações em `whatsapp-pro-optout-detect` (revogar) e `whatsapp-pro-campaign-dispatch` / `-scheduled-dispatch` / `-sequence-dispatch` (revalidação pré-envio).
- Frontend: `WhatsAppConsentCheckbox.tsx`, hook `useWhatsAppConsents.ts`, alterações em `WhatsAppCampaignWizard.tsx`, `WhatsAppConsentPage.tsx`, renderers de formulários e landing pages, nova página pública + rota.
- Testes: unitários para elegibilidade/contadores e revogação; lint, typecheck e build.
- Publicação em fastcrm.metodopare.ai no fim, sem criar nem enviar campanhas.

## Critérios de aceitação

- Destinatário sem `granted` nunca entra na audiência nem é enviado.
- STOP revoga e cancela agendamentos.
- Contadores visíveis no passo Audiência.
- Prova exportável em CSV isolada por workspace.

## Por validar

- A marca no texto está escrita "myMIA"; o workspace é "myMYA Hub". Uso "myMIA" exatamente como indicado, salvo indicação contrária.
