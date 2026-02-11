

# Sistema de Convites para o Marketplace C2C

## Resumo

Criar um sistema de convites que permite ao admin do workspace convidar pessoas para se tornarem vendedores no Marketplace C2C. O convite e enviado por email com um link unico que leva diretamente ao registo de vendedor, pre-preenchendo dados e agilizando o onboarding.

## Funcionalidades

### 1. Painel de Convites no Admin de Vendedores
Na pagina de gestao de vendedores (`C2CSellersAdmin`), adicionar uma tab ou botao "Convidar Vendedor" que permite:
- Inserir nome, email e mensagem personalizada opcional
- Ver lista de convites enviados (pendentes, aceites, expirados)
- Reenviar convite expirado
- Revogar convite pendente

### 2. Email de Convite Personalizado
Email enviado via Resend com template branded do workspace contendo:
- Nome do marketplace e logo
- Mensagem personalizada do admin
- Beneficios de vender na plataforma (comissoes, visibilidade, ferramentas)
- Botao de acao com link unico de convite
- Validade de 7 dias

### 3. Pagina de Ativacao do Convite
Nova pagina publica `/c2c/:workspaceSlug/invite/:token` que:
- Valida o token do convite
- Pre-preenche nome e email no formulario de registo de vendedor
- Cria conta de auth automaticamente (se nao existir)
- Ativa o vendedor com status "approved" (aprovacao automatica por convite)
- Redireciona para o marketplace apos ativacao

### 4. Convites em Massa (CSV)
Opcao de importar lista de emails via CSV para enviar convites em lote.

## Seccao Tecnica

### Migracao SQL

```sql
CREATE TABLE public.c2c_seller_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id),
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  message TEXT,
  invite_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, accepted, expired, revoked
  invited_by UUID NOT NULL,
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.c2c_seller_invites ENABLE ROW LEVEL SECURITY;

-- Super admins podem gerir convites
CREATE POLICY "Super admins manage seller invites"
  ON public.c2c_seller_invites FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- Leitura publica por token (para validacao na pagina de convite)
CREATE POLICY "Anyone can read invite by token"
  ON public.c2c_seller_invites FOR SELECT
  TO anon, authenticated
  USING (true);
```

### Nova Edge Function: `supabase/functions/send-c2c-seller-invite/index.ts`

- Recebe: email, nome, mensagem, workspaceId
- Gera registo na tabela `c2c_seller_invites`
- Busca template/branding do workspace
- Envia email via Resend com link `{domain}/c2c/{slug}/invite/{token}`
- Suporta envio em lote (array de convites)

### Nova Edge Function: `supabase/functions/activate-c2c-seller-invite/index.ts`

- Recebe: token, password, dados do vendedor (telefone, IBAN, NIF opcionais)
- Valida token (existencia, expiracao, status)
- Cria utilizador auth (ou atualiza password se ja existe)
- Cria registo em `c2c_sellers` com status "approved"
- Marca convite como "accepted"
- Retorna authUserId para login automatico

### Novos Ficheiros

| Ficheiro | Descricao |
|---|---|
| `src/hooks/useC2CSellerInvites.ts` | Hook com queries para listar, criar, revogar e reenviar convites |
| `src/components/c2c/SellerInviteDialog.tsx` | Dialog para enviar convite individual ou em massa (CSV) |
| `src/components/c2c/SellerInvitesList.tsx` | Tabela de convites enviados com status e acoes |
| `src/pages/c2c/C2CSellerInviteActivation.tsx` | Pagina publica de ativacao do convite |
| `supabase/functions/send-c2c-seller-invite/index.ts` | Edge function para envio de email |
| `supabase/functions/activate-c2c-seller-invite/index.ts` | Edge function para ativacao |

### Ficheiros Modificados

| Ficheiro | Alteracao |
|---|---|
| `src/pages/c2c/C2CSellersAdmin.tsx` | Adicionar botao "Convidar Vendedor" e tab de convites |
| `src/App.tsx` | Adicionar rota publica `/c2c/:workspaceSlug/invite/:token` |
| `supabase/config.toml` | Registar as 2 novas edge functions |

### Fluxo do Convite

1. Admin abre gestao de vendedores e clica "Convidar Vendedor"
2. Preenche nome, email e mensagem opcional (ou importa CSV)
3. Sistema envia email com link unico
4. Convidado clica no link e chega a pagina de ativacao
5. Define password e preenche dados de vendedor (IBAN, NIF, etc.)
6. Conta e criada automaticamente com status "approved" (sem necessidade de aprovacao manual)
7. Vendedor e redirecionado para o marketplace, pronto a publicar anuncios

