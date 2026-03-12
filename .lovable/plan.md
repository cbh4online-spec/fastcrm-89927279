

# Correção: Lead detail redireciona para dashboard ao abrir

## Problema identificado

Na `SmartLeadsTable.tsx`, o nome do lead usa `<a href=...>` (tag HTML nativa) em vez de `<Link to=...>` (React Router). Quando clicado, isto causa um **reload completo da página** em vez de navegação client-side.

O reload completo faz com que:
1. Todo o estado React seja destruído (auth, workspace contexts)
2. A sessão de autenticação precisa ser restaurada do storage
3. Durante a restauração, `currentWorkspace` é `null`
4. O hook `useLead` fica desabilitado (`enabled: !!currentWorkspace`)
5. O componente vê `data = null` e mostra "Lead não encontrado" ou volta para `/dashboard/leads`

## Correção

**Ficheiro:** `src/components/leads/SmartLeadsTable.tsx`

Substituir as duas ocorrências de `<a href=...>` por `<Link to=...>`:

1. **Linha 396** — Nome do lead:
```tsx
// De:
<a href={`/dashboard/leads/${lead.id}`} className="...">
// Para:
<Link to={`/dashboard/leads/${lead.id}`} className="...">
```

2. **Linha 416** — Botão de abrir (ícone ExternalLink):
```tsx
// De:
<a href={`/dashboard/leads/${lead.id}`}>
// Para:
<Link to={`/dashboard/leads/${lead.id}`}>
```

3. Adicionar import de `Link` do `react-router-dom` (se não existir).

Estas alterações garantem navegação client-side sem perda de estado.

