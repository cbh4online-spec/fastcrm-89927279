

# Integrar Sidebar no Design da Pagina FastClub

## Problema Atual

A sidebar do ClubLayout e um painel fixo separado com `border-r` e `bg-card/50`, criando uma divisao visual forte entre a navegacao e o conteudo. O utilizador quer que a sidebar se integre visualmente na pagina, com o mesmo estilo de design.

## Solucao

Transformar a sidebar de painel fixo separado para um elemento integrado no fluxo da pagina, usando o mesmo estilo visual (rounded corners, cards, espacamento).

### Alteracoes

**1. `src/components/club/ClubLayout.tsx`**
- Remover o padding-left fixo (`lg:pl-64`)
- Usar layout flex inline em vez de sidebar fixa
- Envolver tudo num container com padding uniforme
- A sidebar passa a ser um elemento inline no fluxo da pagina

**2. `src/components/club/ClubSidebar.tsx`**
- Remover `fixed inset-y-0 left-0` do desktop
- Remover `border-r` e trocar por estilo card com `rounded-2xl border bg-card`
- Adicionar `sticky top-4` para manter a sidebar visivel ao fazer scroll
- Reduzir a largura de `w-64` para `w-60` e usar `shrink-0`
- Manter comportamento mobile (overlay) inalterado
- Manter toda a estrutura de navegacao (seccoes, collapsibles, links)

### Resultado Visual

```text
+--padding--+------------------------------------------+--padding--+
|           |                                          |           |
|           | +----------+  +------------------------+ |           |
|           | | Sidebar  |  | Conteudo (hero, tabs,  | |           |
|           | | rounded  |  | forum, etc.)           | |           |
|           | | card     |  |                        | |           |
|           | | sticky   |  |                        | |           |
|           | +----------+  +------------------------+ |           |
|           |                                          |           |
+--padding--+------------------------------------------+--padding--+
```

A sidebar passa a ter o mesmo estilo de card que os outros elementos da pagina (como o card de gamificacao e o CommunitySidebar), criando coerencia visual.

## Detalhe Tecnico

| Ficheiro | Alteracao |
|---|---|
| `src/components/club/ClubLayout.tsx` | Remover pl-64, usar flex inline com gap e container |
| `src/components/club/ClubSidebar.tsx` | Desktop: remover fixed/border-r, usar rounded-2xl card sticky. Mobile: manter overlay |

2 ficheiros editados. Sem migracoes SQL.

