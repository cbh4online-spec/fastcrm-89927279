
# Plano: Envio de Emails para Contactos

## Analise da Situacao Atual

### Infraestrutura Existente
O projeto ja possui uma infraestrutura robusta de email:

1. **Edge Function `email-send`** - Funcional, envia emails via SMTP com suporte a:
   - HTML e texto simples
   - Threading (In-Reply-To, References)
   - Encriptacao de credenciais
   - Multipart MIME

2. **Hook `useSendEmail`** em `useEmailConnection.ts` - Permite enviar emails atraves da edge function

3. **Componente `EmailRichComposer`** - Composer completo com:
   - Formatacao (bold, italic, links)
   - Templates
   - Traducao com AI
   - Preview HTML

4. **`ContactMessagesSection`** - Centro de mensagens que atualmente:
   - Abre `mailto:` links (nao envia diretamente)
   - Suporta templates e AI
   - Nao usa o sistema de email SMTP

### Problema Identificado
O `ContactMessagesSection` usa `window.open(mailto:...)` em vez do sistema de email integrado. Os emails nao sao enviados atraves da conta configurada nem registados no sistema.

---

## Estrategia de Implementacao

### Abordagem 1: Dialog de Email Rico (Recomendado)
Criar um dialog reutilizavel que integra o `EmailRichComposer` existente.

### Abordagem 2: Envio Direto
Modificar o `ContactMessagesSection` para usar `useSendEmail` diretamente.

**Recomendacao**: Abordagem 1 - Mais consistente com a UX do Inbox e permite todas as funcionalidades (templates, traducao, preview).

---

## Implementacao Tecnica

### Passo 1: Criar Componente `ComposeEmailDialog`

Novo dialog reutilizavel que encapsula o `EmailRichComposer`:

```text
src/components/email/
  ComposeEmailDialog.tsx    <- NOVO
  index.ts                  <- NOVO (exports)
```

**Funcionalidades**:
- Recebe `to`, `entityName`, `entityId`, `entityType`
- Cria uma conversa temporaria ou usa existente
- Usa `useSendEmail` para envio real via SMTP
- Suporta templates da jornada do cliente
- Regista mensagem na tabela `messages`

### Passo 2: Integrar em `ContactMessagesSection`

Modificar o botao "Enviar via Email" para:
1. Abrir o `ComposeEmailDialog` em vez de `mailto:`
2. Manter a composicao inline para draft
3. Ao clicar "Enviar", abrir o dialog para confirmacao final

### Passo 3: Adicionar Botao de Email Rapido no Header do Contacto

Na `ENIContactDetailWithSidebar`:
1. Adicionar botao "Enviar Email" junto aos outros botoes de acao
2. Abre o `ComposeEmailDialog` diretamente

### Passo 4: Criar Pagina no Modulo Comunicacao

Adicionar nova tab "Compor Email" em `TemplatesListPage` ou criar pagina separada:

```text
src/components/communication/
  ComposeEmailPage.tsx      <- NOVO (ou integrar em TemplatesListPage)
```

**Funcionalidades**:
- Seletor de destinatario (contactos, empresas, leads)
- Integracao com templates
- Historico de emails enviados

---

## Ficheiros a Modificar/Criar

| Ficheiro | Acao | Descricao |
|----------|------|-----------|
| `src/components/email/ComposeEmailDialog.tsx` | CRIAR | Dialog reutilizavel de composicao de email |
| `src/components/email/index.ts` | CRIAR | Exports do modulo email |
| `src/components/messages/ContactMessagesSection.tsx` | MODIFICAR | Integrar envio real via SMTP |
| `src/components/contacts/eni/ENIContactDetailWithSidebar.tsx` | MODIFICAR | Adicionar botao de email rapido no header |
| `src/components/communication/TemplatesListPage.tsx` | MODIFICAR | Adicionar acao "Testar Template" que abre composer |

---

## Fluxo do Utilizador

### Cenario 1: Email a partir do Contacto (Sidebar Mensagens)
```text
Contacto Detail -> Tab Mensagens -> Seleciona Email -> Compoe -> Clica Enviar
    -> Abre ComposeEmailDialog com preview
    -> Confirma -> Envia via SMTP -> Registado em Messages
```

### Cenario 2: Email Rapido (Header do Contacto)
```text
Contacto Detail -> Header -> Clica "Enviar Email"
    -> Abre ComposeEmailDialog
    -> Compoe mensagem -> Envia
```

### Cenario 3: Via Templates (Modulo Comunicacao)
```text
Templates -> Seleciona template -> "Enviar Agora"
    -> Abre dialog para selecionar destinatario
    -> Aplica template -> Preview -> Envia
```

---

## Detalhes Tecnicos

### ComposeEmailDialog Props
```typescript
interface ComposeEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipient: {
    email: string;
    name: string;
    entityType: 'contact' | 'company' | 'lead';
    entityId: string;
  };
  defaultSubject?: string;
  defaultBody?: string;
  templateContext?: VariableContext;
  onSent?: () => void;
}
```

### Integracao com Conversas
Para emails enviados fora do Inbox, sera necessario:
1. Verificar se existe conversa com o email do destinatario
2. Se existir, associar a mensagem
3. Se nao existir, criar nova conversa com `channel: 'email'`

### Gestao de Estado
- `useActiveEmailConnection()` - Obter conexao ativa
- `useSendEmail()` - Enviar email
- Criar/atualizar conversa no callback de sucesso

---

## Prerequisitos
- Conta de email conectada no workspace (Email Connections)
- Pelo menos um contacto com email valido

## Limitacoes
- Attachments nao suportados (edge function atual nao suporta)
- CC/BCC nao suportados (pode ser adicionado posteriormente)
