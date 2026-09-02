# Contacto 1:1 validado em Leads (e confirmação em Empresas)

## Diagnóstico (verificado no código e na base de dados)

- A secção `OutreachOneToOneSection` já está montada em duas fichas:
  - Contactos — `src/components/contacts/eni/ENIContactDetailWithSidebar.tsx`
  - Empresas — `src/components/companies/CompanyDetailWithSidebar.tsx` (separador Visão geral, a seguir ao contexto da empresa)
- A ficha de Lead (`src/components/crm/LeadDetailWithSidebar.tsx`) **não** tem a secção.
- O módulo já suporta leads: `OutreachEntityType = "company" | "contact" | "lead"` e as tabelas `outreach_*` guardam `entity_type` livre. Em dados reais só existem validações de contactos (14 linhas), nenhuma de lead ou empresa.
- A tabela `leads` tem `email`, `phone`, `linkedin_url`, `instagram_url`, `facebook_url`, `website`, mas **não tem `company_id`** — apenas `company_name` em texto.

## O que vai ser feito

1. **Leads**: inserir `<OutreachOneToOneSection entityType="lead" ... />` no separador "Visão geral" da ficha de Lead, a seguir ao painel de recomendações, com:
   - `entityId={id}`, `entityName={lead.name}`
   - `email` / `phone` da lead (com fallback para `preferred_contact_email` / `preferred_contact_phone`, que já existem na tabela)
   - `companyId={null}` e `companyName={lead.company_name}` — como não há ligação real à empresa, o limite "por empresa" não se aplica a leads; o nome serve só para contexto do rascunho
   - `socialUrls` a partir de `linkedin_url`, `instagram_url`, `facebook_url` (mesmo padrão da ficha de Empresa)
2. **Empresas**: confirmar em execução que a secção aparece na ficha (já está no código). Se o utilizador não a estiver a ver, corrigir apenas a causa confirmada (separador/posição), sem reescrever a secção.
3. **Verificação de RLS**: confirmar que gravar uma validação com `entity_type = 'lead'` funciona (a política `outreach_validations_members` foi corrigida na migração da ordem de argumentos) e que o evento correspondente fica registado em `outreach_events`.

## Fora de âmbito

- Sem alterações de esquema, sem novas tabelas e sem alterar as regras de elegibilidade/limites.
- Sem envio automático: continua tudo assistido, como hoje.

## Critérios de aceitação

- Abrir uma lead → separador "Visão geral" mostra "Contacto 1:1 validado" com o mesmo comportamento das outras entidades.
- Marcar a lead como validada grava sem erro de RLS e regista evento.
- Canais indisponíveis (sem email/telefone) aparecem bloqueados com motivo claro.
- Empresa continua a mostrar a secção; contactos sem regressão.
- Sem erros de consola; funcional em mobile.

## Risco por validar

- Leads sem ligação estruturada a empresa: o limite "por empresa" não é aplicável nesses casos (só limite diário e cooldown). Se preferir aplicar também por `company_name`, digo-o antes de implementar.
