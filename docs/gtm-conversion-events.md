# Eventos GTM para Tracking de Conversões

Este documento descreve os eventos personalizados que são enviados para o Google Tag Manager (GTM) para tracking de conversões no FASTCRM.

## Eventos Disponíveis

### 1. `lead_created`
Disparado quando um novo lead é criado no sistema.

**Dados disponíveis:**
| Variável | Descrição |
|----------|-----------|
| `lead_id` | ID único do lead |
| `lead_name` | Nome do lead |
| `lead_email` | Email do lead |
| `lead_source` | Origem do lead (instagram, whatsapp, email, form, etc.) |
| `workspace_id` | ID do workspace |
| `event_timestamp` | Data/hora do evento |

### 2. `opportunity_won`
Disparado quando uma oportunidade é marcada como ganha (status = "won").

**Dados disponíveis:**
| Variável | Descrição |
|----------|-----------|
| `opportunity_id` | ID único da oportunidade |
| `opportunity_title` | Título da oportunidade |
| `value` | Valor da oportunidade em EUR |
| `currency` | Moeda (EUR) |
| `lead_id` | ID do lead associado |
| `workspace_id` | ID do workspace |
| `transaction_id` | ID para Google Ads (= opportunity_id) |
| `conversion_value` | Valor da conversão para Google Ads |
| `event_timestamp` | Data/hora do evento |

### 3. `proposal_accepted`
Disparado quando uma proposta é aceite pelo cliente.

**Dados disponíveis:**
| Variável | Descrição |
|----------|-----------|
| `proposal_id` | ID único da proposta |
| `proposal_title` | Título da proposta |
| `value` | Valor da proposta em EUR |
| `currency` | Moeda (EUR) |
| `opportunity_id` | ID da oportunidade associada |
| `workspace_id` | ID do workspace |
| `transaction_id` | ID para Google Ads (= proposal_id) |
| `conversion_value` | Valor da conversão para Google Ads |
| `event_timestamp` | Data/hora do evento |

### 4. `payment_received`
Disparado quando um pagamento é recebido (fatura marcada como paga).

**Dados disponíveis:**
| Variável | Descrição |
|----------|-----------|
| `invoice_id` | ID da fatura (se aplicável) |
| `proposal_id` | ID da proposta (se aplicável) |
| `value` | Valor do pagamento em EUR |
| `currency` | Moeda (EUR) |
| `payment_method` | Método de pagamento |
| `customer_id` | ID do cliente |
| `workspace_id` | ID do workspace |
| `transaction_id` | ID único da transação |
| `conversion_value` | Valor da conversão para Google Ads |
| `event_timestamp` | Data/hora do evento |

### 5. `purchase` (Standard E-commerce)
Disparado automaticamente junto com `payment_received` para compatibilidade com Google Analytics 4.

**Dados disponíveis:**
| Variável | Descrição |
|----------|-----------|
| `transaction_id` | ID único da transação |
| `value` | Valor total |
| `currency` | Moeda |
| `ecommerce.transaction_id` | ID da transação (para GA4) |
| `ecommerce.value` | Valor (para GA4) |
| `ecommerce.currency` | Moeda (para GA4) |

---

## Configuração no GTM

### Passo 1: Criar Variáveis de Camada de Dados

1. Aceder ao GTM > Variáveis > Nova > Variável de Camada de Dados
2. Criar as seguintes variáveis:

| Nome da Variável | Caminho do Valor |
|------------------|------------------|
| `dlv - lead_id` | `lead_id` |
| `dlv - opportunity_id` | `opportunity_id` |
| `dlv - proposal_id` | `proposal_id` |
| `dlv - invoice_id` | `invoice_id` |
| `dlv - value` | `value` |
| `dlv - currency` | `currency` |
| `dlv - conversion_value` | `conversion_value` |
| `dlv - transaction_id` | `transaction_id` |

### Passo 2: Criar Acionadores (Triggers)

Para cada evento, criar um acionador do tipo "Evento Personalizado":

| Nome do Acionador | Nome do Evento |
|-------------------|----------------|
| CE - Lead Created | `lead_created` |
| CE - Opportunity Won | `opportunity_won` |
| CE - Proposal Accepted | `proposal_accepted` |
| CE - Payment Received | `payment_received` |
| CE - Purchase | `purchase` |

### Passo 3: Criar Tags

#### Google Analytics 4 - Eventos

Para cada evento, criar uma tag GA4 Event:
- **Tipo de Tag:** Google Analytics: Evento GA4
- **ID de Medição:** G-XXXXXXXXXX
- **Nome do Evento:** (nome do evento correspondente)
- **Parâmetros:** Mapear as variáveis de camada de dados

#### Google Ads - Conversões

Para `opportunity_won`, `proposal_accepted` e `payment_received`:
- **Tipo de Tag:** Google Ads Conversion Tracking
- **ID de Conversão:** AW-XXXXXXXXX/XXXXX
- **Valor da Conversão:** `{{dlv - conversion_value}}`
- **Moeda:** `{{dlv - currency}}`
- **ID da Transação:** `{{dlv - transaction_id}}`

#### Meta Pixel - Eventos

Para conversões no Facebook/Instagram:
- **Tipo de Tag:** Meta Pixel (Custom HTML ou Template)
- Evento `Lead` para `lead_created`
- Evento `Purchase` para `payment_received`

---

## Verificação

Para verificar se os eventos estão a ser enviados:

1. Abrir as DevTools do browser (F12)
2. Ir ao separador "Console"
3. Filtrar por `[GTM Event]`
4. Executar a ação (criar lead, fechar oportunidade, etc.)
5. Deve aparecer uma entrada como: `[GTM Event] lead_created: {...}`

Em alternativa, usar a extensão "Tag Assistant" do Chrome para verificar os eventos em tempo real.
