
# Melhorar Pagina Gestao de Vendedores - Responsive e Design Profissional

## Problema Atual

A pagina "Gestao de Vendedores" tem varios problemas visiveis no screenshot:
- Sem padding lateral (conteudo encostado as bordas)
- Cards de estatisticas sem design coeso (primeiro card com fundo diferente dos outros)
- Tabela com muitas colunas que nao funciona em mobile
- Header sem hierarquia visual forte
- Estado vazio pobre e sem inspiracao
- Sem uso dos componentes Nexus (NexusPageHeader, NexusPageSection, NexusStatCard) ja existentes no projeto

## Melhorias Planeadas

### 1. Usar Componentes Nexus Existentes
Substituir o header manual pelo `NexusPageHeader` e os stat cards pelo `NexusStatCard` com cores diferenciadas por estado, trazendo consistencia visual com o resto do dashboard.

### 2. Layout Responsive
- Stats: grid 2 colunas em mobile, 5 em desktop
- Tabela: em mobile, substituir por cards empilhados com as informacoes essenciais (nome, estado, acoes)
- Header: botoes empilham verticalmente em mobile
- Barra de pesquisa e acoes bulk com flex-wrap

### 3. Design Visual Melhorado
- Adicionar padding geral com container (`max-w-7xl mx-auto px-4`)
- Stat cards com icones coloridos e hover states
- Tabs de navegacao (Vendedores/Convites) com componente `TabsList` do Radix em vez de botoes manuais
- Estado vazio com ilustracao maior, subtitulo motivacional e CTA para convidar vendedor
- Skeleton loading melhorado com cards em vez de barras simples

### 4. Tabela Adaptativa
- Desktop: tabela completa com todas as colunas
- Mobile: cards com layout vertical mostrando nome, estado, vendas e botoes de acao
- Usar o hook `useIsMobile` ja existente para alternar entre layouts

## Seccao Tecnica

### Ficheiro Modificado: `src/pages/c2c/C2CSellersAdmin.tsx`

Alteracoes principais:
- Importar e usar `NexusPageHeader` para o titulo da pagina com icone, subtitulo e botoes de acao
- Importar e usar `NexusStatCard` para os 5 cards de estatisticas com cores diferenciadas (primary, amber, emerald, rose, violet)
- Importar `useIsMobile` para layout condicional
- Usar `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent` do Radix para Vendedores/Convites em vez de botoes manuais
- Em mobile: renderizar cards em vez da tabela, cada card com nome, badge de estado, metricas resumidas e botoes de acao
- Melhorar o estado vazio com icone maior, texto motivacional e botao "Convidar Vendedor"
- Adicionar padding e max-width ao container principal
- Skeleton loading com grid de cards placeholder

### Sem alteracoes de base de dados
Tudo usa dados ja existentes.
