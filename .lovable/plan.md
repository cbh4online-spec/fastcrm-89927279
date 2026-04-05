

# Plano: Corrigir Responsive Mobile da Página de Detalhe de Oportunidade

## Diagnóstico

A partir do screenshot (página de detalhe do deal "Certificação" em mobile ~393px), identifico:

1. **Header Actions overflow** — 6 botões inline (Compor email, Copy, Share, Expand, Star, More) ocupam demasiado espaço horizontal ao lado do título
2. **TabsList com 11+ tabs** — wrapping em múltiplas linhas consome ~100px+ de altura vertical, empurrando o conteúdo para fora do viewport
3. **Sidebar always visible** — `OpportunityDetailSidebar` renderiza abaixo do conteúdo em mobile, adicionando scroll extenso sem possibilidade de colapsar

## Ficheiros a Alterar

### 1. `src/components/opportunities/OpportunityDetailPage.tsx`
- **Header actions**: Em mobile, esconder botões individuais (Copy, Share, Expand, Star) — manter apenas "Compor email" e "⋯" (MoreHorizontal). Já existe o dropdown com Copy URL/ID, basta mover os outros para lá
- **TabsList**: Converter para scroll horizontal com `overflow-x-auto` e `flex-nowrap` em vez de `flex-wrap`, impedindo que as tabs ocupem múltiplas linhas
- **Sidebar**: Esconder sidebar em mobile (`hidden lg:block`) — o conteúdo essencial (etapa, valor, empresa) já aparece nos Highlights Cards

### 2. `src/components/opportunities/detail/OpportunityHeaderActions.tsx`
- Agrupar botões secundários (ClipboardCopy, Share2, Maximize2, Star) dentro de `hidden md:flex` ou movê-los para o dropdown existente (MoreHorizontal)
- Em mobile: mostrar apenas "Compor email" (compacto, só ícone) + "⋯"

### 3. `src/components/opportunities/detail/OpportunityStagesStepper.tsx`
- Já tem `ScrollArea` horizontal — sem alterações necessárias

## Alterações Técnicas

```text
OpportunityDetailPage.tsx
├── TabsList: flex-wrap → flex-nowrap + overflow-x-auto
├── Sidebar: adicionar hidden lg:block
└── Title row: gap mais compacto em mobile

OpportunityHeaderActions.tsx
├── Botões Copy/Share/Expand/Star → hidden md:inline-flex
└── Mobile: apenas Mail icon-only + MoreHorizontal
```

## Critérios de Aceitação

- Sem overflow horizontal em ecrãs ≤ 414px
- Tabs navegáveis por scroll horizontal (1 linha)
- Header compacto com acesso a todas as ações via dropdown
- Conteúdo principal (Highlights + Stages) visível sem scroll excessivo
- Desktop sem alterações visuais

