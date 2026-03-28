

# Form Studio — Módulo Acima da Concorrência

## Diagnóstico Atual

O módulo tem: builder visual, modo linguagem natural com IA, preview, formulários inteligentes com scoring/enrichment, modo conversacional, e página pública (`/f/:slug`). Mas faltam capacidades críticas:

1. **Sem embed/incorporação** — Não há forma de incorporar o formulário num site externo (iframe, script, popup). Só funciona via link direto.
2. **Sem analytics de formulário** — Não há dashboard com views, taxa de conversão, abandono parcial, ou performance por campo.
3. **Sem IA proativa** — A IA gera campos mas não analisa performance nem sugere otimizações.
4. **Sem features avançadas** — Sem A/B testing, sem webhooks, sem thank-you page customizável, sem tracking de abandono parcial.

---

## Plano (4 blocos)

### Bloco 1: Embed & Incorporação

Gerar snippets para incorporar formulários em qualquer site externo.

| Componente | Descrição |
|---|---|
| `FormEmbedDialog.tsx` | **Novo** — Dialog com 4 opções de incorporação: **iframe** (código copiável com dimensões ajustáveis), **Script JS** (widget que injeta o formulário inline), **Popup/Modal** (botão flutuante que abre formulário em overlay), **Link direto** (URL pública já existente). Cada opção gera o snippet pronto a copiar |
| `FormEmbedPreview.tsx` | **Novo** — Preview visual de como o formulário aparece em cada modo (iframe mockup, popup mockup) |

**Integração**: Adicionar botão "Incorporar" no `SmartFormsList.tsx` e no `SmartFormBuilder.tsx` após guardar.

### Bloco 2: Analytics de Formulário

Dashboard com métricas reais por formulário.

| Componente | Descrição |
|---|---|
| `FormAnalyticsDashboard.tsx` | **Novo** — KPIs: Total views, submissões, taxa de conversão, tempo médio de preenchimento. Gráfico de tendência (últimos 30 dias). Ranking de campos com maior abandono. Mapa de calor por campo (quais campos as pessoas preenchem vs saltam) |
| `FormFieldAnalytics.tsx` | **Novo** — Analytics por campo individual: taxa de preenchimento, valores mais comuns, tempo gasto. Identifica campos "killer" (alta taxa de abandono) |
| Nova tab "Analytics" | Adicionar ao `SmartForms.tsx` como nova view |

**Dados**: Consultar `form_submissions` existente + adicionar tracking de `form_views` na `PublicFormPage.tsx`.

### Bloco 3: IA Proativa & Otimização

| Componente | Descrição |
|---|---|
| `FormAdvisorBanner.tsx` | **Novo** — Banner no topo da lista: "O formulário 'Contacto' tem 200 views mas só 12 submissões (6%) — a IA sugere: remover campo 'Empresa' (opcional mas causa abandono), reduzir de 8 para 5 campos" |
| `FormABTestPanel.tsx` | **Novo** — Criar variante B de um formulário (alterar texto de botão, ordem de campos, número de campos). Distribuir tráfego 50/50. Dashboard de comparação com winner automático |
| `AIFormOptimizer.tsx` | **Novo** — Botão "Otimizar com IA" que analisa submissões existentes e sugere: reordenar campos, marcar opcionais como obrigatórios (ou vice-versa), alterar labels, adicionar/remover campos. Consome créditos via ai-gate |

### Bloco 4: Features Premium

| Componente | Descrição |
|---|---|
| `FormWebhooksConfig.tsx` | **Novo** — Configurar webhooks por formulário: URL destino, eventos (nova submissão, lead qualificado), headers custom, retry policy. Permite integrar com Zapier/Make/n8n |
| `FormThankYouEditor.tsx` | **Novo** — Editor da página de sucesso: mensagem custom, redirect URL, botão CTA secundário, embed de calendário (link para booking page), oferta/desconto |
| `PartialSubmissionTracker.tsx` | **Novo** — Tracking de preenchimentos parciais: quem começou mas não terminou. Lista de "quase-leads" com dados parciais captados. Possibilidade de enviar email de recuperação |
| `ConditionalLogicPanel.tsx` | **Novo** — UI visual para criar regras condicionais: "Se campo X = Y, mostrar campo Z". Já existe o tipo `ConditionalRule` mas sem UI dedicada para configurar |

---

## Ficheiros a Criar/Modificar

| Ficheiro | Ação |
|---|---|
| `src/components/smart-forms/FormEmbedDialog.tsx` | **Novo** — Snippets de incorporação |
| `src/components/smart-forms/FormEmbedPreview.tsx` | **Novo** — Preview dos modos embed |
| `src/components/smart-forms/FormAnalyticsDashboard.tsx` | **Novo** — Dashboard analytics |
| `src/components/smart-forms/FormFieldAnalytics.tsx` | **Novo** — Analytics por campo |
| `src/components/smart-forms/FormAdvisorBanner.tsx` | **Novo** — Banner proativo IA |
| `src/components/smart-forms/FormABTestPanel.tsx` | **Novo** — A/B testing |
| `src/components/smart-forms/AIFormOptimizer.tsx` | **Novo** — Otimizador IA |
| `src/components/smart-forms/FormWebhooksConfig.tsx` | **Novo** — Webhooks |
| `src/components/smart-forms/FormThankYouEditor.tsx` | **Novo** — Thank-you page |
| `src/components/smart-forms/PartialSubmissionTracker.tsx` | **Novo** — Abandono parcial |
| `src/components/smart-forms/ConditionalLogicPanel.tsx` | **Novo** — UI lógica condicional |
| `src/components/smart-forms/SmartFormsList.tsx` | **Modificar** — Botão incorporar + banner IA |
| `src/pages/SmartForms.tsx` | **Modificar** — Nova view analytics |
| `src/pages/PublicFormPage.tsx` | **Modificar** — Tracking de views + partial submissions |
| `src/components/smart-forms/SmartFormBuilder.tsx` | **Modificar** — Integrar webhooks, thank-you, conditional logic |

## Diferenciadores vs Concorrência

```text
Feature                    Typeform  JotForm  HubSpot  FastCRM
────────────────────────────────────────────────────────────────
Embed (iframe+script+popup)   ✓        ✓       ✓        ✓
A/B Testing nativo            ✗        ✗       ~        ✓
AI Form Optimizer              ✗        ✗       ✗        ✓
AI Advisor proativo            ✗        ✗       ✗        ✓
Partial submission tracking    ~        ✗       ✓        ✓
Field-level analytics          ✗        ~       ✗        ✓
Webhooks configuráveis         ✓        ✓       ✓        ✓
Thank-you page editor          ✓        ✓       ✓        ✓
Lead scoring automático        ✗        ✗       ✓        ✓
CRM-native (pipeline)          ✗        ✗       ✓        ✓
Modo conversacional            ✓        ✗       ✗        ✓
Conditional logic visual       ✓        ✓       ✓        ✓
```

O diferenciador principal: **IA que analisa e otimiza** — nenhum concorrente sugere proativamente "remova este campo para aumentar conversão em 15%".

