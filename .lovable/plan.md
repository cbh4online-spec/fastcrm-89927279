

# Convite para o Club via CRM/Workspace

## Objectivo

Permitir que administradores do workspace convidem contactos do CRM para a comunidade (FastClub), enviando um email de convite com link de registo na pagina publica da comunidade.

## O Que Vai Ser Feito

### 1. Tabela `community_members`
Nova tabela para rastrear membros da comunidade (convidados, pendentes, activos):

| Coluna | Tipo | Descricao |
|---|---|---|
| id | uuid PK | Identificador |
| workspace_id | uuid FK | Workspace da comunidade |
| user_id | uuid | Auth user ID (preenchido apos registo) |
| contact_id | uuid FK | Contacto CRM associado (opcional) |
| email | text | Email do convidado |
| name | text | Nome do convidado |
| status | text | "pending", "active", "revoked" |
| invite_token | uuid | Token unico para o convite |
| invite_expires_at | timestamptz | Expiracao do convite (7 dias) |
| invited_by | uuid | Quem convidou (auth.uid) |
| joined_at | timestamptz | Data de activacao |
| created_at | timestamptz | Data de criacao |

RLS: admins do workspace podem ler/escrever; membros podem ler os seus proprios registos.

### 2. Edge Function `send-community-invite`
Nova edge function que:
- Recebe: email, name, workspaceId, communitySlug
- Gera token de convite e grava em `community_members`
- Envia email via Resend com template da comunidade (logo, cores, nome)
- Link do convite aponta para `/community/:slug/auth?invite=TOKEN`

### 3. Dialog de Convite na UI (FastClub)
Novo componente `InviteToCommunityDialog.tsx`:
- Botao "Convidar" no tab "Membros" (visivel para admins)
- Duas opcoes de convite:
  - **Manual**: Preencher nome e email
  - **Do CRM**: Seleccionar contactos existentes do workspace (dropdown com pesquisa)
- Possibilidade de convidar multiplos contactos de uma vez
- Mostra estado dos convites pendentes

### 4. Pagina de Auth com Token de Convite
Actualizar `CommunityAuthPage.tsx` para:
- Detectar `?invite=TOKEN` na URL
- Validar o token contra `community_members`
- Apos registo, activar automaticamente o membro (status "active")
- Preencher nome e email do formulario a partir dos dados do convite

### 5. Lista de Membros Melhorada
Actualizar `CommunityMembersList.tsx` para:
- Mostrar membros da tabela `community_members` alem dos workspace members
- Mostrar badge de estado (pendente, activo)
- Botao para reenviar convite (pendentes)

## Detalhes Tecnicos

### Migracao SQL

```sql
CREATE TABLE public.community_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  email text NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  invite_token uuid DEFAULT gen_random_uuid(),
  invite_expires_at timestamptz DEFAULT (now() + interval '7 days'),
  invited_by uuid REFERENCES auth.users(id),
  joined_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;

-- Workspace members can read
CREATE POLICY "Workspace members can read community members"
  ON public.community_members FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- Workspace admins can insert/update
CREATE POLICY "Workspace admins can manage community members"
  ON public.community_members FOR ALL
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Public can read by invite_token (for activation)
CREATE POLICY "Anyone can read own invite by token"
  ON public.community_members FOR SELECT
  TO anon
  USING (true);

-- Unique constraint
ALTER TABLE public.community_members
  ADD CONSTRAINT community_members_workspace_email_unique
  UNIQUE (workspace_id, email);
```

### Ficheiros a Criar

| Ficheiro | Descricao |
|---|---|
| `supabase/functions/send-community-invite/index.ts` | Edge function para enviar convite com email Resend |
| `src/components/community/InviteToCommunityDialog.tsx` | Dialog com seleccao de contactos CRM ou input manual |
| `src/hooks/useCommunityMembers.ts` | Hook CRUD para community_members |

### Ficheiros a Modificar

| Ficheiro | Descricao |
|---|---|
| `src/pages/community/FastClubPage.tsx` | Adicionar botao "Convidar" no tab Membros |
| `src/components/community/CommunityMembersList.tsx` | Mostrar community_members + estado + reenviar |
| `src/pages/community/CommunityAuthPage.tsx` | Suportar ?invite=TOKEN para pre-fill e activacao |

### Fluxo do Convite

```text
1. Admin abre FastClub > Membros > "Convidar"
2. Selecciona contacto(s) do CRM ou preenche manualmente
3. Sistema chama edge function send-community-invite
4. Edge function: cria registo em community_members + envia email
5. Convidado recebe email com link /community/:slug/auth?invite=TOKEN
6. Convidado abre link, ve formulario pre-preenchido, cria password
7. Apos registo, community_members actualizado para status "active"
8. Membro aparece na lista com badge "Activo"
```

### Template do Email
Reutilizar o padrao do `send-client-invitation` mas com branding da comunidade:
- Header com logo e nome da comunidade
- Mensagem de convite personalizada
- Botao "Juntar-se a Comunidade" com link directo
- Cores primarias da community_settings

