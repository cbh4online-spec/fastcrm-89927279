

# Adicionar "Briefing" ao menu lateral

## Problema
A página de Briefing Executivo (Strategic Intelligence) existe em `/dashboard/strategy` mas não aparece no menu lateral porque não está registada no Extension Registry nem na navegação.

## Solução

Adicionar uma entrada no Extension Registry para o módulo de briefing estratégico, na categoria "IA", para que apareça automaticamente no sidebar quando o módulo estiver instalado.

### Ficheiro a alterar

| Ficheiro | Alteração |
|---|---|
| `src/config/extensionRegistry.ts` | Adicionar entrada para `strategy-brief` com rota `/dashboard/strategy` na categoria "IA" |

### Detalhes técnicos

Adicionar ao `EXTENSION_REGISTRY` uma nova entrada:

```typescript
{
  moduleSlug: "strategy-brief",
  name: "Brief Executivo",
  category: "IA",
  objectTabs: [
    { key: "strategy-brief", label: "Briefing", icon: FileBarChart, route: "/dashboard/strategy" },
  ],
}
```

Se o módulo `strategy-brief` não estiver na tabela `workspace_modules` do workspace, será necessário adicioná-lo também como módulo activo. Caso contrário, basta registá-lo no extension registry para que o sidebar o mostre automaticamente.

Também será importado o ícone `FileBarChart` do lucide-react (ou outro ícone adequado como `ClipboardList`).

