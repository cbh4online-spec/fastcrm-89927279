

# Corrigir Visualizacao de Detalhes da Proposta

## Problema
Quando se clica para ver os detalhes de uma proposta (ex: a partir da ficha de contacto), a pagina `/dashboard/proposals/:id` renderiza um **Dialog (modal overlay)** por cima do dashboard. Isto cria uma experiencia visual partida -- ve-se a pagina anterior por tras e o conteudo fica sobreposto de forma confusa.

## Solucao
Transformar a pagina de detalhe da proposta (`ProposalDetailPage`) numa **pagina completa** com layout proprio, em vez de usar um Dialog overlay. O componente `ProposalDetailDialog` continuara a funcionar como dialog quando usado na listagem de propostas.

## Alteracoes Previstas

### 1. Criar componente `ProposalDetailContent`
Extrair todo o conteudo interior do `ProposalDetailDialog` (header, tabs, step navigation, formularios) para um componente reutilizavel que pode ser renderizado tanto dentro de um Dialog como inline numa pagina.

- Novo ficheiro: `src/components/proposals/ProposalDetailContent.tsx`
- Contem toda a logica e UI de detalhe da proposta (1100+ linhas do dialog atual)
- Aceita uma prop `renderMode: "dialog" | "page"` para pequenos ajustes de layout (ex: botao voltar na versao pagina)

### 2. Atualizar `ProposalDetailDialog`
Simplificar para ser apenas o wrapper Dialog que renderiza `ProposalDetailContent` com `renderMode="dialog"`.

### 3. Refazer `ProposalDetailPage`
Em vez de renderizar o `ProposalDetailDialog`, renderiza `ProposalDetailContent` diretamente dentro do `DashboardLayout` com `renderMode="page"`, incluindo:
- Botao "Voltar" que navega para a pagina anterior (ou para `/dashboard/proposals`)
- O conteudo ocupa toda a area disponivel sem overlay

## Detalhes Tecnicos

### Estrutura do `ProposalDetailContent`

```text
ProposalDetailContent (renderMode)
  |-- Header (titulo, status, badges, acoes)
  |-- Modo Edicao: StepNavigation + StepContent
  |-- Modo Visualizacao: Tabs (Preview/Versoes/Atividade)
  |-- DocumentPreviewDialog (sub-dialog)
```

### Ajustes de layout por modo

| Aspeto | Dialog | Pagina |
|--------|--------|--------|
| Container | `DialogContent max-w-7xl h-[95vh]` | `div h-full` dentro do DashboardLayout |
| Fechar | Botao X do dialog | Botao "Voltar" com navegacao |
| Scroll | Interno ao dialog | Interno a area de conteudo |

### Ficheiros afetados
- `src/components/proposals/ProposalDetailContent.tsx` -- **novo** (conteudo extraido)
- `src/components/proposals/ProposalDetailDialog.tsx` -- simplificado (wrapper dialog)
- `src/pages/ProposalDetail.tsx` -- refatorizado (renderiza inline)

