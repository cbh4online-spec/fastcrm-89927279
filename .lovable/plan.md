

# Plano: Otimizar Editor de Email - Layout Centrado e Totalmente Editavel

## Problemas Atuais Identificados

1. **Layout Descentrado**: O canvas fica colado a esquerda quando nao ha bloco selecionado
2. **Painel Direito Vazio**: Quando nenhum bloco esta selecionado, o painel direito desaparece completamente
3. **Falta Edicao Inline**: Os blocos de texto ainda usam textarea em vez de edicao direta
4. **Editores Incompletos**: Blocos premium (Hero, Product, Testimonial, Countdown, Menu) nao tem editores no BlockEditor
5. **Feedback Visual Fraco**: Nao fica claro que os elementos sao editaveis

---

## Solucao Proposta

### 1. Layout de 3 Colunas Permanente

Redesenhar o layout para ter sempre 3 paineis visiveis:

```text
+--------------------------------------------------+
|                    HEADER                         |
+----------+------------------------+---------------+
|          |                        |               |
|  LEFT    |       CANVAS           |    RIGHT      |
|  PANEL   |     (centrado)         |    PANEL      |
|  (272px) |     (flex-1)           |   (300px)     |
|          |                        |               |
|          |                        | Sem selecao:  |
|          |                        | Design Global |
|          |                        |               |
|          |                        | Com selecao:  |
|          |                        | Block Editor  |
+----------+------------------------+---------------+
```

**Comportamento do Painel Direito:**
- Sem bloco selecionado: Mostra Design Global (cores, fontes, largura)
- Com bloco selecionado: Mostra BlockEditor do bloco

### 2. Edicao Inline no Canvas

Integrar o RichTextEditor existente diretamente nos blocos de texto:

- Clicar num bloco de texto ativa modo edicao
- Toolbar flutuante aparece
- Clicar fora guarda alteracoes

### 3. Editores Completos para Todos os Blocos

Adicionar editores no BlockEditor para:

| Bloco | Campos Editaveis |
|-------|------------------|
| Hero | Titulo, Subtitulo, Texto botao, URL, Imagem fundo, Altura, Overlay |
| Product | Nome, Descricao, Preco, Preco antigo, Imagem, URL compra |
| Testimonial | Citacao, Nome, Cargo, Avatar |
| Countdown | Data/Hora alvo, Titulo, Subtitulo, Cores |
| Menu | Lista de links (nome + URL), Alinhamento |
| ImageText | Imagem, Texto, Layout (esquerda/direita), Proporcao |
| Social | Redes (adicionar/remover), Estilo icones, Tamanho |

### 4. Feedback Visual Melhorado

- Indicadores "Clica para editar" nos blocos vazios
- Hover states mais obvios
- Animacao quando bloco fica selecionado
- Icons contextuais nos blocos

---

## Ficheiros a Modificar

### `src/components/email-builder/EmailBuilder.tsx`

Alteracoes:
- Layout de 3 colunas permanentes
- Painel direito sempre visivel
- Logica para mostrar DesignSidebar vs BlockEditor

```text
Antes:
{selectedBlock && (
  <div className="w-80 border-l bg-background">
    <BlockEditor ... />
  </div>
)}

Depois:
<div className="w-80 border-l bg-background">
  {selectedBlock ? (
    <BlockEditor ... />
  ) : (
    <DesignSidebar ... />
  )}
</div>
```

### `src/components/email-builder/EmailCanvas.tsx`

Alteracoes:
- Integrar RichTextEditor para blocos de texto
- Edicao inline para campos simples (titulos, botoes)
- Melhor feedback visual de hover/selecao
- Indicadores "editavel" nos blocos

### `src/components/email-builder/BlockEditor.tsx`

Alteracoes:
- Adicionar editores para Hero, Product, Testimonial, Countdown, Menu, ImageText, Social
- Organizar em tabs: Conteudo | Estilo
- Adicionar controles visuais de padding (4 inputs)
- Preview inline das alteracoes

### `src/components/email-builder/DesignSidebar.tsx`

Alteracoes:
- Adicionar mais opcoes de design global
- Bordas arredondadas do container
- Sombras
- Espacamento interno padrao

---

## Detalhes Tecnicos

### Editores de Blocos Premium

**Hero Block Editor:**
```text
- Titulo (input)
- Subtitulo (input)
- Botao: Texto + URL
- Altura (slider: 200-500px)
- Imagem de fundo (upload)
- Cor overlay (color picker + opacidade)
- Alinhamento vertical (top/center/bottom)
```

**Product Block Editor:**
```text
- Imagem do produto (upload)
- Nome (input)
- Descricao (textarea)
- Preco atual (input)
- Preco antigo (input, opcional)
- Badge (input, ex: "Novo", "Desconto")
- Texto botao + URL
```

**Countdown Block Editor:**
```text
- Data alvo (date picker)
- Hora alvo (time picker)
- Titulo (input)
- Subtitulo (input)
- Cor de fundo (color)
- Cor dos numeros (color)
- Mostrar: Dias/Horas/Mins/Segs (checkboxes)
```

**Menu Block Editor:**
```text
- Lista de links (array):
  - Label (input)
  - URL (input)
  - [Adicionar] [Remover]
- Separador (input)
- Alinhamento (left/center/right)
```

### Edicao Inline no Canvas

Para blocos de texto, substituir renderizacao estatica por RichTextEditor:

```text
Antes:
<div dangerouslySetInnerHTML={{ __html: content.html }} />

Depois:
{isSelected ? (
  <RichTextEditor
    value={content.html}
    onChange={(html) => onUpdateBlock(block.id, { content: { ...content, html } })}
    autoFocus
  />
) : (
  <div dangerouslySetInnerHTML={{ __html: content.html }} />
)}
```

Para titulos e botoes, usar contentEditable:

```text
<span
  contentEditable={isSelected}
  suppressContentEditableWarning
  onBlur={(e) => updateContent({ text: e.currentTarget.textContent })}
>
  {content.text}
</span>
```

---

## Prioridade de Implementacao

### Fase 1 - Layout (Imediato)
1. Painel direito sempre visivel
2. Canvas centrado
3. Transicao suave entre Design e BlockEditor

### Fase 2 - Editores Completos
4. Editor Hero block
5. Editor Product block
6. Editor Countdown block
7. Editor Testimonial block
8. Editor Menu block
9. Editor ImageText block
10. Editor Social block

### Fase 3 - Edicao Inline
11. RichTextEditor no canvas para texto
12. ContentEditable para titulos
13. Feedback visual melhorado

---

## Resultado Esperado

Apos implementacao:
- Editor sempre com 3 colunas visiveis
- Canvas perfeitamente centrado
- Todos os blocos com editores completos
- Edicao inline para texto
- UX profissional e intuitiva

