
# Privacidade de Perfil na Comunidade (FastClub)

## Resumo

Adicionar controlos de privacidade ao perfil de cada membro da comunidade, permitindo ocultar total ou parcialmente a sua identidade. Essencial para comunidades sensiveis (terapia, saude mental, grupos de apoio) onde os membros podem querer participar anonimamente.

## Funcionalidades

### 1. Configuracoes de Privacidade do Membro
Cada membro pode controlar:
- **Perfil visivel**: mostrar ou ocultar completamente o perfil na lista de membros publica
- **Nome visivel**: usar nome real ou um pseudonimo/alias
- **Email visivel**: mostrar ou ocultar email dos outros membros
- **Avatar visivel**: mostrar avatar ou usar iniciais genericas

### 2. Pseudonimo (Alias)
O membro pode definir um nome alternativo que sera usado em vez do nome real quando a privacidade estiver ativa. Nos posts e comentarios aparecera o alias em vez do nome verdadeiro.

### 3. Configuracao ao Nivel da Comunidade (Admin)
O admin pode, nas definicoes da comunidade:
- **Permitir perfis anonimos**: ativar/desativar a opcao de anonimato para toda a comunidade
- **Anonimato por defeito**: novos membros entram com perfil privado (util para comunidades sensiveis)
- **Forcar anonimato total**: todos os membros sao anonimos, sem opcao de mostrar identidade

### 4. Experiencia Visual
- Membros com perfil privado aparecem como "Membro Anonimo" ou com o alias na lista de membros
- Avatar generico (icone de utilizador) em vez de iniciais do nome
- Na sidebar publica, membros privados contam para o total mas nao aparecem nos avatares recentes
- Nos posts/discussoes, o nome e substituido pelo alias ou "Anonimo"

## Seccao Tecnica

### Migracao SQL

Adicionar colunas a tabela `community_members`:

```sql
ALTER TABLE public.community_members
  ADD COLUMN IF NOT EXISTS is_profile_public BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS display_alias TEXT,
  ADD COLUMN IF NOT EXISTS show_email BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_avatar BOOLEAN DEFAULT true;
```

Adicionar colunas a tabela `community_settings` para controlo ao nivel da comunidade:

```sql
ALTER TABLE public.community_settings
  ADD COLUMN IF NOT EXISTS allow_anonymous_profiles BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS default_profile_private BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS force_anonymous BOOLEAN DEFAULT false;
```

### Ficheiros Novos

| Ficheiro | Descricao |
|---|---|
| `src/components/community/MemberPrivacySettings.tsx` | Dialog/painel onde o membro configura a sua privacidade (toggle perfil publico, alias, email, avatar) |

### Ficheiros Modificados

| Ficheiro | Alteracao |
|---|---|
| `src/hooks/usePublicCommunity.ts` | `usePublicCommunityMembers` filtra membros com `is_profile_public = false` da lista publica, e substitui nome por alias quando aplicavel |
| `src/components/community/PublicCommunitySidebar.tsx` | Nao mostrar avatares de membros privados nos "Membros recentes"; contar total correto |
| `src/components/community/CommunityMembersList.tsx` | Admin continua a ver todos os membros com indicador de privacidade; membros normais veem nome/alias conforme configuracao |
| `src/components/community/SocialPostCard.tsx` | Exibir alias ou "Anonimo" em vez do nome real quando privacidade esta ativa |
| `src/hooks/useCommunitySettings.ts` | Suportar os novos campos `allow_anonymous_profiles`, `default_profile_private`, `force_anonymous` |
| `src/hooks/useCommunityMembers.ts` | Adicionar mutacao para atualizar preferencias de privacidade do membro |
| Componente de definicoes da comunidade (tab Geral ou nova tab "Privacidade") | Adicionar toggles para o admin controlar as opcoes de anonimato ao nivel da comunidade |

### Logica de Exibicao

```text
Se force_anonymous = true (definido pelo admin):
  -> Todos os membros aparecem como "Membro Anonimo" + avatar generico
  -> Sem opcao individual

Se allow_anonymous_profiles = true:
  -> Cada membro pode escolher:
     - is_profile_public = false -> oculto da lista publica
     - display_alias -> nome alternativo nos posts
     - show_email = false -> email oculto
     - show_avatar = false -> avatar generico

Se allow_anonymous_profiles = false:
  -> Todos os perfis sao publicos (comportamento atual)
```

### RLS

As colunas de privacidade sao editaveis apenas pelo proprio membro (via `user_id = auth.uid()`) ou por admins do workspace. A leitura publica respeita os filtros de privacidade diretamente na query.
