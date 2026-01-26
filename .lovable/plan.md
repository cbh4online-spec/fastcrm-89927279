
# Plano: Corrigir Calculos no Relatorio Metas vs Resultados

## Problemas Identificados

Apos analise detalhada, identifiquei **3 problemas** que impedem os calculos de funcionar:

### Problema 1: Mapeamento de Unidades Incorreto

**Onde ocorre:** `src/hooks/useGoalsVsResults.ts` (linhas 31-46)

**O que acontece:**
- As metas sao guardadas com o `label` da unidade (ex: "Faturacao")
- O mapeamento no hook usa as chaves em minusculas sem acentos (ex: "faturacao")
- Quando se faz `"Faturacao".toLowerCase()` resulta em `"faturacao"` (com acento til)
- O `UNIT_CATEGORY_MAP` tem `"faturacao"` (sem acento) entao o match falha

**Dados do problema:**
```text
Metas na BD:
- unit: "Faturacao" (com F maiusculo e til)

Mapeamento atual:
- 'faturacao': 'revenue'  // sem acento - NAO FUNCIONA
- 'faturacao': 'revenue'  // com acento - funciona mas nao existe no map
```

### Problema 2: Campo de Data Errado para Vendas/Faturacao

**Onde ocorre:** `src/hooks/useGoalsVsResults.ts` (funcoes `fetchSalesCount` e `fetchRevenueSum`)

**O que acontece:**
- As queries filtram por `updated_at`
- Mas o campo correto para vendas e `expected_close_date` (data de fecho)
- Isso causa resultados incorretos pois `updated_at` pode ser alterado a qualquer momento

**Dados do problema:**
```text
Oportunidade ganhas:
- FASTCRM Basic: expected_close_date = 2026-01-31, updated_at = 2026-01-23
- FASTCRM Pro: expected_close_date = 2026-01-22, updated_at = 2026-01-23
- Gestao Redes: expected_close_date = 2026-01-21, updated_at = 2026-01-23
- Dev Software: expected_close_date = 2026-01-20, updated_at = 2026-01-20
```

Se a meta diaria for para 2026-01-26, filtrar por `updated_at` retorna 0 vendas.
Mas se filtrar por `expected_close_date` e a meta for mensal (Janeiro), retorna 4 vendas.

### Problema 3: Normalizacao de Acentos

A funcao `toLowerCase()` nao remove acentos, apenas converte para minusculas.
Precisamos normalizar as strings para garantir match independente de acentos.

---

## Solucao Proposta

### Passo 1: Expandir e Normalizar o Mapeamento de Unidades

Atualizar `UNIT_CATEGORY_MAP` para incluir todas as variacoes possiveis:

```typescript
// Funcao auxiliar para normalizar strings (remover acentos)
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

const UNIT_CATEGORY_MAP: Record<string, UnitCategory> = {
  // Vendas
  'vendas': 'sales',
  'sales': 'sales',
  'negocios': 'sales',
  'contratos': 'sales',
  
  // Leads
  'leads': 'leads',
  
  // Oportunidades
  'oportunidades': 'opportunities',
  'opportunities': 'opportunities',
  
  // Reunioes
  'reunioes': 'meetings',
  'reunions': 'meetings',
  'meetings': 'meetings',
  
  // Tarefas
  'tarefas': 'tasks',
  'tasks': 'tasks',
  
  // Faturacao/Revenue
  'faturacao': 'revenue',
  'faturacao': 'revenue',  // variante
  'revenue': 'revenue',
  'euros': 'revenue',
  '€ (euro)': 'revenue',
  
  // Contactos
  'contactos': 'leads',
  'contacts': 'leads',
};
```

E usar a funcao `normalizeString` ao procurar no mapa:
```typescript
const unitCategory = typedGoal.unit 
  ? UNIT_CATEGORY_MAP[normalizeString(typedGoal.unit)] 
  : null;
```

### Passo 2: Corrigir Campo de Data para Vendas

Alterar as funcoes `fetchSalesCount` e `fetchRevenueSum` para usar `expected_close_date`:

```typescript
// ANTES (incorreto):
.gte('updated_at', periodStart)
.lte('updated_at', periodEnd)

// DEPOIS (correto):
.gte('expected_close_date', periodStart)
.lte('expected_close_date', periodEnd)
```

### Passo 3: Adicionar Logs para Debug

Adicionar console.log temporario para verificar se os mapeamentos estao a funcionar:

```typescript
console.log('Goal unit:', typedGoal.unit);
console.log('Normalized:', normalizeString(typedGoal.unit || ''));
console.log('Category found:', unitCategory);
```

---

## Ficheiros a Modificar

| Ficheiro | Alteracao |
|----------|-----------|
| `src/hooks/useGoalsVsResults.ts` | Corrigir mapeamento + campos de data + normalizacao |

---

## Resultado Esperado

Apos as correcoes:

**Meta: Faturacao Diaria (26 Jan) - Target: 500 EUR**
- Valor real: 0 EUR (nenhuma oportunidade fechou a 26 Jan)
- Status: Atrasada

**Meta: Faturacao Mensal (Jan 2026) - Target: 10.000 EUR**
- Valor real: 1.722 EUR (4 oportunidades ganhas em Janeiro)
- Progresso: 17.22%
- Status: Atrasada (estamos a 26 Jan e so temos 17% de 10k)

**Meta: Faturacao Trimestral (Q1 2026) - Target: 30.000 EUR**
- Valor real: 1.722 EUR
- Progresso: 5.74%
- Status: Em progresso (ainda ha tempo)

---

## Sequencia de Implementacao

1. Criar funcao `normalizeString` para remover acentos
2. Expandir `UNIT_CATEGORY_MAP` com todas as variacoes de unidades
3. Usar `normalizeString` no lookup do mapa
4. Alterar `fetchSalesCount` para usar `expected_close_date`
5. Alterar `fetchRevenueSum` para usar `expected_close_date`
6. Testar com as metas existentes
