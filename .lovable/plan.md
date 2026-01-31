
# Plano de Evolução do Módulo de Notas de Encomenda B2B

## Visão Geral

Transformar o módulo existente num sistema B2B profissional e escalável através de 7 camadas estratégicas que aumentam receita, reduzem fricção operacional e diferenciam o FastCRM.

---

## Fases de Implementação

### Fase 1: Camada Comercial (Kits, Cross-sell, Escalões)

**Objectivo**: Aumentar ticket médio com bundles, recomendações e preços segmentados.

**1.1 Sistema de Kits/Protocolos**
- Nova tabela `product_protocols` (bundles com nomes comerciais como "Protocolo AAG")
- Componente `ProtocolCard` no catálogo B2B com botão "Adicionar Protocolo"
- Um clique adiciona todos os produtos do protocolo ao carrinho com quantidades pré-definidas
- Integração com a tabela existente `product_components` para componentes

**1.2 Recomendações de Complementos (Cross-sell)**
- Nova tabela `product_cross_sells` (produto origem, produto sugerido, peso/ordem)
- Componente `CrossSellSuggestions` exibido no modal de produto e carrinho
- Lógica: "Quem compra X normalmente adiciona Y"
- Edge function `suggest-order-cross-sells` com IA opcional

**1.3 Escalões de Preço por Cliente**
- Nova tabela `client_price_tiers` (Gold, Silver, Bronze, etc.)
- Extensão `client_users` com campo `price_tier_id`
- Nova tabela `product_tier_prices` (preço por produto + tier)
- Hook `useClientPricing` que aplica preços correctos automaticamente
- Campanhas promocionais via tabela `pricing_campaigns`

---

### Fase 2: Controlo Operacional

**Objectivo**: Evitar pedidos impossíveis e reduzir chamadas ao escritório.

**2.1 Stock Informativo**
- Extensão `products` com campos: `stock_status` (enum: available, limited, backorder, out_of_stock), `stock_notes`
- Badge visual no catálogo e modal de produto
- Bloqueio de adicionar ao carrinho se `out_of_stock`

**2.2 MOQ / Packs / Múltiplos**
- Extensão `products` com campos: `min_order_quantity`, `order_multiple`, `pack_size`
- Validação no `CartContext` e checkout
- Mensagem de erro clara: "Este produto vende-se em caixas de 6"

**2.3 Prazo Estimado por Produto**
- Extensão `products` com campo `delivery_estimate` (ex: "24-48h", "5-7 dias")
- Campo `delivery_notes` para informação adicional
- Exibição no catálogo e resumo da encomenda
- Cálculo de prazo máximo no checkout baseado nos itens

---

### Fase 3: Centro de Aprovações e Governação

**Objectivo**: Gestão profissional de aprovações com auditoria completa.

**3.1 Centro de Aprovações (Backoffice)**
- Nova página `/dashboard/order-approvals` com fila de aprovações pendentes
- Filtros por tipo: prestações, crédito excedido, valor alto
- Acções em lote: aprovar múltiplos, rejeitar com template
- Widget de resumo no dashboard principal

**3.2 Trilho de Auditoria Completo**
- Nova tabela `order_audit_log` (order_id, action, old_value, new_value, user_id, timestamp, ip_address)
- Trigger automático em alterações de `order_notes`
- Componente `OrderAuditTrail` na página de detalhe
- Conformidade RGPD com campos de retenção

**3.3 Workflow de Estados com Automações**
- Nova tabela `order_workflows` (status_from, status_to, actions: JSON)
- Acções disponíveis: enviar email, criar tarefa, notificar, webhook
- Edge function `order-workflow-processor` executada nas transições
- Interface de configuração no Admin Settings

---

### Fase 4: Integração CRM Avançada

**Objectivo**: Transformar encomendas em máquina de retenção.

**4.1 Associação Nativa a Oportunidades**
- Extensão `order_notes` com campo `opportunity_id` (nullable)
- Na criação, opção de criar oportunidade "Recompra" automaticamente
- Componente `CreateDealFromOrder` já existe, melhorar integração

**4.2 Timeline Enriquecida**
- Já implementado na Timeline unificada
- Adicionar mais eventos: alteração de estado, notas internas, aprovações
- Ícones e cores distintas por tipo de evento

**4.3 Sistema de Alertas de Recompra**
- Nova tabela `reorder_alerts` (client_user_id, product_id, expected_date, notified)
- Baseado em `typical_duration_days` do produto
- Edge function `check-reorder-alerts` com cron diário
- Notificações para equipa comercial e cliente (opt-in)

---

### Fase 5: Experiência do Cliente (Portal B2B)

**Objectivo**: Velocidade, hábito e fidelização.

**5.1 Repetir Encomenda**
- Botão "Repetir Encomenda" na lista de encomendas do cliente
- Pré-preenche carrinho com mesmos produtos/quantidades
- Valida disponibilidade e preços actuais

**5.2 Lista de Favoritos**
- Nova tabela `client_favorites` (client_user_id, product_id)
- Botão coração nos produtos
- Página `/client/favorites` com produtos favoritos
- Quick-add ao carrinho

**5.3 Perfis de Compra por Tipo de Cliente**
- Extensão `client_users` com campo `business_type` (Cabeleireiro, Clínica, Terapeuta, etc.)
- Catálogo filtrado por perfil como opção default
- Sugestões de produtos baseadas no perfil

---

### Fase 6: Comunicação e Documentação

**Objectivo**: Menos ruído, mais clareza, menos erros.

