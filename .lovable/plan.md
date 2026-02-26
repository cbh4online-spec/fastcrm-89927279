

# Pastas nos Ficheiros + Revisão do Painel de Detalhes

## 1. Pastas nos Ficheiros

### Migração SQL
Adicionar coluna `folder` (TEXT, nullable, default NULL) à tabela `entity_documents`. Ficheiros na raiz têm `folder = NULL`, ficheiros dentro de uma pasta têm `folder = 'nome-da-pasta'`.

### Actualizar `EntityDocumentsSection.tsx`
- Adicionar botão "Criar Pasta" ao lado de "Adicionar" no header
- Dialog simples para criar pasta (campo nome)
- Agrupar ficheiros por `folder`: mostrar pastas como linhas colapsáveis com ícone de pasta e contagem de ficheiros
- Upload passa a permitir seleccionar pasta destino (dropdown opcional no dialog de upload)
- Ficheiros sem pasta aparecem na raiz
- Visual: ícone de pasta com chevron para expandir/colapsar, similar ao screenshot Attio

### Estrutura visual
```text
Files
├── [+ Upload file]  [+ Create folder]
├── 📁 iRepair Stop (1 ficheiro)         ▼
│   └── 📄 iRepair Pitch Deck   Sep 24th 2025
├── 📄 Contrato.pdf              Jan 12th 2026
```

## 2. Painel de Detalhes — já alinhado

O `EntityDetailsPanel` actual já segue a metodologia Attio:
- Secções colapsáveis (`CollapsibleSection`) com chevron
- Campos editáveis inline (`EditableFieldRow`) com ícones coloridos
- Tags com cores distintas
- Layout label + valor alinhado

Pequenas melhorias de alinhamento com o screenshot:
- Adicionar secção "Datas" com `created_at` / `updated_at` formatados
- Adicionar "Show all values" link quando há mais de 5 campos numa secção (progressive disclosure como Attio)

## Ficheiros

| Ficheiro | Acção |
|----------|-------|
| Migração SQL | Adicionar coluna `folder` a `entity_documents` |
| `src/components/entity/EntityDocumentsSection.tsx` | Pastas colapsáveis + criar pasta + upload com pasta destino |
| `src/components/entity/EntityDetailsPanel.tsx` | Secção "Datas" + "Show all values" progressive disclosure |

