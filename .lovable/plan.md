
# Esconder Instagram Looter quando não instalado

## Problema
O grupo **Instagram Looter** no menu lateral não respeita a lógica de módulos. Está condicionado apenas pelo slug do workspace (`metodopare`), mas não tem `moduleSlug` definido, por isso aparece sempre independentemente de estar instalado ou não.

## Solução
Adicionar `moduleSlug: "instagram-looter"` ao grupo de navegação do Instagram Looter no ficheiro `src/components/layout/Sidebar.tsx` (linha ~574). A lógica de filtragem existente tratará de o esconder automaticamente quando não estiver instalado.

## Secção Técnica

### Ficheiro a alterar

**`src/components/layout/Sidebar.tsx`** -- linha ~574, adicionar `moduleSlug` ao objecto do grupo:

```typescript
{
  name: "Instagram Looter",
  icon: Instagram,
  tooltip: "Prospecção via Instagram",
  highlight: true,
  moduleSlug: "instagram-looter",  // <-- adicionar esta linha
  items: [ ... ]
}
```

Apenas 1 linha a adicionar. A condição de workspace `metodopare` continua a funcionar em conjunto com a verificação do módulo instalado.
