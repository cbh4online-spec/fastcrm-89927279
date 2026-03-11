

## Redesign visual do Manifesto

O manifesto atual é renderizado como texto simples com `ReactMarkdown` dentro de um `Card` básico — sem hierarquia visual, sem destaque, sem personalidade. Vou transformá-lo numa experiência visual inspiradora.

### Alterações no `src/components/vision/ManifestoEditor.tsx`

**Modo de pré-visualização (não-edição):**

1. **Header com gradiente** — Fundo com gradiente subtil (purple/indigo), ícone decorativo grande (Scroll/Flame), título estilizado "O Meu Manifesto" com tipografia premium
2. **Corpo do manifesto** — Fundo com padrão sutil, tipografia serif/elegante para o texto, espaçamento generoso, borda lateral decorativa (accent bar à esquerda estilo citação)
3. **Primeira frase destacada** — O primeiro parágrafo/linha renderizado com tamanho maior e peso bold como "statement" principal
4. **Pontos numerados estilizados** — Cada ponto do manifesto com número destacado em círculo colorido, texto com bom espaçamento
5. **Rodapé inspiracional** — Data de criação/atualização, badge "Manifesto Pessoal"
6. **Efeito visual** — Borda com gradiente subtil no card, sombra suave

**Modo de edição:** Mantém o textarea funcional mas com melhor styling (dica de markdown, preview side-by-side opcional)

### Estrutura visual

```text
┌─────────────────────────────────────────┐
│  ✧  O MEU MANIFESTO                    │
│     ─────────────────                   │
│                                         │
│  "Manifesto da Ascensão Financeira:     │
│   Rumo aos 170k"                        │  ← título destacado
│                                         │
│  ┃ Transformar a pressão financeira...  │  ← accent bar
│  ┃ marca histórica de 170.000€...       │
│                                         │
│  ① Prioridade Absoluta à Receita...     │  ← pontos numerados
│  ② Enfrentar a Realidade...             │     com estilo
│  ③ Crescimento Exponencial...           │
│  ④ Resiliência no Duo...                │
│  ⑤ Foco no Prazo...                    │
│                                         │
│  ─── Manifesto Pessoal · Atualizado ── │
└─────────────────────────────────────────┘
```

### Ficheiro a editar
- `src/components/vision/ManifestoEditor.tsx` — redesign completo do modo de visualização com componentes customizados de rendering do markdown

