

# Email Marketing — Módulo Acima da Concorrência

## Diagnóstico Atual

O módulo tem uma base sólida (36 componentes, email builder visual, segmentos dinâmicos, sequências multicanal, heatmaps, deliverability), mas sofre de 4 problemas críticos:

1. **Dashboard passivo** — Mostra KPIs estáticos sem recomendações. Não diz ao utilizador o que fazer a seguir.
2. **Analytics com dados falsos** — `AdvancedAnalyticsPanel` usa `Math.random()` para "Melhor Horário" e dados hardcoded para "Engagement Decay".
3. **Criação de campanhas sem IA** — O utilizador tem de escrever assunto e corpo manualmente. Nenhum co-piloto.
4. **Sem automações de ciclo de vida** — Welcome series, abandono, win-back não existem como fluxos pré-configurados.

---

## Plano de Implementação (4 blocos)

### Bloco 1: Dashboard Proativo com IA

**O que muda**: O dashboard deixa de ser um painel de números e passa a ser um **centro de decisão**.

| Componente | Descrição |
|---|---|
| `CampaignAdvisorBanner.tsx` | **Novo** — Banner IA no topo: analisa campanhas recentes e sugere próxima ação ("Taxa de abertura caiu 15% — experimente enviar às 10h em vez das 14h", "Tem 47 contactos inactivos — lance campanha de re-engagement") |
| `HealthScoreCard.tsx` | **Novo** — Score composto 0-100 combinando: deliverability rate, bounce rate, complaint rate, engagement trend. Semáforo visual (verde/âmbar/vermelho) |
| `SmartSendTimeCard.tsx` | **Novo** — Baseado em dados reais de `campaign_link_clicks` e `campaign_opens`, calcula e apresenta o melhor dia/hora para envio com gráfico |

**Integração**: Substituir o layout atual do `MarketingDashboard.tsx` — Banner IA no topo, Health Score + Send Time + Stats na primeira row, Re-engagement + Segments na segunda.

### Bloco 2: Co-Piloto IA na Criação de Campanhas

**O que muda**: O fluxo de criação passa de manual para assistido.

| Componente | Descrição |
|---|---|
| `AISubjectLineGenerator.tsx` | **Novo** — No `CampaignMetadataForm`, botão "Gerar com IA" que produz 3 variantes de assunto a partir do conteúdo do email. Inclui score de qualidade e sugestão A/B |
| `AIBodyCopyAssistant.tsx` | **Novo** — Painel lateral no email builder: utilizador descreve em 1-2 frases o que quer comunicar, IA gera o corpo completo em HTML estilizado |
| `AudienceEstimator.tsx` | **Novo** — No passo de metadados, mostra estimativa do tamanho da audiência + previsão de performance (open rate esperado, cliques estimados) baseado em histórico |

**Integração**: Adicionar ao `CampaignCreationFlow` e `CampaignMetadataForm`.

### Bloco 3: Analytics com Dados Reais

**O que muda**: Os gráficos passam a refletir a realidade.

| Ficheiro | Mudança |
|---|---|
| `AdvancedAnalyticsPanel.tsx` | **Modificar** — Substituir arrays hardcoded por queries reais a `campaign_email_events`. Engagement decay calculado a partir de timestamps de opens/clicks. Best time baseado em distribuição real de opens por hora |
| `RevenueAttributionPanel.tsx` | **Novo** — Liga cliques em campanhas a deals fechados no pipeline. Mostra receita gerada por campanha |
| `ContactJourneyTimeline.tsx` | **Novo** — Timeline visual por contacto: emails recebidos, abertos, clicados, deals criados, compras. Acessível a partir da lista de campanhas |

### Bloco 4: Automações de Ciclo de Vida

**O que muda**: Templates de automação pré-configurados que o utilizador ativa com 1 clique.

| Componente | Descrição |
|---|---|
| `LifecycleAutomations.tsx` | **Novo** — Painel com 3 automações prontas: **Welcome Series** (trigger: novo contacto → sequência de 3 emails), **Abandono** (trigger: deal muda para "perdido" ou estagna → email de recuperação), **Win-back** (trigger: contacto inativo > 90 dias → campanha de reativação) |
| Nova tab "Automações" | Adicionar ao `Marketing.tsx` entre "Multi-Canal" e "Analytics" |

---

## Ficheiros a Criar/Modificar

| Ficheiro | Ação |
|---|---|
| `src/components/marketing/CampaignAdvisorBanner.tsx` | **Novo** |
| `src/components/marketing/HealthScoreCard.tsx` | **Novo** |
| `src/components/marketing/SmartSendTimeCard.tsx` | **Novo** |
| `src/components/marketing/AISubjectLineGenerator.tsx` | **Novo** |
| `src/components/marketing/AIBodyCopyAssistant.tsx` | **Novo** |
| `src/components/marketing/AudienceEstimator.tsx` | **Novo** |
| `src/components/marketing/RevenueAttributionPanel.tsx` | **Novo** |
| `src/components/marketing/ContactJourneyTimeline.tsx` | **Novo** |
| `src/components/marketing/LifecycleAutomations.tsx` | **Novo** |
| `src/components/marketing/MarketingDashboard.tsx` | **Modificar** — Novo layout proativo |
| `src/components/marketing/AdvancedAnalyticsPanel.tsx` | **Modificar** — Dados reais |
| `src/components/marketing/CampaignMetadataForm.tsx` | **Modificar** — Integrar gerador IA |
| `src/pages/Marketing.tsx` | **Modificar** — Tab "Automações" |

## Diferenciadores vs Concorrência

```text
Feature                    Mailchimp  ActiveCamp  FastCRM
─────────────────────────────────────────────────────────
AI Campaign Advisor           ✗          ✗          ✓
Health Score composto         ~          ✗          ✓
AI Subject Generator          ✓          ✗          ✓
AI Body Copy from brief       ✗          ✗          ✓
Revenue Attribution           ✓          ✓          ✓
Contact Journey Timeline      ✓          ✓          ✓
1-click Lifecycle Automations ✗          ~          ✓
Smart Send Time (real data)   ✓          ✓          ✓
CRM-native (pipeline aware)   ✗          ~          ✓
```

O grande diferenciador é que o FastCRM é **CRM-native**: as automações são disparadas por eventos do pipeline, a atribuição de receita é direta, e a IA tem contexto de negócio completo.

