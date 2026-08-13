# Ficha de Empresa/Contacto: cabeçalho limpo estilo IX

## Diagnóstico (verificado no código)

No cabeçalho de `CompanyDetailWithSidebar` acumulam-se, na mesma linha: seta voltar, paginador de registos, upload de avatar sempre visível ("Carregar imagem · PNG ou JPG, até 5MB"), título, 4+ badges (Empresa, Perfil de atividade, Indústria, Tags) e 7 botões de ação todos com o mesmo peso visual (Website, Email, Telefone, Enriquecer, Enriquecer Web, Nova Fatura, Analisar IA, Apagar). O bloco usa `bg-gradient-to-r`, o título parte em 4 linhas em ecrãs médios e a faixa financeira fica espremida em baixo.

Abaixo, `EntityHorizontalTabs` mostra 15 abas numa fila que quebra para duas linhas (Visão Geral … Dados, Contactos), o que torna a navegação confusa.

## O que vai mudar (só apresentação)

Nenhuma funcionalidade sai. Todas as ações, secções e hooks continuam acessíveis.

### 1. Cabeçalho em duas linhas, sem gradiente
- Linha 1: breadcrumb + à direita o paginador de registos (Alt+←/→ mantém-se) e o menu `...`.
- Linha 2: avatar (upload passa a acontecer no hover/clique do avatar, sem texto de ajuda permanente), nome em `text-3xl font-bold tracking-tight` com `min-w-0` para não partir, e por baixo uma linha discreta com "Empresa · Indústria · Atualizado há X".
- Um único CTA primário azul: **Nova Fatura**. Todas as restantes ações (Website, Email, Telefone, Enriquecer, Enriquecer Web, Analisar IA, Arquivar) passam para o dropdown `...`, com Arquivar destacado a destructive no fim.
- Badges: mantém-se o perfil de atividade e as tags, movidos para a linha secundária, sem cores fortes.
- Fundo `bg-background` com `border-b`; sem gradientes.

### 2. Faixa financeira mais discreta
`FinancialKPIStrip variant="header"` mantém-se, mas com labels uppercase `text-[11px]` e valores `text-base`, sem caixas com sombra — separadores verticais finos, alinhada à largura do conteúdo.

### 3. Abas agrupadas em 5 (sem perder secções)
`EntityHorizontalTabs` passa a mostrar 5 grupos com sub-abas, à semelhança do Lead Detail:

```text
Visão Geral | Atividade | Comunicação | Negócio | IA & Dados
```

- Visão Geral: overview, contacts, relationships
- Atividade: timeline, activity, notes, files, team
- Comunicação: communication, support
- Negócio: business, financial, financing
- IA & Dados: insights, data

Os IDs antigos de `MenuSection` continuam suportados por mapeamento, para não partir `useEntityCounts` nem `workspace_layout_config`. As contagens sobem para o grupo (soma) e mantêm-se na sub-aba.

### 4. Contactos/ENI
Aplicar o mesmo cabeçalho e agrupamento em `ENIContactDetailWithSidebar` para coerência.

## Detalhes técnicos

- `src/components/companies/CompanyDetailWithSidebar.tsx` e `src/components/contacts/eni/ENIContactDetailWithSidebar.tsx`: reorganizar o header, mover ações para `DropdownMenu`.
- Reutilizar `IXEntityHeader` / `IXCard` quando encaixarem, em vez de criar componentes novos.
- `src/components/entity/EntityHorizontalTabs.tsx`: mapa grupo → sub-secções + barra de sub-abas; sem alterar o tipo `MenuSection`.
- `src/components/shared/FinancialKPIStrip.tsx`: afinar a variante `header`.
- Tokens semânticos apenas; remover `bg-gradient-*` e `text-blue-600`/`bg-blue-500/10` do cabeçalho.

## Critérios de aceitação

- Um só botão primário no cabeçalho; as restantes ações continuam todas acessíveis via `...`.
- Nome nunca parte em mais de 2 linhas a 1180px.
- 5 grupos de abas numa única linha; qualquer secção antiga continua alcançável.
- Faixa financeira mantém os valores atuais.
- Consola sem erros; layout válido em md e lg.

## Riscos

- Utilizadores habituados aos botões diretos (Enriquecer, Analisar IA) passam a precisar de um clique extra no `...`. Se preferires, posso manter "Analisar IA" como ação secundária visível.
