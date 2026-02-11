

# Alterar Rota Publica de `/community/` para `/club/`

## Resumo

Substituir todas as referencias ao path `/community/` por `/club/` nas rotas publicas e links gerados. Isto afeta rotas, navegacao interna, link publico nas definicoes, e o email de convite.

## Ficheiros a Alterar

| Ficheiro | O que muda |
|---|---|
| `src/App.tsx` | Rotas: `/community/:slug` -> `/club/:slug` (3 rotas) |
| `src/components/community/CommunitySettingsDialog.tsx` | Link publico: `/community/${slug}` -> `/club/${slug}` |
| `src/pages/community/PublicCommunityPage.tsx` | Navegacao interna: `/community/` -> `/club/` |
| `src/pages/community/PublicCommunityTopicPage.tsx` | Navegacao interna: `/community/` -> `/club/` |
| `src/pages/community/CommunityAuthPage.tsx` | Redirect e navegacao: `/community/` -> `/club/` |
| `supabase/functions/send-community-invite/index.ts` | URL do convite: `/community/` -> `/club/` |

## Detalhes

Todas as ocorrencias de `/community/${slug}` passam a `/club/${slug}`:

- Rotas no App.tsx (3 rotas publicas)
- Links de navegacao nos componentes publicos (voltar, auth redirects)
- Construcao do link publico nas definicoes
- URL no email de convite

O resultado final sera: `https://fastcrm.metodopare.ai/club/fastclub`

Nenhuma alteracao na base de dados e necessaria -- apenas paths no frontend e na edge function.

