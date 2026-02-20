

# Fix: Esconder Templates AIDA Estáticos para Workspaces que Não São "metodopare"

## Problema

Os templates estáticos (Clínicas, Imobiliárias, Formação, etc.) vindos do ficheiro `verticalConfigs.ts` continuam a aparecer para **todos** os workspaces, incluindo "Be a leader". Isto acontece porque o plano anterior foi aprovado mas nunca foi aplicado ao código.

## Solução

Condicionar a renderização dos templates estáticos ao workspace `metodopare`. Apenas **uma variável** e **três alterações cirúrgicas** no mesmo ficheiro.

## Alterações

| Ficheiro | O que muda |
|---|---|
| `src/components/funnels/FunnelsList.tsx` | 3 edições pontuais |

### Detalhe

1. **Adicionar variável** (após linha 37, onde `currentWorkspace` já é lido):
   ```tsx
   const isMetodoPare = currentWorkspace?.slug === "metodopare";
   ```

2. **Badge de contagem** (linha 257) -- mostrar só os templates visíveis:
   ```tsx
   // De:
   {Object.keys(verticalConfigs).length + (customTemplates?.length ?? 0)} activos
   // Para:
   {(isMetodoPare ? Object.keys(verticalConfigs).length : 0) + (customTemplates?.length ?? 0)} activos
   ```

3. **Bloco de templates estáticos** (linha 262) -- condicionar a renderização:
   ```tsx
   // De:
   {Object.values(verticalConfigs).map((vertical) => (
   // Para:
   {isMetodoPare && Object.values(verticalConfigs).map((vertical) => (
   ```

4. **Secção inteira** (linhas 251-395) -- esconder se não há nada para mostrar:
   ```tsx
   // Envolver toda a secção "Templates Verticais (AIDA)" numa condição:
   {(isMetodoPare || (customTemplates && customTemplates.length > 0)) && (
     // ... secção existente ...
   )}
   ```

### Resultado

- **metodopare**: vê tudo (templates estáticos + custom) -- sem alteração de comportamento
- **Be a leader** e outros: vêem apenas templates custom criados por eles; se não tiverem nenhum, a secção desaparece completamente
