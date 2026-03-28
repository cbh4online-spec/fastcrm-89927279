

## Melhorar editor de etiquetas com autocomplete e workspace_tags

### Problema actual

O editor de tags nas entidades (Leads, Contactos, Empresas) é um simples input de texto separado por vírgulas — sem autocomplete, sem sugestões, sem cores. As `workspace_tags` já existem na BD com nome e cor, mas não são usadas na edição.

### Plano

**1. Criar `EntityTagEditor.tsx`** — componente reutilizado nos 3 entity types
- Input com autocomplete que sugere tags existentes do workspace (`useWorkspaceTags`)
- Ao digitar, filtra e mostra dropdown com tags correspondentes (nome + cor)
- Enter ou click na sugestão adiciona a tag
- Se a tag não existe no workspace, cria automaticamente via `useCreateWorkspaceTag`
- Cada tag aparece como Badge colorida com botão X para remover
- Backspace no input vazio remove a última tag

**2. Integrar no `InlineEditableField`**
- Substituir o input comma-separated do case `"tags"` pelo novo `EntityTagEditor`
- O componente recebe `value` (string[]) e `onChange` (string[] → void)

**3. Integrar nas TagsSections**
- `src/components/leads/sections/TagsSection.tsx` — já usa `InlineEditableField` com `fieldType="tags"`, herda automaticamente
- `src/components/companies/sections/TagsSection.tsx` — idem
- `src/components/contacts/eni/sections/CommercialProfileSection.tsx` — idem

### Ficheiros

| Ficheiro | Ação |
|---|---|
| `src/components/entity/EntityTagEditor.tsx` | Criar — autocomplete + badges coloridas + criação inline |
| `src/components/custom-fields/InlineEditableField.tsx` | Alterar case `"tags"` para usar `EntityTagEditor` |

### UX do componente

```text
┌─────────────────────────────────────────┐
│ [marketing ×] [vip ×] [quente ×]        │
│ ┌─────────────────────────────────────┐ │
│ │ Adicionar etiqueta...               │ │
│ └─────────────────────────────────────┘ │
│  ┌───────────────────────────────┐      │
│  │ 🟣 marketing-digital          │      │
│  │ 🟡 marketing-b2b              │      │
│  │ + Criar "marketin..."         │      │
│  └───────────────────────────────┘      │
└─────────────────────────────────────────┘
```

- Dropdown aparece ao focar/digitar
- Filtra em tempo real
- Opção "Criar nova" no final quando não há match exacto
- Tags com cor do `workspace_tags.color` ou cor default

