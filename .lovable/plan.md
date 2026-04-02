

# Corrigir Atualização Automática do Sales Performance Engine

## Diagnóstico

O problema tem **duas causas**:

### 1. Bug crítico: nome de coluna errado (causa raiz dos zeros)
A função `useRecalculateScores` usa `.eq("assigned_to", uid)` para consultar oportunidades, mas a coluna real é `owner_id`. Resultado: **todas as queries de revenue e pipeline retornam 0**, mesmo havendo dados reais (ex: "Renovação Kommo" 350€ está como `won` com `owner_id` definido).

### 2. Sem recálculo automático
Os scores só são atualizados quando o utilizador clica em "Recalcular". Não há nenhum mecanismo automático.

## Solução

### 1. Corrigir coluna em `usePerformanceScores.ts` (linhas 148-151)
Substituir `assigned_to` por `owner_id` nas queries de oportunidades:
```typescript
// Antes:  .eq("assigned_to", uid)
// Depois: .eq("owner_id", uid)
```

### 2. Auto-recálculo ao abrir a página
No `PerformanceDashboardPage.tsx`, adicionar um `useEffect` que dispara `recalculate.mutate("weekly")` automaticamente quando:
- Os scores estão vazios ou todos a zero
- Não foi recalculado nos últimos 5 minutos (guardar timestamp em `sessionStorage`)

Isto garante que os dados estão sempre frescos sem sobrecarregar a API.

## Ficheiros alterados

| Ficheiro | Alteração |
|---|---|
| `src/hooks/usePerformanceScores.ts` | Corrigir `assigned_to` → `owner_id` nas queries de oportunidades (linhas 148-151) |
| `src/pages/performance/PerformanceDashboardPage.tsx` | Adicionar auto-recálculo ao carregar a página quando scores estão desatualizados |

## Impacto

- Os KPIs (Receita Fechada, Pipeline Gerado) passarão a mostrar valores reais
- O leaderboard mostrará scores corretos
- A página atualiza automaticamente sem depender do clique manual

