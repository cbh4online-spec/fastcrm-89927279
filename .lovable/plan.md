
# Plano: Convite de Clientes B2B via Link Partilhável e QR Code

## Contexto

O sistema actual de convite de clientes B2B funciona exclusivamente via email. Este plano adiciona dois métodos alternativos de convite:
1. **Link Partilhável** - URL único que pode ser copiado e enviado via WhatsApp, SMS, etc.
2. **QR Code** - Código visual para partilha impressa ou digital

## Arquitectura da Solução

### Fluxo de Convite via Link/QR

```text
┌─────────────────────┐
│ Criar Cliente B2B   │
│ (InviteClientDialog)│
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Gerar invite_token  │
│ (UUID único)        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────────────┐
│ Métodos de Partilha                         │
├─────────────────────────────────────────────┤
│ 1. Email (actual)                           │
│ 2. Link: /client/invite/{token}     [NOVO] │
│ 3. QR Code com o link                [NOVO] │
└──────────┬──────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────┐
│ Cliente acede ao link                       │
├─────────────────────────────────────────────┤
│ ClientInvitePage.tsx                        │
│ - Valida token                              │
│ - Mostra mensagem de boas-vindas            │
│ - Solicita criação de password              │
│ - Activa a conta                            │
└─────────────────────────────────────────────┘
```

### Novo Campo na Base de Dados

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `invite_token` | UUID | Token único para convite via link |
| `invite_expires_at` | timestamp | Data de expiração (7 dias) |

## Implementação Técnica

### 1. Migração da Base de Dados

```sql
-- Adicionar campos para convite via link
ALTER TABLE public.client_users
ADD COLUMN invite_token UUID DEFAULT NULL,
ADD COLUMN invite_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Índice para pesquisa rápida por token
CREATE UNIQUE INDEX idx_client_users_invite_token 
ON public.client_users(invite_token) 
WHERE invite_token IS NOT NULL;

-- Comentários
COMMENT ON COLUMN public.client_users.invite_token IS 
  'Token único para convite via link partilhável. NULL após activação.';
COMMENT ON COLUMN public.client_users.invite_expires_at IS 
  'Data de expiração do convite. 7 dias por defeito.';
```

### 2. Dependência: react-qr-code

Instalar biblioteca para gerar QR codes em React:
```bash
npm install react-qr-code
```

### 3. Componente InviteLinkDialog

Novo componente para mostrar link e QR code após criação do cliente:

```typescript
// src/components/client-users/InviteLinkDialog.tsx

interface InviteLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  inviteUrl: string;
  temporaryPassword?: string;
  onSendEmail: () => void;
  emailSent: boolean;
}

export function InviteLinkDialog({
  open,
  onOpenChange,
  clientName,
  inviteUrl,
  temporaryPassword,
  onSendEmail,
  emailSent,
}: InviteLinkDialogProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast.success("Link copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cliente Criado com Sucesso</DialogTitle>
          <DialogDescription>
            {clientName} foi adicionado. Escolha como enviar o convite.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="link" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="link">
              <LinkIcon className="h-4 w-4 mr-2" />
              Link
            </TabsTrigger>
            <TabsTrigger value="qr">
              <QrCode className="h-4 w-4 mr-2" />
              QR Code
            </TabsTrigger>
            <TabsTrigger value="email">
              <Mail className="h-4 w-4 mr-2" />
              Email
            </TabsTrigger>
          </TabsList>

          {/* Tab: Link */}
          <TabsContent value="link" className="space-y-4">
            <div className="flex gap-2">
              <Input value={inviteUrl} readOnly className="font-mono text-sm" />
              <Button onClick={copyToClipboard} variant="outline" size="icon">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            {temporaryPassword && (
              <Alert>
                <AlertDescription>
                  Palavra-passe temporária: <code>{temporaryPassword}</code>
                </AlertDescription>
              </Alert>
            )}
            <p className="text-sm text-muted-foreground">
              Copie o link e envie via WhatsApp, SMS ou outro canal.
            </p>
          </TabsContent>

          {/* Tab: QR Code */}
          <TabsContent value="qr" className="space-y-4">
            <div className="flex justify-center p-4 bg-white rounded-lg">
              <QRCode
                value={inviteUrl}
                size={200}
                level="M"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={downloadQRCode} variant="outline" className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Descarregar
              </Button>
              <Button onClick={() => window.print()} variant="outline" className="flex-1">
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
            </div>
            {temporaryPassword && (
              <Alert>
                <AlertDescription>
                  Palavra-passe: <code>{temporaryPassword}</code>
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          {/* Tab: Email */}
          <TabsContent value="email" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enviar convite formatado com credenciais por email.
            </p>
            <Button 
              onClick={onSendEmail} 
              disabled={emailSent}
              className="w-full"
            >
              {emailSent ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Email Enviado
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Enviar Convite por Email
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### 4. Página de Aceitação do Convite

Nova página para clientes acederem via link:

```typescript
// src/pages/client/ClientInvitePage.tsx

