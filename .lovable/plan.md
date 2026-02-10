

# Redesign da Pagina do Forum

## Problema Actual

A pagina do Forum (/dashboard/fastclub/forum) e muito basica: layout de coluna unica, cards simples sem avatares, sem pesquisa, sem ordenacao, sem sidebar, e sem integracao com IA. Contrasta com a experiencia premium do FastClub hub.

## Melhorias a Implementar

### 1. Layout com Sidebar
Adoptar o layout de 2 colunas que ja existe no FastClub hub, reutilizando o `CommunitySidebar` existente no lado direito.

### 2. Header Estilizado
Substituir o header simples por um mini-hero com gradiente subtil, icone animado e estatisticas rapidas (total de topicos, respostas totais, membros activos).

### 3. Cards Sociais
Substituir os cards basicos pelo componente `SocialPostCard` ja existente, que inclui avatares, hashtags destacados, badges de categoria, icones de pinned/locked e barra de interacoes (likes, comentarios, views).

### 4. Pesquisa e Ordenacao
Adicionar barra de pesquisa com filtro client-side por titulo/conteudo e botoes de ordenacao:
- **Recentes** (por updated_at desc, default)
- **Populares** (por views_count desc)
- **Mais comentados** (por replies_count desc)

### 5. Canal Activo com Destaque
Quando se filtra por canal, mostrar um banner informativo com o nome, icone e descricao do canal seleccionado.

### 6. Botao "+ Canal" para Admins
Adicionar o botao de criacao de canal na barra de categorias, reutilizando o `AddChannelDialog` existente.

### 7. Dialog de Criacao Melhorado com IA
Enriquecer o dialog de novo topico com:
- Selecao de canal com icones
- Sugestao de titulo via IA (botao Sparkles que chama edge function com gemini-2.5-flash para sugerir 3 titulos baseados no conteudo)
- Contador de caracteres no conteudo
- Preview visual antes de publicar

### 8. Edge Function para Sugestao de Titulo
Nova edge function `community-ai-suggest-title`:
- Recebe o conteudo parcial do post
- Retorna 3 sugestoes de titulo
- Usa modelo gemini-2.5-flash via Lovable AI

### 9. Animacoes
Usar framer-motion para:
- Entrada escalonada (stagger) dos cards
- Transicao suave nos filtros de categoria
- Hover nos cards com sombra

## Detalhes Tecnicos

### Ficheiros a Modificar/Criar

| Ficheiro | Descricao |
|---|---|
| `src/pages/community/ForumPage.tsx` | Redesign completo: layout 2 colunas, SocialPostCard, pesquisa, ordenacao, header com gradiente, dialog IA, AddChannelDialog |
| `supabase/functions/community-ai-suggest-title/index.ts` | Nova edge function para sugestao de titulos via gemini-2.5-flash |

### Componentes Reutilizados (sem alteracao)
- `SocialPostCard` -- cards de topicos estilo social
- `CommunitySidebar` -- sidebar com info da comunidade, membros, admins
- `AddChannelDialog` -- dialog para criar canais

### Ordenacao (client-side)
Os 3 modos ordenam o array `topics` ja carregado:
- Recentes: `updated_at` desc
- Populares: `views_count` desc
- Mais comentados: `replies_count` desc

### Pesquisa (client-side)
Filtro por `title` e `content` com `toLowerCase().includes(query)`.

### IA -- Sugestao de Titulo
Edge function recebe `{ content: string }` e devolve `{ suggestions: string[] }`. Botao Sparkles no dialog de criacao faz fetch a esta funcao e mostra as sugestoes como botoes clicaveis que preenchem o campo titulo.

### Nao sao necessarias alteracoes na base de dados.

