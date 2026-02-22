

# Adicionar botao "Rejeitar" ao estado "opened" no painel de Outreach em Massa

## Problema

Quando o utilizador clica "Abrir DM", o perfil passa ao estado "opened" (a aguardar confirmacao). Nesse estado, so aparecem dois botoes: "Ja enviei" e "Abrir novamente". Nao ha forma de rejeitar o perfil depois de o ter aberto.

## Solucao

Adicionar o botao "Rejeitar" tambem ao estado "opened", junto aos botoes existentes.

## Alteracao

### Ficheiro: `src/components/professional-prospecting/BulkOutreachDialog.tsx`

Na seccao do estado `"opened"` (linhas 472-491), adicionar o botao "Rejeitar" apos o botao "Abrir novamente":

```text
// Estado "opened" - botoes actuais:
// 1. "Já enviei" (botao principal)
// 2. "Abrir novamente" (ghost)
// 3. NOVO: "Rejeitar" (ghost, texto vermelho) - mesmo estilo do estado idle
```

O botao tera o mesmo aspecto e comportamento que o botao "Rejeitar" do estado `idle`:
- Variant `ghost`
- Texto vermelho (`text-destructive`)
- Icone `X`
- Chama a mesma funcao `handleReject(profile)`