export default function ClientInvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientData, setClientData] = useState<{
    name: string;
    email: string;
    workspaceName: string;
  } | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Validar token ao carregar
  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    const { data, error } = await supabase
      .from("client_users")
      .select(`
        name, 
        email, 
        status,
        invite_expires_at,
        workspace:workspaces(name)
      `)
      .eq("invite_token", token)
      .single();

    if (error || !data) {
      setError("Link de convite inválido ou expirado.");
      setLoading(false);
      return;
    }

    if (data.status !== "pending") {
      setError("Este convite já foi utilizado.");
      setLoading(false);
      return;
    }

    if (data.invite_expires_at && new Date(data.invite_expires_at) < new Date()) {
      setError("O link de convite expirou. Contacte o administrador.");
      setLoading(false);
      return;
    }

    setClientData({
      name: data.name,
      email: data.email,
      workspaceName: data.workspace?.name || "Portal",
    });
    setLoading(false);
  };

  const handleActivateAccount = async () => {
    // Validações
    if (password.length < 8) {
      toast.error("A palavra-passe deve ter pelo menos 8 caracteres");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("As palavras-passe não coincidem");
      return;
    }

    setSubmitting(true);

    // 1. Criar/actualizar utilizador auth com password definitiva
    const { data: authResult, error: authError } = await supabase.functions.invoke(
      "activate-client-invite",
      {
        body: {
          token,
          password,
        },
      }
    );

    if (authError || !authResult?.success) {
      toast.error("Erro ao activar conta. Tente novamente.");
      setSubmitting(false);
      return;
    }

    // 2. Fazer login automático
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: clientData!.email,
      password,
    });

    if (signInError) {
      toast.error("Conta activada! Faça login para continuar.");
      navigate("/client/login");
      return;
    }

    toast.success("Bem-vindo ao Portal de Clientes!");
    navigate("/client/dashboard");
  };

  // Render states...
}
```

### 5. Edge Function: activate-client-invite

```typescript
// supabase/functions/activate-client-invite/index.ts

interface ActivateInviteRequest {
  token: string;
  password: string;
}

