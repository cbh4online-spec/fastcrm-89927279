

# Fix: Mostrar cliente na lista de propostas

## Diagnóstico

A coluna "Cliente" na lista (linha 607 de `ProposalsList.tsx`) mostra apenas `proposal.opportunity?.lead?.name`. Ignora completamente `proposal.contact` e `proposal.company`, que já vêm preenchidos pela query do hook.

## Solução

Alterar a célula "Cliente" para usar fallback chain:
1. `proposal.contact?.name` (contacto directo)
2. `proposal.company?.name` (empresa directa)
3. `proposal.opportunity?.lead?.name` (lead da oportunidade)
4. `"-"` (fallback)

Mesma lógica no export CSV (linha ~374).

## Ficheiro alterado

| Ficheiro | Alteração |
|---|---|
| `src/components/proposals/ProposalsList.tsx` | Linha 607: substituir `proposal.opportunity?.lead?.name` por fallback chain `contact → company → lead`; linha ~374: mesma lógica no CSV export |

