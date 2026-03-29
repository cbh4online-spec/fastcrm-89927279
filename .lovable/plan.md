

# Mão Animada com Alto Contraste

## Diagnóstico

A mão usa cores de pele claras (`hsl(35, 50%, 95%)`) que se confundem com páginas brancas/claras do eBook, tornando-a invisível.

## Solução

Adicionar um **contorno escuro forte** (stroke escuro + drop shadow mais pronunciado) à mão SVG, garantindo visibilidade em qualquer fundo — claro ou escuro. Isto é mais simples e universal do que um picker de cor.

### Alterações em `AnimatedHandCursor.tsx`

1. **Stroke escuro**: Mudar o `stroke` de `hsl(35, 40%, 85%)` para `hsl(30, 30%, 25%)` (castanho escuro) — cria contorno visível em fundos claros
2. **Fill mais saturado**: Mudar fill para `hsl(35, 60%, 80%)` — tom de pele mais visível, menos "lavado"
3. **Drop shadow mais forte**: Aumentar `stdDeviation` para `2.5` e `floodOpacity` para `0.5`
4. **Outline extra**: Adicionar um segundo `<g>` por baixo com stroke branco grosso (2px) como "halo" — garante contraste em fundos escuros também

| Ficheiro | Acção |
|---|---|
| `src/components/ebooks/AnimatedHandCursor.tsx` | Actualizar cores SVG e sombra para alto contraste |

### Resultado

- Mão visível em páginas brancas (contorno escuro)
- Mão visível em páginas escuras (halo branco + fill colorido)
- Sem necessidade de picker de cor — funciona automaticamente

