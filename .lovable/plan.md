
# Transformar a comunidade num hub de engagement social

Analise das plataformas de referencia (Reddit, Pare Connect) e do funil Networking - Educacao - Necessidade - Demonstracao - Resultado - Upgrade para identificar as lacunas criticas.

## Lacunas identificadas vs plataformas de referencia

1. **Sem identidade do autor** -- os posts e respostas nao mostram quem escreveu (nome, avatar)
2. **Sem sistema de reacoes** -- a tabela `forum_reactions` ja existe na base de dados mas nao e usada na UI
3. **Sem partilha de posts** -- nao ha botao de partilha (WhatsApp, copiar link)
4. **Criacao de topico basica** -- falta toggle de comentarios, barra de formatacao, e experiencia mais rica
5. **Pagina de topico pobre** -- sem avatar do autor, sem reacoes, sem contagem de likes
6. **Feed sem engagement visual** -- o SocialPostCard mostra "views" como likes (Heart icon com views_count)

## Plano de implementacao (por prioridade de impacto)

### Fase 1 -- Identidade e autoria (alto impacto no Networking)

**Objetivo**: Mostrar quem esta a falar para criar conexoes humanas.

- Alterar as queries de topicos e posts para fazer JOIN com a tabela `profiles` (full_name, avatar_url)
- Atualizar `SocialPostCard` para mostrar avatar real e nome do autor
- Atualizar `ForumTopicPage` para mostrar avatar e nome no topico original e em cada resposta
- Mostrar "ha X minutos" com avatar circular ao lado

**Ficheiros**: `useForum.ts`, `SocialPostCard.tsx`, `ForumTopicPage.tsx`

### Fase 2 -- Sistema de reacoes/likes (alto impacto no Engagement)

**Objetivo**: Permitir interacao rapida sem escrever texto.

A tabela `forum_reactions` ja existe com colunas: `workspace_id`, `post_id`, `topic_id`, `user_id`, `reaction_type`.

- Criar hooks `useToggleForumReaction` e `useForumReactionCounts` em `useForumMutations.ts`
- Adicionar botoes de reacao ao `SocialPostCard` (like com contagem real em vez de views)
- Adicionar reacoes na `ForumTopicPage` para o topico e cada resposta
- Suporte para tipos: like, love, insightful (3 reacoes simples)

**Ficheiros**: `useForumMutations.ts`, `useForum.ts`, `SocialPostCard.tsx`, `ForumTopicPage.tsx`

### Fase 3 -- Partilha social de posts (medio impacto na Demonstracao)

**Objetivo**: Amplificar conteudo para fora da comunidade.

- Adicionar botao "Partilhar" no `SocialPostCard` e na `ForumTopicPage`
- Opcoes: Copiar link, WhatsApp, Facebook
- URL de partilha: `/club/{slug}/topic/{topicId}` (ja existe a rota publica)

**Ficheiros**: `SocialPostCard.tsx`, `ForumTopicPage.tsx`

### Fase 4 -- Criacao de topico enriquecida (medio impacto na Educacao)

**Objetivo**: Experiencia de publicacao mais rica, inspirada no Pare Connect.

- Mostrar avatar e nome do utilizador no topo do dialog ("Jorge Cardoso publicar in FastClub")
- Placeholder mais convidativo: "O que esta na sua mente?"
- Toggle "Ativar comentarios" (novo campo `comments_enabled` na tabela `forum_topics`)
- Barra de acoes inferior com emojis e hashtags
- Botoes "Cancelar" e "Publicar Postagem" lado a lado no rodape

**Ficheiros**: `ForumPage.tsx` (dialog de criacao), migracao DB para `comments_enabled`

### Fase 5 -- Pagina de topico melhorada (medio impacto no Resultado)

**Objetivo**: Experiencia imersiva de leitura e discussao.

- Layout com avatar grande do autor, nome e data relativa
- Botoes de reacao inline (like, love, insightful) com contagens
- Botao de partilha
- Respostas com avatar, nome, data relativa e reacoes
- Indicador visual de "Melhor Resposta" mais proeminente

**Ficheiros**: `ForumTopicPage.tsx`

## Resumo de ficheiros

| Ficheiro | Acao |
|---|---|
| `src/hooks/useForum.ts` | Editar -- JOIN com profiles para trazer author_name e avatar_url, query de reacoes |
| `src/hooks/useForumMutations.ts` | Editar -- adicionar `useToggleForumReaction` |
| `src/components/community/SocialPostCard.tsx` | Editar -- avatar real, nome do autor, reacoes, botao partilhar |
| `src/pages/community/ForumTopicPage.tsx` | Editar -- autor com avatar, reacoes, partilha |
| `src/pages/community/ForumPage.tsx` | Editar -- dialog de criacao enriquecido com avatar, toggle comentarios, layout Pare Connect |
| Migracao DB | `comments_enabled boolean default true` na tabela `forum_topics` |

Total: 5 ficheiros editados, 1 migracao DB.

## Secao tecnica

### Query com JOIN de profiles
```sql
SELECT t.*, p.full_name as author_name, p.avatar_url as author_avatar
FROM forum_topics t
LEFT JOIN profiles p ON p.user_id = t.author_id
```

No Supabase JS:
```typescript
supabase.from("forum_topics")
  .select("*, profiles!forum_topics_author_id_fkey(full_name, avatar_url)")
```

Nota: Se a FK nao existir diretamente, faz-se a query de profiles separada com os author_ids dos topicos.

### Reacoes -- toggle
```typescript
// Verificar se ja reagiu
const existing = await supabase.from("forum_reactions")
  .select("id").eq("topic_id", topicId).eq("user_id", userId).eq("reaction_type", type).maybeSingle();

if (existing.data) {
  await supabase.from("forum_reactions").delete().eq("id", existing.data.id);
} else {
  await supabase.from("forum_reactions").insert({ workspace_id, topic_id, user_id, reaction_type: type });
}
```

### Migracao DB
```sql
ALTER TABLE forum_topics ADD COLUMN comments_enabled boolean DEFAULT true;
```
