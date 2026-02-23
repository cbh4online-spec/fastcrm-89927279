
# Sincronizacao automatica e botao de refresh na Inbox

## O que muda

Duas melhorias na Inbox para garantir que as conversas estao sempre atualizadas:

1. **Sync automatico ao abrir a Inbox** -- quando o utilizador abre a pagina, o sistema dispara uma sincronizacao rapida (ultimos 2 dias) em background, sem bloquear a interface
2. **Botao de refresh no header** -- um botao visivel no header da Inbox para sincronizar manualmente a qualquer momento, com indicador de progresso

## Comportamento

- Ao entrar na Inbox, se o workspace tiver GHL configurado, o sync e disparado automaticamente (silencioso, sem toast a menos que encontre novas mensagens)
- O botao de refresh fica no header ao lado das metricas, com icone de refresh e animacao de spin enquanto sincroniza
- O dropdown do botao oferece "Sincronizar recentes" (2 dias) e "Sincronizar tudo" (30 dias)
- Se nao houver GHL configurado, o botao so sincroniza email (comportamento existente do InboxMetricsBar)

## Detalhes tecnicos

### Ficheiro: `src/components/inbox/InboxView.tsx`

1. Importar `useGHLConversationSync` e `useWorkspaceGHLConfig`
2. Adicionar `useEffect` que ao montar (uma vez), chama `syncConversations(true, 2)` se GHL estiver configurado -- sync silencioso dos ultimos 2 dias
3. Adicionar botao de sync no header com dropdown:
   - Importar `RefreshCw`, `RotateCcw`, `ChevronDown` de lucide
   - Importar `DropdownMenu` components
   - Renderizar entre o contador "X abertas" e o AutopilotToggle
   - "Sincronizar recentes" -> `syncConversations(true, 2)`
   - "Sincronizar tudo" -> `syncConversations(true, 30)`
   - Animacao `animate-spin` no icone enquanto `isSyncing`
4. Tambem integrar o sync de email existente (`useSyncEmail`, `useActiveEmailConnection`) no mesmo dropdown, para unificar num so botao

### Logica de auto-sync

```text
useEffect (mount only):
  - Se isGHLConfigured -> syncConversations(true, 2) silenciosamente
  - Se emailConnection -> syncEmail(emailConnection.id)
  - Usar ref para garantir que so executa uma vez
```

### Ficheiros a modificar

| Ficheiro | Alteracao |
|---|---|
| `src/components/inbox/InboxView.tsx` | Adicionar auto-sync ao montar + botao de sync com dropdown no header |
