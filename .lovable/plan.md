

# Publicar Comunidade com Acesso por Registo

## Objectivo

Criar uma pagina publica da comunidade acessivel via `/community/:slug` que mostra o conteudo do FastClub mas exige registo/login para interagir (comentar, criar topicos, etc.). Visitantes nao autenticados veem uma landing page com preview limitado e formulario de registo.

## Arquitectura

A pagina publica tera 2 estados:
1. **Visitante (sem login)**: Ve o hero, descricao, estatisticas, lista de topicos recentes (preview), eventos -- mas com um overlay/CTA de registo para interagir
2. **Registado (com login)**: Acesso completo ao feed, pode criar topicos, responder, participar

## O Que Vai Ser Feito

### 1. Pagina Publica da Comunidade
Nova pagina `PublicCommunityPage.tsx` que:
- Resolve o `workspace_id` a partir do slug na URL
- Carrega `community_settings`, `forum_topics`, `forum_categories`, `community_events`
- Mostra hero com banner, logo, nome e descricao
- Mostra estatisticas (topicos, membros, eventos)
- Lista os ultimos topicos como preview cards (sem poder clicar para ver detalhes se nao autenticado)
- Mostra eventos proximos
- Se o utilizador NAO esta autenticado: mostra banner fixo de CTA "Registar para participar" com botoes Login/Registo
- Se o utilizador ESTA autenticado: permite navegacao completa e interaccao

### 2. Pagina de Registo/Login para Comunidade
Nova pagina `CommunityAuthPage.tsx` com:
- Login e Registo (reutilizando a autenticacao existente do Supabase Auth)
- Apos login, redireciona de volta para `/community/:slug`
- Design simples com branding da comunidade (logo, nome)

### 3. Pagina de Topico Publica
Nova pagina `PublicCommunityTopicPage.tsx`:
- Acessivel em `/community/:slug/topic/:topicId`
- Mostra topico completo e respostas
- Se nao autenticado: mostra conteudo mas bloqueia resposta com CTA de registo
- Se autenticado: permite responder

### 4. Rota e Integracao
- Adicionar rotas publicas no `App.tsx` (fora dos CRM providers)
- Adicionar botao "Publicar" nas definicoes da comunidade que gera/mostra o link publico

### 5. Botao de Publicacao nas Definicoes
No `CommunitySettingsDialog.tsx`, no tab "Descobrir":
- Toggle "Comunidade Publicada" (usa `is_discoverable`)
- Campo slug (ja existe)
- Preview do URL publico
- Botao copiar link

## Detalhes Tecnicos

### Ficheiros a Criar

| Ficheiro | Descricao |
|---|---|
| `src/pages/community/PublicCommunityPage.tsx` | Pagina publica principal com hero, preview de topicos, CTA registo |
| `src/pages/community/PublicCommunityTopicPage.tsx` | Pagina publica de topico individual |
| `src/pages/community/CommunityAuthPage.tsx` | Login/Registo dedicado para comunidade |
| `src/hooks/usePublicCommunity.ts` | Hook para resolver workspace por slug e carregar dados publicos |

### Ficheiros a Modificar

| Ficheiro | Descricao |
|---|---|
| `src/App.tsx` | Adicionar 3 rotas publicas: `/community/:slug`, `/community/:slug/topic/:topicId`, `/community/:slug/auth` |
| `src/components/community/CommunitySettingsDialog.tsx` | Melhorar tab "Descobrir" com toggle publicacao, preview URL e botao copiar |

### Hook `usePublicCommunity`
```text
- Recebe slug como parametro
- Faz query a community_settings WHERE slug = :slug AND is_discoverable = true
- Retorna workspace_id, settings, topics, categories, events
- Funciona sem autenticacao (RLS ja permite SELECT publico)
```

### Rotas Publicas (fora dos CRM providers)
```text
/community/:slug          -> PublicCommunityPage
/community/:slug/topic/:topicId -> PublicCommunityTopicPage
/community/:slug/auth     -> CommunityAuthPage (login/registo)
```

### Fluxo do Visitante
```text
1. Acede a /community/fastclub
2. Ve hero + preview dos topicos + eventos
3. Tenta interagir -> redirecionado para /community/fastclub/auth
4. Regista-se ou faz login
5. Redirecionado de volta para /community/fastclub com sessao activa
6. Pode agora criar topicos, responder, etc.
```

### Seguranca
- As politicas RLS ja permitem SELECT publico em `community_settings`, `forum_topics`, `forum_posts`, `forum_categories` e `community_events`
- INSERT em topicos/posts requer `auth.uid()` -- apenas utilizadores autenticados podem criar conteudo
- O slug deve ser unico (ja existe constraint)
- Apenas comunidades com `is_discoverable = true` sao visiveis publicamente

### Nao sao necessarias alteracoes na base de dados
As tabelas e politicas RLS ja suportam leitura publica e escrita autenticada.

