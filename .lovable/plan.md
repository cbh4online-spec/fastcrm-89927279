

# Plano: Flexibilização do Sistema de Produtos com Tabelas de Configuração

## Resumo Executivo

O sistema atual tem várias constantes/enums hardcoded em código TypeScript que devem ser migrados para tabelas de configuração na base de dados. Isto permitirá aos utilizadores personalizar os tipos de produtos, modelos de cobrança, condições de pagamento, etc., sem necessidade de alterações de código.

---

## Análise do Estado Actual

### Já Existem Tabelas de Configuração:
| Tabela | Estado | Observações |
|--------|--------|-------------|
| `product_types` | Funcional | Tipos de produto configuráveis por workspace |
| `billing_types` | Funcional | Tipos de cobrança configuráveis por workspace |
| `product_categories` | Funcional | Categorias já dinâmicas |

### Ainda Hardcoded em Código:
| Constante | Ficheiro(s) | Impacto |
|-----------|-------------|---------|
| `ProductType` enum | `src/types/product.ts` | Tipos limitados a 7 valores fixos |
| `BillingType` enum | `src/types/product.ts` | Apenas "one-off" e "recurring" |
| `ConsumptionModel` enum | `src/types/product.ts` | Apenas 4 modelos de consumo |
| `DeliveryMode` enum | `src/types/product.ts` | Apenas 3 modos de entrega |
| `BillingFrequency` enum | `src/types/product.ts` | Apenas 3 frequências |
| `RecommendedFrequency` enum | `src/types/product.ts` | Apenas 7 frequências |
| `PAYMENT_CONDITIONS` | `proposalConstants.ts`, `ENIContactTypes.ts`, `FinancialSection.tsx` | Condições de pagamento duplicadas |
| `PAYMENT_METHODS` | `ENIContactTypes.ts` | Métodos de pagamento fixos |
| `VALIDITY_DAYS_OPTIONS` | `proposalConstants.ts` | Dias de validade fixos |

---

## Tipos de Produto Adicionais Sugeridos

Para suportar **serviços**, **SaaS** e **produtos digitais**, adicionar:

| Código | Label | Descrição |
|--------|-------|-----------|
| `service` | Serviço | Serviço profissional pontual |
| `saas` | SaaS | Software como serviço |
| `digital` | Digital | Produto digital (ebook, curso, etc.) |
| `subscription` | Subscrição | Acesso contínuo a serviço/produto |
| `license` | Licença | Licença de software |
| `consulting` | Consultoria | Serviços de consultoria |
| `maintenance` | Manutenção | Contratos de manutenção |

---

## Novas Tabelas de Configuração a Criar

### 1. `payment_conditions` - Condições de Pagamento

```sql
CREATE TABLE payment_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  days INTEGER DEFAULT 0, -- Número de dias para pagamento
  discount_pct NUMERIC(5,2), -- Desconto por pronto pagamento
  icon TEXT DEFAULT 'Clock',
  color TEXT DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, code)
);
```

**Dados default:**
- `pronto_pagamento` (0 dias)
- `15_dias` (15 dias)
- `30_dias` (30 dias)
- `45_dias` (45 dias)
- `60_dias` (60 dias)
- `90_dias` (90 dias)

### 2. `payment_methods` - Métodos de Pagamento

```sql
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'CreditCard',
  color TEXT DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, code)
);
```

**Dados default:**
- `bank_transfer` - Transferência Bancária
- `multibanco` - Multibanco
- `mbway` - MB Way
- `credit_card` - Cartão de Crédito
- `direct_debit` - Débito Direto

### 3. `consumption_models` - Modelos de Consumo

```sql
CREATE TABLE consumption_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  is_trackable BOOLEAN DEFAULT true,
  unit_name TEXT, -- Nome da unidade (sessão, unidade, hora, etc.)
  icon TEXT DEFAULT 'Activity',
  color TEXT DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, code)
);
```

**Dados default:**
- `sessions` - Sessões (trackable)
- `units` - Unidades (trackable)
- `hours` - Horas (trackable)
- `unlimited` - Ilimitado (não trackable)
- `credits` - Créditos (trackable)

### 4. `delivery_modes` - Modos de Entrega

```sql
CREATE TABLE delivery_modes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'Truck',
  color TEXT DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, code)
);
```

**Dados default:**
- `online` - Online
- `presencial` - Presencial
- `hybrid` - Híbrido
- `remote` - Remoto
- `on_demand` - A Pedido

### 5. `billing_frequencies` - Frequências de Cobrança

```sql
CREATE TABLE billing_frequencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  interval_days INTEGER NOT NULL, -- Intervalo em dias
  icon TEXT DEFAULT 'Calendar',
  color TEXT DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, code)
);
```

