

## Melhorar ComposeEmailDialog — Templates, Assinatura, Anexos e Agendamento

O compositor de email atual (`ComposeEmailDialog`) é básico: apenas escreve e envia. O `EmailRichComposer` da Inbox já tem assinatura, mas o compositor do painel de detalhes (Leads, Contactos) não. Vamos nivelar.

---

### O que será feito

**1. Assinatura de email automática**
- Importar `useEmailSignature` (já existe no projeto)
- Ao abrir o compositor, se houver assinatura configurada, inserir no final do body
- Na preview, mostrar a assinatura separada visualmente
- Toggle para ativar/desativar assinatura naquele email

**2. Templates sempre disponíveis**
- Atualmente, o botão de Templates só aparece se `templateContext` existir
- Tornar Templates sempre visível, criando um contexto mínimo quando não fornecido
- Manter integração com `InboxTemplatePanel`

**3. Anexos via Storage**
- Criar bucket `email-attachments` (migração SQL, público para leitura)
- Botão de anexar ficheiros na toolbar (ícone Paperclip)
- Upload para o bucket com path `{workspaceId}/{uuid}/{filename}`
- Mostrar lista de anexos com nome, tamanho e botão remover
- No envio, incluir links dos anexos no final do HTML do email (como "Anexos: [link1] [link2]")
- Nota: não há suporte nativo a attachments SMTP — usamos links de download

**4. Envio programado**
- Nova tabela `scheduled_emails` (via migração):
  - `id`, `workspace_id`, `connection_id`, `conversation_id`, `to`, `subject`, `body`, `is_html`, `attachments` (jsonb), `scheduled_for` (timestamptz), `status` (pending/sent/failed/cancelled), `created_by`, `created_at`
- Botão dropdown no "Enviar" com opção "Agendar envio"
- DateTimePicker para selecionar data/hora
- Guardar na tabela em vez de enviar imediatamente
- Edge function `process-scheduled-emails` via pg_cron (a cada minuto) para processar emails agendados

**5. Melhorias de UX**
- Campos CC e BCC expansíveis (colapsados por defeito)
- Indicador visual de anexos no footer
- Mostrar "Agendado para [data]" quando agendado
- Botão de AI "Escrever" para gerar conteúdo (já existe o padrão no EmailRichComposer)

---

### Alterações técnicas

| Ficheiro | Alteração |
|---|---|
| **Migração SQL** | Criar bucket `email-attachments`; criar tabela `scheduled_emails` com RLS |
| `src/components/email/ComposeEmailDialog.tsx` | Reescrever: assinatura, anexos, agendamento, CC/BCC, templates sempre visíveis |
| `src/hooks/useScheduledEmails.ts` | Novo hook para CRUD de emails agendados |
| `supabase/functions/process-scheduled-emails/` | Nova edge function para processar emails agendados via cron |
| `src/components/email/EmailAttachmentList.tsx` | Novo componente para lista de anexos com upload/remove |

### Dependências existentes reutilizadas
- `useEmailSignature` — assinatura já funciona
- `InboxTemplatePanel` — templates já existem
- `useSendEmail` — envio SMTP já funciona
- Storage API do Supabase — upload de ficheiros

