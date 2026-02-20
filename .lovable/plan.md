

# Fix: Filtrar Templates AIDA Estáticos por Workspace

## Problema

A página de Funis mostra **sempre** os templates AIDA estáticos (Clínicas, Imobiliárias, Formação, etc.) porque estes vêm de um ficheiro de configuração (`verticalConfigs.ts`), e não da base de dados. Isto significa que qualquer workspace -- incluindo "Be a leader" -- vê estes templates, mesmo que não tenham nada a ver com o negócio.

O workspace "Be a leader" não tem funis, verticais ou templates personalizados criados, mas vê os templates estáticos de outros sectores.

---

## Solução

Esconder a secção de "Templates Verticais (AIDA)" estáticos quando o workspace **não é o "metodopare"** (o workspace principal onde estes templates fazem sentido). Apenas o workspace `metodopare` deve ver os templates estáticos. Todos os outros workspaces verão apenas os seus templates personalizados (criados via o builder).

---

## Alterações

| Ficheiro | O que muda |
|---|---|
| `src/components/funnels/FunnelsList.tsx` | Condicionar a renderização dos templates estáticos (`verticalConfigs`) ao workspace `metodopare` |

### Detalhe Técnico

No `FunnelsList.tsx`, o bloco que itera sobre `Object.values(verticalConfigs)` (linhas 262-318) será envolvido numa condição que verifica se o `currentWorkspace?.slug === "metodopare"`:

```tsx
// Apenas mostrar templates estáticos para o workspace metodopare
const isMetodoPare = currentWorkspace?.slug === "metodopare";
```

Na secção de Templates AIDA:
- Se `isMetodoPare` = true: renderiza os templates estáticos + templates personalizados (comportamento actual)
- Se `isMetodoPare` = false: renderiza **apenas** os templates personalizados (da base de dados)
- Se não há templates personalizados e não é o workspace metodopare: a secção inteira fica oculta

O badge de contagem também será atualizado para refletir apenas os templates visíveis.
