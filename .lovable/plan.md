

# Classificacao Epica com Engajamento Maximo

## Visao Geral

Transformar o leaderboard atual (uma lista simples) numa experiencia visual premium e gamificada, inspirada em jogos e plataformas competitivas.

## Componentes Visuais

### 1. Podio Top 3 com Destaque Visual
Em vez de listar as 3 primeiras posicoes como as restantes, criar um **podio visual** com cards elevados:
- **1. lugar**: Card central maior com borda dourada, animacao de brilho (shimmer), icone de coroa, tamanho XL
- **2. lugar**: Card a esquerda com borda prateada, tamanho medio
- **3. lugar**: Card a direita com borda bronze, tamanho medio
- Cada card mostra avatar grande, nome, tier badge e pontos com animacao de contagem

### 2. Barra de Progresso do Tier
Para cada membro no leaderboard, mostrar uma mini barra de progresso visual ate ao proximo tier:
- Bronze -> Silver -> Gold -> Platinum
- Cor da barra muda conforme o tier atual
- Texto "Faltam X pts para Silver"

### 3. Stats Banner no Topo
Painel de estatisticas gerais da comunidade antes do leaderboard:
- Total de pontos distribuidos
- Membro mais activo (mais pontos no ultimo mes)
- Numero de membros com pontos
- Animacao de numeros a contar (framer-motion)

### 4. Badges de Conquista
Icones visuais ao lado do nome baseados em marcos:
- Icone de fogo para membros com actividade consecutiva
- Icone de estrela para top 5 historico
- Icone de seta para quem subiu posicoes recentemente

### 5. Animacoes com Framer Motion
- Entrada escalonada (stagger) dos cards do leaderboard
- Podio aparece com animacao de "reveal" de baixo para cima
- Numeros de pontos animam de 0 ate ao valor real (countUp)
- Hover nos cards expande ligeiramente com sombra

### 6. Filtros de Periodo
Permitir ver a classificacao por diferentes periodos:
- Sempre (lifetime -- default)
- Este mes
- Esta semana
- Hoje

## Detalhes Tecnicos

### Ficheiro a Modificar

| Ficheiro | Descricao |
|---|---|
| `src/components/community/CommunityLeaderboard.tsx` | Redesign completo com podio, animacoes, stats e filtros |

### Dados
Reutilizar a tabela `loyalty_points` existente (campos: `user_id`, `lifetime_points`, `balance`, `tier`).
Para filtros temporais, usar `loyalty_points_transactions` agrupando por `user_id` e somando `points` filtrado por data.

### Dependencias Existentes
- `framer-motion` (ja instalado) -- animacoes de entrada, countUp, hover
- `lucide-react` -- icones (Trophy, Crown, Flame, Star, TrendingUp, Medal)
- `recharts` (ja instalado) -- opcional: mini grafico de actividade no card

### Estrutura do Componente

```text
CommunityLeaderboard
+-- StatsBar (total pontos, membro mais activo, total membros)
+-- PeriodFilter (Sempre | Este mes | Esta semana | Hoje)
+-- PodiumSection (top 3 com cards elevados e animacao)
|   +-- PodiumCard (1o, 2o, 3o com estilos distintos)
+-- LeaderboardList (4o em diante, com stagger animation)
    +-- LeaderboardRow (avatar, nome, tier badge, barra progresso, pontos)
```

### Animacoes Especificas
- **CountUp**: Pontos animam de 0 ao valor final em 1.5s com easing
- **Stagger**: Cada row do leaderboard aparece com 50ms de delay
- **Podio reveal**: Cards do podio escalam de 0.8 a 1 com spring animation
- **Shimmer no 1o lugar**: Gradiente animado na borda do card dourado

### Tier Progress
Calcular progresso ate ao proximo tier usando thresholds fixos:
- Bronze: 0-499 pts
- Silver: 500-1999 pts
- Gold: 2000-4999 pts
- Platinum: 5000+ pts

Barra de progresso mostra percentagem ate ao proximo nivel.