**Dados default:**
- `weekly` - Semanal (7 dias)
- `biweekly` - Quinzenal (14 dias)
- `monthly` - Mensal (30 dias)
- `quarterly` - Trimestral (90 dias)
- `semiannual` - Semestral (180 dias)
- `yearly` - Anual (365 dias)

---

## Hook Centralizado: useProductSettings.ts

Expandir o hook existente para incluir todas as tabelas:

```typescript
// Adicionar ao useProductSettings.ts
export function usePaymentConditions() { ... }
export function usePaymentMethods() { ... }
export function useConsumptionModels() { ... }
export function useDeliveryModes() { ... }
export function useBillingFrequencies() { ... }
```

Cada hook terá:
- Query com seeding automático de defaults
- Mutations para create, update, delete
- Cache invalidation

---

## Expansão da UI de Configurações

Expandir o `ProductSettingsTabContent.tsx` com novas tabs:

```text
┌─────────────────────────────────────────────────────────────────────┐
│ CONFIGURAÇÕES DE PRODUTOS                                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  [Tipos] [Cobrança] [Categorias] [Condições] [Métodos] [+Mais]      │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ Tab Activa: Condições de Pagamento                            │  │
│  │                                                               │  │
│  │ + Adicionar Condição                                          │  │
│  │                                                               │  │
│  │ ┌─────────────────────────────────────────────────────────┐   │  │
│  │ │ [Clock] Pronto Pagamento    0 dias       [Activo] [⋮]   │   │  │
│  │ │ [Clock] 15 dias             15 dias      [Activo] [⋮]   │   │  │
│  │ │ [Clock] 30 dias             30 dias      [Activo] [⋮]   │   │  │
│  │ │ [Clock] 45 dias             45 dias      [Activo] [⋮]   │   │  │
│  │ │ [Clock] 60 dias             60 dias      [Activo] [⋮]   │   │  │
│  │ │ [Clock] 90 dias             90 dias      [Activo] [⋮]   │   │  │
│  │ └─────────────────────────────────────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Alterações ao CreateProductDialog

Substituir selects hardcoded por dados dinâmicos:

```typescript
// Antes (hardcoded)
<SelectItem value="simple">Simples</SelectItem>
<SelectItem value="recurring">Recorrente</SelectItem>

// Depois (dinâmico)
const { data: productTypes } = useProductTypes();
{productTypes?.filter(t => t.is_active).map(type => (
  <SelectItem key={type.id} value={type.code}>
    {type.label}
  </SelectItem>
))}
```

---

## Ficheiros a Criar

| Ficheiro | Descrição |
|----------|-----------|
| `supabase/migrations/...payment_conditions.sql` | Criação de todas as novas tabelas |
| `src/components/products/settings/PaymentConditionsTab.tsx` | Tab de condições de pagamento |
| `src/components/products/settings/PaymentMethodsTab.tsx` | Tab de métodos de pagamento |
| `src/components/products/settings/ConsumptionModelsTab.tsx` | Tab de modelos de consumo |
| `src/components/products/settings/DeliveryModesTab.tsx` | Tab de modos de entrega |
| `src/components/products/settings/BillingFrequenciesTab.tsx` | Tab de frequências |

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/hooks/useProductSettings.ts` | Adicionar 5 novos hooks |
| `src/components/products/settings/ProductSettingsTabContent.tsx` | Adicionar novas tabs |
| `src/components/products/CreateProductDialog.tsx` | Usar dados dinâmicos |
| `src/components/proposals/proposalConstants.ts` | Remover constantes hardcoded |
| `src/types/product.ts` | Manter types para compatibilidade mas ler de DB |

---

## Migração de Dados

A migração irá:
1. Criar as 5 novas tabelas
2. Adicionar RLS policies para workspace isolation
3. Adicionar triggers de updated_at
4. Adicionar indexes para performance

---

## Sequência de Implementação

1. **Migração SQL** - Criar tabelas e RLS
2. **Hooks** - Expandir useProductSettings
3. **Tabs de Configuração** - UI para cada tabela
4. **ProductSettingsTabContent** - Integrar novas tabs
5. **CreateProductDialog** - Substituir selects hardcoded
6. **Propostas** - Atualizar condições de pagamento
7. **Contactos/Empresas** - Atualizar campos financeiros

---

## Benefícios da Solução

- Utilizadores podem criar tipos de produto personalizados (SaaS, Digital, etc.)
- Condições de pagamento configuráveis por workspace
- Métodos de pagamento adaptáveis ao negócio
- Modelos de consumo flexíveis
- Sistema preparado para diferentes indústrias
- Não quebra código existente (retrocompatível)

