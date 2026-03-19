

## Melhorar formulario de Novo Email com pesquisa de contactos

### Problema
O formulario `QuickComposeDialog` no `ComposeButton.tsx` e muito basico: campos de texto simples sem pesquisa de contactos existentes. O utilizador tem de saber o email de cor.

### Solucao
Substituir o campo "Email do destinatario" por um campo com pesquisa/autocomplete que consulta contactos e leads do workspace, preenchendo automaticamente o email e nome ao selecionar.

### Alteracoes

**Ficheiro: `src/components/inbox/ComposeButton.tsx`**

1. **Importar `useContacts`** e `useLeads` para obter os contactos/leads do workspace
2. **Adicionar estado de pesquisa** (`searchTerm`) e logica de filtragem por nome/email
3. **Substituir o campo email** por um input com dropdown de sugestoes (Popover/Command pattern):
   - Ao digitar, filtra contactos e leads que contenham o termo no nome ou email
   - Ao selecionar, preenche `recipientEmail` e `recipientName` automaticamente
   - Ainda permite escrever um email manualmente (para novos contactos)
4. **Adicionar campos CC e BCC** (toggle para mostrar/ocultar) para maior funcionalidade
5. **Mostrar badge** com o tipo de entidade (Contacto/Lead) ao lado da sugestao
6. **Indicador de assinatura** — mostrar badge a confirmar que a assinatura sera incluida (ja existe o hook `useEmailSignature`)

### Detalhes tecnicos
- Usar `useContacts()` e `useLeads()` que ja existem nos hooks
- Componente de autocomplete usa Popover + lista filtrada (sem dependencia extra)
- A selecao define `entityType` e `entityId` directamente, evitando a busca posterior no `handleSend`
- Manter compatibilidade com email manual (fallback para criar lead)

### Ficheiros a alterar
- `src/components/inbox/ComposeButton.tsx` (unico ficheiro)

