

# Corrigir: Dialog desaparece ao voltar do Instagram

## Problema identificado

Quando o utilizador clica "Abrir DM", acontece o seguinte:
1. A mensagem e copiada para o clipboard
2. O Instagram abre num novo separador (`window.open`)
3. O perfil e **imediatamente** marcado como enviado (`markAsSent`)
4. Quando o utilizador volta ao separador do FastCRM, o **react-query** faz `refetchOnWindowFocus` automaticamente, o que recarrega os dados dos perfis e pode causar re-render que perde o estado do dialog

Alem disso, o fluxo actual nao e claro: o utilizador tem de saber que precisa de voltar manualmente ao separador do FastCRM para continuar com o proximo perfil.

## Solucao

### 1. Desactivar `refetchOnWindowFocus` na query de perfis durante o outreach

Na query `prospecting-profiles` em `ProspectingResults.tsx`, adicionar `refetchOnWindowFocus: false` quando o dialog esta aberto (`bulkOutreachOpen === true`). Isto impede que o react-query relance a query quando o utilizador volta do Instagram, evitando re-renders que afectam o dialog.

### 2. Separar o "copiar/abrir" do "marcar como enviado"

Alterar o fluxo em `BulkOutreachDialog.tsx`:
- **"Abrir DM"** apenas copia a mensagem e abre o Instagram. **NAO** marca como enviado
- Quando o utilizador volta, o perfil ainda mostra o botao, mas agora com opcao **"Marcar como enviado"** (botao separado) ou **"Ja enviei"**
- Isto permite ao utilizador confirmar que realmente enviou antes de avancar

### 3. Adicionar botao "Ja enviei, proximo" visivel ao voltar

Apos copiar e abrir o Instagram, o perfil activo muda de estado para "A aguardar confirmacao" com dois botoes:
- **"Ja enviei"** - marca como enviado e avanca para o proximo
- **"Abrir DM novamente"** - reabre o Instagram caso precise

### Resumo das alteracoes

| Ficheiro | Alteracao |
|---|---|
| `ProspectingResults.tsx` | Adicionar `refetchOnWindowFocus: false` quando `bulkOutreachOpen` esta activo |
| `BulkOutreachDialog.tsx` | Separar "copiar/abrir" de "marcar enviado"; adicionar estado "a aguardar confirmacao" com botoes "Ja enviei" e "Abrir novamente" |

### Detalhes tecnicos

**ProspectingResults.tsx** - Query com refetch controlado:
```typescript
const { data: profiles = [] } = useQuery({
  queryKey: ["prospecting-profiles", ...],
  queryFn: async () => { ... },
  refetchOnWindowFocus: !bulkOutreachOpen, // desactivar durante outreach
});
```

**BulkOutreachDialog.tsx** - Novo fluxo por perfil:

Estado de cada perfil: `idle` -> `opened` (abriu Instagram) -> `sent` (confirmou envio)

- `handleCopyAndOpen`: copia + abre Instagram + muda estado para `opened` (NAO chama `markAsSent`)
- Novo botao "Ja enviei": muda estado para `sent` + chama `markAsSent` + avanca para proximo perfil
- Botao "Abrir novamente": reabre o Instagram para o mesmo perfil

Isto garante que o dialog permanece aberto e funcional quando o utilizador volta do Instagram.