**6.1 PDF Profissional**
- Já existe `OrderNotePDF` - melhorar com:
- Branding do workspace (logo, cores)
- Dados fiscais completos
- Notas de protocolo por item
- QR code para rastreio

**6.2 Templates de Email Configuráveis**
- Nova tabela `email_templates` (workspace_id, type, subject, html_body)
- Interface de edição com preview
- Variáveis dinâmicas: {{client_name}}, {{order_number}}, etc.
- Tipos: confirmação, aprovação, rejeição, preparação, facturação

**6.3 Campo "Observações do Protocolo" por Item**
- Extensão `order_note_items` com campo `protocol_notes`
- Exibição no picking e PDF
- Útil para instruções de preparação

---

### Fase 7: Inteligência (Diferenciador Premium)

**Objectivo**: Pesquisa semântica, assistente de diagnóstico, detecção de inconsistências.

**7.1 Pesquisa Semântica no Catálogo**
- Edge function `catalog-semantic-search` usando Lovable AI
- Cliente escreve "queda de cabelo" → encontra produtos e protocolos relevantes
- Indexação de atributos, descrições e nomes

**7.2 Assistente "Escolha por Diagnóstico"**
- Componente `DiagnosisAssistant` com wizard de perguntas
- Perguntas simples → recomenda produtos e bundle adequado
- Baseado em `product_attributes` (patologia, indicação, função)

**7.3 Detetor de Inconsistências**
- Análise do carrinho antes de checkout
- Alerta: "Adicionou X mas faltou o passo Y do protocolo"
- Edge function `validate-order-consistency`

---

## Estrutura de Ficheiros a Criar

```text
src/
├── components/
│   └── order-notes/
│       ├── OrderApprovalCenter.tsx
│       ├── OrderApprovalQueue.tsx
│       ├── OrderAuditTrail.tsx
│       ├── OrderWorkflowConfig.tsx
│       └── ReorderAlertsList.tsx
│   └── client-portal/
│       ├── catalog/
│       │   ├── ProtocolCard.tsx
│       │   ├── CrossSellSuggestions.tsx
│       │   ├── StockBadge.tsx
│       │   ├── DeliveryEstimate.tsx
│       │   └── DiagnosisAssistant.tsx
│       ├── FavoritesList.tsx
│       └── RepeatOrderButton.tsx
├── hooks/
│   ├── useClientPricing.ts
│   ├── useOrderApprovals.ts
│   ├── useClientFavorites.ts
│   ├── useReorderAlerts.ts
│   └── useSemanticSearch.ts
├── pages/
│   ├── OrderApprovalsPage.tsx
│   └── client/
│       └── ClientFavoritesPage.tsx
└── types/
    ├── order-audit.ts
    ├── pricing-tier.ts
    └── protocol.ts

supabase/
├── functions/
│   ├── catalog-semantic-search/
│   ├── order-workflow-processor/
│   ├── check-reorder-alerts/
│   ├── suggest-order-cross-sells/
│   └── validate-order-consistency/
└── migrations/
    └── [novas tabelas e extensões]
```

---

## Novas Tabelas de Base de Dados

| Tabela | Descrição |
|--------|-----------|
| `product_protocols` | Kits/Protocolos comerciais com produtos |
| `protocol_products` | Produtos dentro de cada protocolo (N:M) |
| `product_cross_sells` | Relações de cross-sell entre produtos |
| `client_price_tiers` | Escalões de preço (Gold, Silver, etc.) |
| `product_tier_prices` | Preços por produto e escalão |
| `pricing_campaigns` | Campanhas promocionais temporárias |
| `order_audit_log` | Registo de alterações (auditoria) |
| `order_workflows` | Automações por transição de estado |
| `reorder_alerts` | Alertas de recompra previstos |
| `client_favorites` | Produtos favoritos por cliente |
| `email_templates` | Templates de email configuráveis |

---

## Extensões a Tabelas Existentes

**products:**
- `stock_status`, `stock_notes`
- `min_order_quantity`, `order_multiple`, `pack_size`
- `delivery_estimate`, `delivery_notes`

**client_users:**
- `price_tier_id`, `business_type`

**order_notes:**
- `opportunity_id`

**order_note_items:**
- `protocol_notes`

---

## Priorização Sugerida

| Sprint | Fases | Impacto |
|--------|-------|---------|
| Sprint 1 | 2 (Controlo Operacional) | Reduz problemas imediatos |
| Sprint 2 | 3 (Aprovações e Auditoria) | Conformidade e governação |
| Sprint 3 | 1 (Camada Comercial) | Aumento de receita |
| Sprint 4 | 5 (Experiência Cliente) | Retenção e fidelização |
| Sprint 5 | 4+6 (CRM + Documentação) | Integração completa |
| Sprint 6 | 7 (Inteligência) | Diferenciação premium |

---

## Estimativa de Esforço

- **Fase 1 (Comercial)**: 8-10 horas
- **Fase 2 (Operacional)**: 4-5 horas
- **Fase 3 (Aprovações)**: 6-8 horas
- **Fase 4 (CRM)**: 4-5 horas
- **Fase 5 (Portal)**: 5-6 horas
- **Fase 6 (Comunicação)**: 4-5 horas
- **Fase 7 (Inteligência)**: 6-8 horas

**Total estimado**: 37-47 horas de desenvolvimento

---

## Dependências

- Resend API para emails (já configurado)
- Lovable AI para pesquisa semântica (nativo)
- Sistema de workspaces (já existe)
- Trigger.dev para jobs agendados (já configurado)
