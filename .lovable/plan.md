
# Adicionar Brief Executivo ao Dashboard

## Problema
O widget de briefing executivo nunca foi adicionado ao Dashboard -- existe apenas na pagina de Estrategia (/dashboard/strategy). Por isso nao aparece.

## Solucao

### 1. Criar novo componente `ExecutiveBriefWidget`
Ficheiro: `src/components/dashboard/ExecutiveBriefWidget.tsx`

Um card compacto que usa o hook `useStrategicBriefs` existente e mostra:
- Titulo "Brief Executivo" com icone Brain
- Timestamp relativo do ultimo brief (ex: "ha 2 dias")
- Resumo executivo (3 linhas max com line-clamp)
- Oportunidade (compacta, com icone verde)
- Risco (compacto, com icone vermelho)
- Botao "Ver completo" que navega para /dashboard/strategy
- Botao "Atualizar" para regenerar o brief
- Estado vazio com botao "Gerar Brief" se ainda nao existir nenhum

### 2. Adicionar ao Dashboard
Ficheiro: `src/pages/Dashboard.tsx`

Importar o `ExecutiveBriefWidget` e colocar na terceira coluna do grid, antes do `ForecastConfidenceCard`:

```text
Coluna 3 (actualizada):
  - ExecutiveBriefWidget   <-- NOVO
  - ForecastConfidenceCard
  - PipelineComparisonCard
  - UpcomingBirthdaysWidget
```

## Ficheiros a alterar

| Ficheiro | Accao |
|---|---|
| `src/components/dashboard/ExecutiveBriefWidget.tsx` | Criar (novo componente compacto) |
| `src/pages/Dashboard.tsx` | Importar e adicionar na coluna 3 do grid |

## Notas
- Reutiliza o hook `useStrategicBriefs` que ja existe -- sem duplicacao de logica
- O widget e compacto (line-clamp nos textos) para caber no grid de 3 colunas
- Se nao houver brief gerado, mostra estado vazio com CTA para gerar o primeiro
