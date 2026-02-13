

## Templates 2.0 -- Conversion Library

### Resumo

Evoluir o modulo de Templates de Comunicacao para uma biblioteca estrategica de conversao com estruturas AIDA, metricas de performance, geracao IA contextual e integracao com Inbox 3.0.

---

### 1. Migracao DB -- Novos Campos

Adicionar campos em falta na tabela `communication_templates`:

```text
structure_type TEXT DEFAULT 'custom' (AIDA, PAS, FollowUp, ColdOutreach, custom)
cta TEXT
conversion_count INTEGER DEFAULT 0
```

Estes campos nao existem atualmente. A tabela ja tem `usage_count` e `response_rate`.

### 2. Metrica `conversion_rate` Calculada

Nao criar coluna -- calcular no frontend:

```text
conversion_rate = conversion_count / usage_count
```

Adicionar trigger DB: quando um `template_usage_log` e marcado como `converted = true`, incrementar `conversion_count` no template (similar ao trigger existente que incrementa `usage_count`).

### 3. Atualizar Tipo TypeScript

Em `src/types/communicationTemplate.ts`:
- Adicionar `structureType` e `cta` e `conversionCount` ao interface `CommunicationTemplate`
- Adicionar type `TemplateStructure = 'AIDA' | 'PAS' | 'FollowUp' | 'ColdOutreach' | 'custom'`
- Adicionar `STRUCTURE_LABELS` constante

### 4. Atualizar Hook `useCommunicationTemplates`

Em `src/hooks/useCommunicationTemplates.ts`:
- Mapear `structure_type`, `cta`, `conversion_count` nos queries
- Atualizar `useCreateCommunicationTemplate` e `useUpdateCommunicationTemplate` para incluir os novos campos

### 5. Dashboard KPI -- Conversao Media

Em `src/components/communication/TemplatesListPage.tsx`:
- Substituir o KPI "Emails" por "Conversao Media" (media de `conversion_count / usage_count` de todos os templates)
- Adicionar sort option "Maior Conversao"
- Mostrar `conversion_rate %` e `structure_type` nos cards da lista

### 6. Atualizar `TemplateFormDialog`

Em `src/components/communication/TemplateFormDialog.tsx`:
- Adicionar campo `structure_type` (Select com opcoes AIDA, PAS, FollowUp, ColdOutreach, Custom)
- Adicionar campo `cta` (Input de texto)
- Ao selecionar uma estrutura (ex: AIDA), mostrar placeholder/guia no body com seccoes: Atencao / Interesse / Desejo / Acao

### 7. Botao "Criar com IA" -- Fluxo Completo

Criar novo componente `src/components/communication/AITemplateGeneratorDialog.tsx`:

Fluxo em 4 passos dentro de um Dialog:
1. Objetivo da mensagem (ex: captar lead frio, follow-up, upsell)
2. Publico-alvo (ex: empresarios, gestores)
3. Canal (email, whatsapp, sms)
4. Tom (formal, amigavel, direto, casual)

Ao submeter, chamar a edge function `generate-template` (ja existente) com estes parametros. O resultado e pre-preenchido no `TemplateFormDialog` para revisao e gravacao.

### 8. Integracao com Inbox 3.0

No componente `InboxTemplatePanel.tsx` (ja existe e e usado na Inbox):
- Adicionar tab "Recomendados" que filtra templates por maior conversao e mais usados
- Adicionar sort por `conversion_rate DESC`
- A tab "IA" ja existe com adaptacao contextual

O botao "Templates" no `ConversationDetail` ja abre o `InboxTemplatePanel`.

### 9. Templates Pre-Configurados METODOPARE

Inserir 5 templates via insert tool (nao migracao) apos as alteracoes de schema:

| Nome | Canal | Estrutura | Assunto/CTA |
|---|---|---|---|
| Captacao Lead Frio | email | AIDA | "Responda QUERO EVOLUIR" |
| WhatsApp Qualificacao | whatsapp | AIDA | "Posso fazer 2 perguntas?" |
| Follow-Up Comercial | email | FollowUp | "Conversa de 20 min?" |
| Convite Masterclasse | email | AIDA | "Reserve o seu lugar" |
| Recuperacao Lead Inativo | email | AIDA | "Enviar resumo novidades?" |

Nota: estes serao inseridos so se o workspace METODOPARE existir, caso contrario ficam como templates de exemplo.

---

### Ficheiros Afetados

| Ficheiro | Alteracao |
|---|---|
| Migracao SQL | Adicionar `structure_type`, `cta`, `conversion_count` + trigger conversao |
| `src/types/communicationTemplate.ts` | Novos tipos e constantes |
| `src/hooks/useCommunicationTemplates.ts` | Mapear novos campos |
| `src/components/communication/TemplatesListPage.tsx` | KPI conversao + coluna estrutura |
| `src/components/communication/TemplateFormDialog.tsx` | Campos estrutura + CTA |
| `src/components/communication/AITemplateGeneratorDialog.tsx` | Novo -- fluxo IA 4 passos |
| `src/components/inbox/InboxTemplatePanel.tsx` | Tab recomendados por conversao |
| Insert SQL | 5 templates METODOPARE |

### Ordem de Implementacao

1. Migracao DB (novos campos + trigger conversao)
2. Tipos TypeScript + hook updates
3. UI: TemplateFormDialog + TemplatesListPage
4. AITemplateGeneratorDialog
5. InboxTemplatePanel (tab recomendados)
6. Inserir templates METODOPARE

