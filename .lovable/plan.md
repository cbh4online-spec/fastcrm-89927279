

# Pré-visualização Inline de Ficheiros PDF e Imagens

## Alterações

### `EntityDocumentsSection.tsx` — Componente `DocumentRow`

Adicionar um botão de pré-visualização (ícone `Eye`) e um estado de expansão por documento. Ao clicar, expande uma área abaixo do ficheiro com:

- **Imagens** (`.jpg`, `.jpeg`, `.png`, `.webp`): renderizar `<img>` com `max-height: 300px`, `object-contain`, cantos arredondados
- **PDFs** (`.pdf`): renderizar `<iframe>` com `src={doc.file_url}`, `height: 400px`, `width: 100%`, borda arredondada

Lógica de detecção: extrair extensão do `file_name` para determinar o tipo. Só mostrar o botão de pré-visualização para extensões suportadas (imagens + PDF).

### Estrutura visual

```text
📄 Contrato.pdf   [👁 Preview] [⬇ Download] [🗑 Delete]
┌─────────────────────────────────────────┐
│  <iframe src="...pdf" height=400 />     │
└─────────────────────────────────────────┘

📄 Logo.png       [👁 Preview] [⬇ Download] [🗑 Delete]
┌─────────────────────────────────────────┐
│  <img src="...png" max-h=300 />         │
└─────────────────────────────────────────┘
```

### Ficheiros

| Ficheiro | Acção |
|----------|-------|
| `src/components/entity/EntityDocumentsSection.tsx` | Adicionar estado `previewOpen`, botão `Eye`, e render condicional de `<img>` ou `<iframe>` no `DocumentRow` |

