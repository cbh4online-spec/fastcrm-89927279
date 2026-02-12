
## Adicionar Canal SMS ao Inbox e Definicoes GHL

### Contexto

O canal SMS ja esta suportado no sistema a nivel de tipo (`ConversationChannel`), mapeamento GHL (`GHL_TYPE_CODES`), e templates. No entanto, falta em dois sitios visiveis para o utilizador:

1. **Inbox Sidebar** -- a lista de canais (linha 64-71 de `InboxSidebar.tsx`) nao inclui SMS, tornando impossivel filtrar conversas SMS
2. **Definicoes de Canais** -- a pagina de settings nao mostra o canal SMS com badge de estado GHL

### Alteracoes

**Ficheiro 1: `src/components/inbox/InboxSidebar.tsx`**

Adicionar SMS a lista de canais filtravies na sidebar do Inbox:

```text
// Adicionar apos a entrada de "instagram" (linha 68):
{ id: "sms", label: "SMS", icon: MessageSquare, color: "text-purple-500" },
```

Isto fara o canal SMS aparecer na barra lateral com icone e contagem automatica (ja calculada no `channelCounts`).

---

**Ficheiro 2: `src/components/settings/sections/ChannelsSettings.tsx`**

Adicionar uma seccao SMS dentro do bloco de canais, com badge "Via GHL" quando a integracao GHL estiver configurada:

- Adicionar `MessageSquare` ao import de icons
- Adicionar nova `SettingsSection` para SMS com titulo "SMS", descricao "Mensagens de texto", e icone `MessageSquare`
- Mostrar badge `Via GHL` quando `isGHLConfigured` for `true`
- Incluir items de configuracao para numero de telefone e templates SMS

### Resultado

- O filtro SMS aparecera no Inbox sidebar com contagem de conversas
- A pagina de definicoes mostrara o canal SMS com indicacao de ligacao GHL
- Nao e necessaria nenhuma alteracao no backend -- o mapeamento GHL ja reconhece SMS (type codes 1, 14)