const handler = async (req: Request): Promise<Response> => {
  const { token, password } = await req.json();

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL"),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  );

  // 1. Buscar cliente pelo token
  const { data: client, error: clientError } = await supabaseAdmin
    .from("client_users")
    .select("id, email, name, status, auth_user_id, invite_expires_at")
    .eq("invite_token", token)
    .single();

  if (clientError || !client) {
    return errorResponse("Token inválido");
  }

  if (client.status !== "pending") {
    return errorResponse("Convite já utilizado");
  }

  if (client.invite_expires_at && new Date(client.invite_expires_at) < new Date()) {
    return errorResponse("Convite expirado");
  }

  // 2. Criar ou actualizar utilizador auth
  let authUserId = client.auth_user_id;

  if (!authUserId) {
    // Criar novo utilizador
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: client.email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: client.name,
        requires_password_change: false,
      },
    });
    if (createError) throw createError;
    authUserId = newUser.user.id;
  } else {
    // Actualizar password existente
    await supabaseAdmin.auth.admin.updateUserById(authUserId, {
      password,
      user_metadata: {
        requires_password_change: false,
      },
    });
  }

  // 3. Activar cliente
  await supabaseAdmin
    .from("client_users")
    .update({
      auth_user_id: authUserId,
      status: "active",
      invite_token: null, // Invalidar token
      invite_expires_at: null,
    })
    .eq("id", client.id);

  return new Response(
    JSON.stringify({ success: true, data: { authUserId } }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
};
```

### 6. Actualização do InviteClientDialog

Modificar o diálogo existente para suportar o novo fluxo:

```typescript
// Após criar cliente com sucesso, abrir InviteLinkDialog
// em vez de enviar email automaticamente

const createClientMutation = useMutation({
  mutationFn: async (data: InviteClientFormData) => {
    // Gerar token de convite
    const inviteToken = crypto.randomUUID();
    const inviteExpiresAt = new Date();
    inviteExpiresAt.setDate(inviteExpiresAt.getDate() + 7); // 7 dias

    // Criar cliente com token
    const { data: clientUser, error } = await supabase
      .from("client_users")
      .insert({
        ...existingData,
        invite_token: inviteToken,
        invite_expires_at: inviteExpiresAt.toISOString(),
      })
      .select()
      .single();

    // Criar auth user (como antes)
    const authResult = await supabase.functions.invoke("create-client-auth-user", ...);

    return {
      client: clientUser,
      inviteToken,
      temporaryPassword: authResult.data.temporaryPassword,
    };
  },
  onSuccess: (result) => {
    // Abrir diálogo com opções de partilha
    setInviteData({
      clientName: result.client.name,
      inviteUrl: `https://fastcrm.metodopare.ai/client/invite/${result.inviteToken}`,
      temporaryPassword: result.temporaryPassword,
    });
    setShowInviteLinkDialog(true);
    setOpen(false); // Fechar formulário
  },
});
```

### 7. Rota no App.tsx

```typescript
// Dentro das rotas /client/*
<Route path="invite/:token" element={<ClientInvitePage />} />
```

## Ficheiros a Criar/Modificar

| Ficheiro | Acção | Descrição |
|----------|-------|-----------|
| **Migração SQL** | Criar | Adicionar campos `invite_token` e `invite_expires_at` |
| `src/components/client-users/InviteLinkDialog.tsx` | Criar | Diálogo com tabs para Link, QR e Email |
| `src/pages/client/ClientInvitePage.tsx` | Criar | Página de aceitação do convite |
| `supabase/functions/activate-client-invite/index.ts` | Criar | Edge function para activar convite |
| `src/components/client-users/InviteClientDialog.tsx` | Modificar | Integrar novo fluxo de partilha |
| `src/App.tsx` | Modificar | Adicionar rota `/client/invite/:token` |
| `package.json` | Modificar | Adicionar dependência `react-qr-code` |

## Fluxo de UX

### Criar Cliente e Obter Link

```text
1. Admin preenche formulário de cliente
2. Clica "Criar Cliente"
3. Sistema gera token único e cria cliente
4. Abre diálogo "Cliente Criado" com 3 tabs:
   - Link: URL + botão copiar + password temporária
   - QR Code: Código visual + botões download/imprimir
   - Email: Botão para enviar convite por email
5. Admin escolhe método preferido de partilha
```

### Cliente Acede via Link

```text
1. Cliente clica no link recebido
2. Página mostra nome do workspace e boas-vindas
3. Cliente define a sua password definitiva
4. Conta activada automaticamente
5. Login automático e redirecção para dashboard
```

## Segurança

1. **Token único UUID** - Impossível adivinhar
2. **Expiração 7 dias** - Links não são eternos
3. **Uso único** - Token invalidado após activação
4. **Password mínima 8 caracteres** - Segurança básica

## Benefícios

1. **Flexibilidade** - Escolha do canal de comunicação
2. **WhatsApp/SMS** - Canais mais directos que email
3. **Presencial** - QR code para activação imediata
4. **UX Melhorada** - Cliente define password imediatamente
5. **Rastreabilidade** - Saber que convites estão pendentes

## Secção Técnica

### Dependências Necessárias
- `react-qr-code` - Biblioteca leve para geração de QR codes em SVG

### Estrutura de Dados
- Token: UUID v4 (128 bits de entropia)
- Expiração: 7 dias (configurável)
- Estados: pending -> active (via token) ou pending -> active (via email + password)

### Considerações de Performance
- Índice único no campo `invite_token` para pesquisas O(1)
- QR code renderizado client-side, sem carga no servidor

## Complexidade

Média-Alta - Requer:
- Migração de base de dados
- Nova edge function
- Nova página cliente
- Modificação de componentes existentes
- Nova dependência NPM
