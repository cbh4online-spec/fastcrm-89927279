

# Resolver: Dialog fecha ao voltar do Instagram + Criar lead automaticamente

## Problema raiz

O Dialog do Radix UI fecha-se porque, apesar de todas as protecoes adicionadas (`onInteractOutside`, `onPointerDownOutside`, `refetchOnWindowFocus: false`, `refetchInterval: false`), o componente pai `ProspectingResults.tsx` tem muitos estados e queries que podem causar re-renders. Qualquer re-render que altere referências de estado pode fazer o Radix Dialog perder o seu estado `open`.

A abordagem de tentar "proteger" o Dialog contra fecho nao funciona de forma fiavel.

## Solucao

### 1. Substituir Dialog por painel fixo persistente

Em vez de usar `<Dialog>` do Radix (que depende de focus management e overlay), usar um **painel fixo** (`position: fixed`) que nao e afectado por re-renders do componente pai:

- Remover o `<Dialog>` e `<DialogContent>` do Radix
- Usar um `div` com `fixed inset-0 z-50` + backdrop + painel central
- O estado `open` continua a ser controlado por `bulkOutreachOpen`, mas o painel nao tem logica de fecho automatico do Radix (sem focus trap, sem dismiss on outside click)
- O painel so fecha quando o utilizador clica explicitamente "Fechar" ou "Concluir"

Isto garante que o painel **nunca** fecha sozinho, independentemente de tab switching, focus changes, ou re-renders.

### 2. Abrir janela unica por perfil (nao reutilizar)

Alterar `window.open(dmUrl, "instagram_dm")` para `window.open(dmUrl, "_blank")` — cada perfil abre o seu proprio separador. Isto e o que o utilizador pediu explicitamente.

O nome fixo `"instagram_dm"` causava confusao porque substituia o separador anterior.

### 3. Criar lead automaticamente ao confirmar envio

Quando o utilizador clica "Ja enviei", o sistema:
1. Marca o perfil como enviado (outreach_step = 1)
2. Agenda follow-ups (Dia 3, Dia 7)
3. **NOVO**: Cria automaticamente um lead no CRM com os dados do perfil

A criacao de lead usa a mesma logica que ja existe em `convertMutation`, simplificada para o contexto de outreach:
- Nome do perfil
- URL do Instagram
- Profissao inferida
- Fonte: "professional_prospecting"
- Status: "new"
- Imagem de perfil
- Notas com contexto da mensagem enviada

### Resumo das alteracoes

| Ficheiro | Alteracao |
|---|---|
| `BulkOutreachDialog.tsx` | Substituir `<Dialog>` por painel fixo; abrir `_blank` por perfil; criar lead automaticamente no "Ja enviei" |
| `ProspectingResults.tsx` | Passar dados adicionais dos perfis ao dialog (bio, score, etc.) para criacao de lead |

### Detalhes tecnicos

**BulkOutreachDialog.tsx**:

- Substituir `<Dialog open={open} onOpenChange={handleOpenChange}>` por:
```typescript
if (!open) return null;
return (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    <div className="fixed inset-0 bg-black/50" /> {/* backdrop */}
    <div className="relative z-10 bg-background rounded-lg shadow-lg max-w-2xl w-full max-h-[85vh] flex flex-col p-6">
      {/* conteudo igual */}
    </div>
  </div>
);
```

- Em `handleConfirmSent`, adicionar criacao de lead:
```typescript
// Criar lead automaticamente
const leadData = {
  workspace_id: currentWorkspace.id,
  name: profile.profile_name || "Sem nome",
  source: "professional_prospecting",
  status: "new",
  website: profile.profile_url,
  instagram_url: profile.profile_url,
  created_by: userId,
  assigned_to: userId,
  prospecting_profile_id: profile.id,
};
await supabase.from("leads").insert([leadData]);
```

- Alterar `window.open(dmUrl, "instagram_dm")` para `window.open(dmUrl, "_blank")` em ambos os handlers

**ProspectingResults.tsx**:

- Expandir a interface `BulkProfile` para incluir campos necessarios para criar lead (ou passar `userId` como prop ao dialog)
- Adicionar props `userId` e `workspaceId` ao `BulkOutreachDialog` para que possa criar leads directamente

