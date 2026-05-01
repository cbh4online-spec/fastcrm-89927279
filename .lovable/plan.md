## Diagnóstico

A ficha de produto tem **19 separadores em 2 linhas** (Detalhes, Componentes, Pacotes, Financeiro, Histórico, Imagens, Progressões, Ciclos, Ficha, Publicação, Relações, Documentos, Conteúdo IA, Specs, Stock, Analytics, Ciclo de Vida, Entregáveis, Preços, Auditoria). Vários sobrepõem-se semanticamente:

- **Histórico** vs **Auditoria** vs **Preços (price-history)** — três históricos distintos.
- **Ciclos** vs **Ciclo de Vida** — nomes quase idênticos.
- **Imagens** isolado, mas os media também aparecem em "Ficha".
- **Conteúdo IA**, **Specs** e **Ficha** — todos descrevem o produto.
- **Publicação** e **Entregáveis** — relacionados com saída/distribuição.

## Decisão

Reduzir de **19 → 8 separadores** organizados por intenção (tarefa do utilizador), usando **sub-tabs internos** quando faz sentido. Zero perda de funcionalidade — todos os componentes existentes continuam a renderizar, só mudam de localização.

## Nova estrutura (1 linha de tabs)

```
[Geral] [Conteúdo] [Preços] [Stock] [Vendas] [Publicação] [Relações] [Auditoria]
```

### 1. Geral  (`general`)
- Conteúdo actual de **Detalhes** (KPIs, preço/custo, status)
- Inclui chip condicional para **Componentes** (bundle) ou **Pacotes** (sessions) — aparecem como secções colapsáveis no topo quando aplicável, em vez de tabs separadas.

### 2. Conteúdo  (`content`) — sub-tabs internas
- **Ficha** (default)
- **Imagens**
- **Specs**
- **Conteúdo IA**
- **Progressões**

### 3. Preços  (`pricing`) — sub-tabs internas
- **Financeiro** (default — margens, custos)
- **Histórico de preços** (`price-history`, condicional a `showCost`)
- **Ciclos** (regras de preço cíclicas)

### 4. Stock  (`stock`)
- Mantém-se igual (já tem KPIs + movimentos + valorização FIFO + stock mínimo editável).

### 5. Vendas  (`sales`) — sub-tabs internas
- **Analytics** (default)
- **Histórico de vendas** (actual `usage`)
- **Ciclo de Vida** (`lifecycle`)

### 6. Publicação  (`publishing`) — sub-tabs internas
- **Publicação** (default — canais, loja)
- **Entregáveis**

### 7. Relações  (`relations`) — sub-tabs internas
- **Relações** (default — produtos relacionados, cross-sell)
- **Documentos**

### 8. Auditoria  (`audit`)
- Histórico de alterações (mantém-se).

## Plano de implementação

**1. `src/components/products/ProductDetailDialog.tsx`**
- Substituir o bloco com 2× `TabsList` por **uma única `TabsList` de 8 itens**.
- Mapear o estado `tab` actual: ao receber valores antigos (`details`, `usage`, `lifecycle`, etc.) traduzir para o novo grupo + sub-tab (compatibilidade com deep-links).
- Para cada grupo com sub-tabs, criar um pequeno componente `<SubTabs>` no topo do `TabsContent` (Tabs aninhadas com visual mais leve — `bg-transparent` + `border-b`).
- Manter exactamente os mesmos `TabsContent` actuais; só mudam de pai.

**2. Persistência de sub-tab**
- Estado local `useState<Record<group, string>>` para lembrar a sub-tab activa por grupo durante a sessão.

**3. Ícones e ordem**
- Ícones consistentes (Lucide):
  - Geral: `Info` · Conteúdo: `FileText` · Preços: `DollarSign` · Stock: `Package` · Vendas: `TrendingUp` · Publicação: `Send` · Relações: `Link2` · Auditoria: `History`

**4. Sem alterações de BD nem de outros componentes**
- Os tabs filhos (`ProductSpecsTab`, `ProductStockTab`, etc.) ficam intactos.

## Critérios de aceitação

- Ficha de produto mostra **uma única linha de 8 tabs**, sempre visíveis sem wrap em ecrãs ≥1280 px.
- Todos os 19 conteúdos actuais continuam acessíveis em ≤2 cliques.
- Bundles e sessões mostram bloco contextual em "Geral" (sem perder Componentes/Pacotes).
- Nenhuma regressão funcional: edição, KPIs, stock, preços, publicação continuam a funcionar.
- Mobile: tabs scrolláveis horizontalmente; sub-tabs por baixo da tab principal.

## Riscos

- Deep-links externos a `tab=lifecycle` etc. — mitigado pelo mapa de tradução de estado.
- Utilizadores habituados ao layout antigo: mudança visual significativa, mas funções inalteradas.