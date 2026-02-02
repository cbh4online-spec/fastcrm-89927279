
# Plano: Limitar Texto com Caracteres e Melhorar Renderização no PDF

## Problema Actual

O `line-clamp` do Tailwind CSS utiliza `-webkit-line-clamp` que **não é suportado pelo html2canvas**. Por isso, o texto é cortado visualmente no browser mas quando o PDF é gerado, o texto transborda porque html2canvas não interpreta esta propriedade CSS.

| Problema | Causa |
|----------|-------|
| `line-clamp-2` não funciona no PDF | html2canvas não suporta `-webkit-line-clamp` |
| Texto transborda da célula | Sem limite físico de caracteres |
| Alturas de linha inconsistentes | Conteúdo variável sem truncagem real |

---

## Solução: Truncar Texto com JavaScript

Em vez de depender do CSS `line-clamp`, vamos truncar o texto directamente com JavaScript antes de renderizar. Isto garante que o texto é fisicamente cortado e funciona tanto no browser como no PDF.

### Função de Truncagem

```typescript
// Função helper para truncar texto
const truncateText = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};
```

### Aplicar nos Dados

```typescript
// Nome do produto - máximo 60 caracteres
<p className={cn("font-medium text-gray-900 text-sm leading-tight", !isEnabled && "line-through text-gray-500")}>
  {truncateText(item.name, 60)}
</p>

// Descrição - máximo 80 caracteres
{item.description && (
  <p className={cn("text-xs text-gray-500 mt-0.5", !isEnabled && "line-through")}>
    {truncateText(item.description, 80)}
  </p>
)}
```

---

## Alterações Detalhadas

### `src/components/proposals/ProposalClientDocument.tsx`

1. **Adicionar função `truncateText`** (após os imports, antes do componente)

2. **Truncar nome do produto** (linha ~291-293):
   - Remover `break-words` 
   - Aplicar `truncateText(item.name, 60)`

3. **Truncar descrição** (linha ~294-298):
   - Remover `line-clamp-2` e `break-words`
   - Aplicar `truncateText(item.description, 80)`

---

## Limites Propostos

| Campo | Limite | Justificação |
|-------|--------|--------------|
| Nome do produto | 60 caracteres | Cabe numa linha na coluna de 47-55% |
| Descrição | 80 caracteres | Descrição curta e legível |

---

## Resultado Esperado

| Antes | Depois |
|-------|--------|
| Texto transborda no PDF | Texto truncado com "..." |
| `line-clamp` ignorado pelo html2canvas | Truncagem física funciona sempre |
| Alturas de linha inconsistentes | Alturas previsíveis e uniformes |

---

## Estimativa

| Ficheiro | Linhas |
|----------|--------|
| ProposalClientDocument.tsx | ~10 linhas alteradas/adicionadas |
| **Total** | ~10 linhas |

