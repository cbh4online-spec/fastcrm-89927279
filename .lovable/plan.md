

# Melhorar a Pagina "Meus Anuncios"

## Problema Atual

A pagina esta muito basica e vazia visualmente. Parece uma lista simples sem dashboard de vendedor, sem resumo de performance, e o estado vazio nao inspira acao. Para competir com Vinted/OLX, precisa de parecer um painel profissional de vendas.

## Melhorias Planeadas

### 1. Dashboard de KPIs no Topo
Adicionar cards de resumo antes da lista de anuncios:
- Total de anuncios ativos
- Total de visualizacoes
- Total de favoritos recebidos
- Total de mensagens/ofertas

### 2. Estado Vazio Inspirador
Substituir o texto simples "Ainda nao tens anuncios" por uma secao com:
- Ilustracao/icone grande atrativo (Package icon)
- Titulo motivacional
- 3 beneficios de vender na plataforma (icones + texto)
- CTA mais visivel

### 3. Cards de Anuncio Melhorados
Cada card passa a ter:
- Imagem maior (80x80 em vez de 64x64)
- Data de criacao ("ha X dias")
- Condicao do item (Novo, Usado, etc.)
- Botoes de partilha integrados (WhatsApp, copiar link)
- Separacao visual entre info e acoes com layout mais limpo
- Dropdown de acoes em vez de botoes soltos (mais limpo)

### 4. Filtros por Estado
Tabs ou chips para filtrar anuncios por estado: Todos, Ativos, Pausados, Vendidos - para quem tem muitos anuncios.

### 5. Skeleton Loading
Substituir o texto "A carregar..." por skeleton cards animados.

## Seccao Tecnica

### Ficheiro Modificado: `src/pages/c2c/C2CMyListings.tsx`

Reescrever com:
- Cards de KPI no topo (usando dados agregados dos listings)
- Tabs de filtro por estado (all, active, paused, sold)
- Cards de anuncio redesenhados com mais info e dropdown de acoes
- Estado vazio com ilustracao e beneficios
- Skeleton loading com 3 cards placeholder
- Integracao do componente ShareButtons por anuncio
- Formatacao de datas relativas com date-fns

### Ficheiro Modificado: `src/components/c2c/ListingStats.tsx`

Sem alteracoes estruturais, apenas garantir que o componente esta bem integrado.

### Sem alteracoes de base de dados
Tudo usa dados ja existentes (views_count, favorites_count, messages_count, status).

