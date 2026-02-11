
# Redesign da Pagina Publica `/club/:slug`

## Problema

A pagina publica actual e muito basica - apenas um banner, lista de canais e topicos numa listagem simples. O dashboard interno (`FastClubPage`) tem um design muito mais rico com hero animado, tabs, social cards, sidebar, etc.

## Solucao

Redesenhar completamente o `PublicCommunityPage.tsx` para ter o mesmo look & feel do `FastClubPage`, adaptado ao contexto publico (sem funcionalidades de admin/gamificacao).

## O que vai mudar visualmente

- Hero com gradiente e pattern de fundo (como o dashboard), com logo, nome, descricao e stats animados
- Barra de tabs: Discussao, Eventos, Acerca de (sem Classificacao/Membros que sao privados)
- Tab Discussao: usa o componente `SocialPostCard` em vez da listagem simples, com categorias como pills horizontais
- Tab Eventos: cards com design melhorado
- Tab Acerca de: descricao, stats, links da comunidade
- CTA fixo em baixo para utilizadores nao autenticados (mantido)
- Animacoes com `framer-motion` (fadeUp)

## Detalhes Tecnicos

### Ficheiro a modificar

`src/pages/community/PublicCommunityPage.tsx` - reescrita completa

### Componentes reutilizados do dashboard

- `SocialPostCard` - para renderizar topicos no estilo social
- `CommunityEventBanner` - para mostrar proximo evento em destaque

### Hooks ja existentes (sem alteracoes)

- `usePublicCommunitySettings` - settings da comunidade
- `usePublicCommunityTopics` - topicos
- `usePublicCommunityCategories` - categorias/canais
- `usePublicCommunityEvents` - eventos

### Estrutura da nova pagina

```text
+-----------------------------------------------+
|  HERO (gradiente + pattern)                    |
|  [Logo] Nome da Comunidade                     |
|          Descricao                             |
|  Stats: X Topicos | Y Canais | Z Eventos      |
+-----------------------------------------------+
|  [Discussao] [Eventos] [Acerca de]   (tabs)   |
+-----------------------------------------------+
|                                                |
|  Tab Discussao:                                |
|    [Evento destaque banner]                    |
|    [Categoria pills: Fastcrm | Novidades...]  |
|    [SocialPostCard]                            |
|    [SocialPostCard]                            |
|    ...                                         |
|                                                |
|  Tab Eventos:                                  |
|    Cards com data, titulo, descricao           |
|                                                |
|  Tab Acerca de:                                |
|    Descricao, stats, links                     |
|                                                |
+-----------------------------------------------+
|  CTA fixo (Entrar / Registar) se nao logado   |
+-----------------------------------------------+
```

### Dependencias adicionadas ao ficheiro

- `framer-motion` (ja instalado)
- `Tabs, TabsList, TabsTrigger, TabsContent` do radix
- `SocialPostCard` componente existente
- `CommunityEventBanner` componente existente

### Nenhuma alteracao na base de dados ou hooks necessaria
