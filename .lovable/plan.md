

# Plano: Email Builder Visual Completo

## Objetivo

Criar um construtor de email marketing visual com drag-and-drop, semelhante às ferramentas profissionais mostradas (E-goi, GoHighLevel), substituindo o editor HTML atual por uma experiência intuitiva e completa.

---

## Visao Geral da Arquitetura

O sistema sera composto por:
1. **Template Library** - Galeria de templates pre-feitos e modelos do utilizador
2. **Layout Selector** - Escolha de estruturas base (1 coluna, 2 colunas, etc.)
3. **Email Builder Visual** - Editor drag-and-drop com elementos e preview em tempo real
4. **Campaign Flow** - Fluxo de criacao de campanha estilo wizard

---

## Fase 1: Estrutura de Dados

### Novos Tipos TypeScript

```text
EmailBlock {
  id: string
  type: 'text' | 'image' | 'button' | 'divider' | 'spacer' | 'columns' | 'social' | 'footer' | 'logo' | 'video' | 'html'
  content: Record<string, any>
  styles: Record<string, string>
  children?: EmailBlock[] (para colunas)
}

EmailDesign {
  blocks: EmailBlock[]
  globalStyles: {
    backgroundColor: string
    contentWidth: number
    fontFamily: string
    linkColor: string
  }
}
```

### Atualizacao do Schema de Templates

- Adicionar campo `design_json` para armazenar a estrutura de blocos
- Manter `body_html` como versao renderizada final

---

## Fase 2: Componentes do Email Builder

### 2.1 ElementsSidebar

Painel lateral com elementos arrastaveis:
- **Conteudo**: Texto, Imagem, Imagem+Texto, Botao
- **Estrutura**: Colunas (2, 3), Divisor, Espacador
- **Social**: Icones redes sociais, Links de partilha
- **Avancado**: HTML personalizado, Video, Rodape

### 2.2 LayoutsSidebar

Galeria de layouts pre-definidos:
- Blank Template
- Simple Text
- 1 Column with Image
- 2 Columns Alternate
- Hero + Features
- Newsletter Classic

### 2.3 DesignSidebar

Configuracoes globais:
- Cor de fundo do email
- Cor de fundo do conteudo
- Largura do modelo (px)
- Tamanho do limite exterior
- Familia de fonte

### 2.4 EmailCanvas

Area central de edicao visual:
- Renderizacao em tempo real dos blocos
- Suporte a drag-and-drop para reordenacao
- Selecao de bloco com borda visual
- Toolbar flutuante para cada bloco (mover, duplicar, eliminar)
- Responsivo com preview desktop/mobile

### 2.5 BlockEditor

Edicao inline ou painel lateral para:
- Propriedades de texto (fonte, tamanho, cor, alinhamento)
- Upload de imagem e alt text
- Configuracao de botao (texto, URL, cor, arredondamento)
- Links e variaveis dinamicas

---

## Fase 3: Template Library

### 3.1 TemplateGalleryDialog

Modal para selecao de templates:
- Abas: Templates Guardados, Pre-feitos, Modelos Basicos
- Filtros por categoria
- Pesquisa por nome
- Cards com preview thumbnail
- Opcao de favoritar

### 3.2 SystemTemplates

Templates pre-configurados incluidos:
- Newsletter Moderna
- Promocao Black Friday
- Boas-vindas
- Reativacao de Cliente
- Evento/Webinar
- E-commerce Produto

---

## Fase 4: Campaign Wizard Melhorado

### Novo Fluxo de Criacao

```text
Passo 1: Escolher Base
  - Template guardado
  - Template pre-feito
  - Layout basico
  - Importar HTML
  - Campanha recente

Passo 2: Editar Conteudo
  - Email Builder Visual
  - Elementos arrastáveis
  - Design settings

Passo 3: Configurar Envio
  - Enviar Agora / Agendar / Smart Send
  - Nome do remetente
  - Email de resposta
  - Segmento de destinatarios

Passo 4: Definicoes Avancadas
  - Track clicks (toggle)
  - UTM Tracking (toggle)
  - Adicionar tags (toggle)
  - Reenviar a quem nao abriu
  - Tipo de preferencia
```

---

## Fase 5: Funcionalidades Avancadas

### 5.1 Preview Multi-dispositivo

- Toggle Desktop / Tablet / Mobile
- Preview em browser (nova aba)
- Enviar email de teste

### 5.2 Variaveis Dinamicas

Picker integrado para inserir:
- `{{primeiro_nome}}`
- `{{nome_cliente}}`
- `{{empresa_nome}}`
- `{{unsubscribe_url}}`

### 5.3 AI Content Generation

Botao "Content AI" junto ao assunto:
- Gerar linha de assunto
- Sugerir texto para blocos
- Reescrever conteudo selecionado

### 5.4 Spam Score (Futuro)

Indicador visual de spam score:
- Analise do conteudo
- Sugestoes de melhoria

---

## Ficheiros a Criar

| Ficheiro | Descricao |
|----------|-----------|
| `src/components/email-builder/EmailBuilder.tsx` | Componente principal do editor |
| `src/components/email-builder/EmailCanvas.tsx` | Canvas central com preview |
| `src/components/email-builder/ElementsSidebar.tsx` | Painel de elementos |
| `src/components/email-builder/LayoutsSidebar.tsx` | Painel de layouts |
| `src/components/email-builder/DesignSidebar.tsx` | Configuracoes de design |
| `src/components/email-builder/BlockEditor.tsx` | Editor de propriedades do bloco |
| `src/components/email-builder/blocks/*.tsx` | Componentes individuais por tipo de bloco |
| `src/components/email-builder/TemplateGalleryDialog.tsx` | Modal de galeria de templates |
| `src/components/email-builder/EmailPreviewModal.tsx` | Modal de preview |
| `src/types/emailBuilder.ts` | Tipos TypeScript |
| `src/hooks/useEmailBuilder.ts` | Hook de estado do builder |
| `src/utils/emailRenderer.ts` | Renderizador de blocos para HTML |

---

## Ficheiros a Modificar

| Ficheiro | Alteracao |
|----------|-----------|
| `src/pages/Marketing.tsx` | Adicionar rota para builder visual |
| `src/components/marketing/CampaignFormDialog.tsx` | Integrar novo builder |
| `src/components/marketing/TemplateFormDialog.tsx` | Integrar builder visual |
| `src/types/marketing.ts` | Adicionar tipos de EmailDesign |
| `src/hooks/useMarketingTemplates.ts` | Suportar design_json |

---

## Dependencias

O projeto ja inclui as dependencias necessarias:
- `@xyflow/react` - Pode servir de referencia para drag-and-drop (ja usado no FlowBuilder)
- Drag-and-drop nativo com React (useState + onDragStart/onDrop)

---

## Prioridade de Implementacao

1. **MVP (Essencial)**
   - EmailBuilder com 5 tipos de blocos (Texto, Imagem, Botao, Divisor, Espacador)
   - Canvas com drag-and-drop basico
   - 3 layouts pre-definidos
   - Renderizador HTML

2. **Fase 2 (Completo)**
   - Todos os tipos de blocos
   - Template Gallery
   - Campaign Wizard redesenhado
   - Preview multi-dispositivo

3. **Fase 3 (Avancado)**
   - AI Content Generation
   - Spam Score
   - Templates de sistema
   - Undo/Redo

---

## Estimativa

- MVP: 3-4 iteracoes de desenvolvimento
- Versao Completa: 6-8 iteracoes

