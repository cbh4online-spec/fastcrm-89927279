

# WhatsApp com Link Clicável no Painel de Detalhes

## Diagnóstico

No painel lateral de detalhes (`EntityDetailsPanel.tsx`), o campo WhatsApp usa `linkType="url"`, mas o valor guardado é frequentemente um número de telefone (ex: `+3519186145`), não um URL. Resultado: o número aparece como texto sem link útil, ou tenta abrir como URL genérico.

O campo `whatsapp_url` pode conter um URL (`https://wa.me/...`) ou um número de telefone. Ambos os casos precisam de tratamento.

## Solução

Adicionar um novo `linkType="whatsapp"` ao componente `EditableFieldRow` que:
- Se o valor já for um URL (`wa.me` ou `https://`), usa-o directamente
- Se for um número de telefone, gera automaticamente `https://wa.me/{numero_limpo}`
- Renderiza com ícone do WhatsApp e abre numa nova tab

## Alterações

| Ficheiro | Alteração |
|---|---|
| `src/components/entity/EntityDetailsPanel.tsx` | 1. No `renderValue()`, adicionar bloco para `linkType === 'whatsapp'` que converte número em link `wa.me`. 2. Alterar as 3 linhas de WhatsApp (Contact, Company, Lead) de `linkType="url"` para `linkType="whatsapp"` |

### Lógica do `renderValue` para whatsapp

```typescript
if (isLink && linkType === 'whatsapp') {
  const raw = String(value);
  const href = raw.startsWith('http') 
    ? raw 
    : `https://wa.me/${raw.replace(/[^\d+]/g, '').replace(/^\+/, '')}`;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" onClick={stopProp}
       className="text-[#25D366] hover:underline text-[13px] font-medium break-all">
      {raw}
    </a>
  );
}
```

Alteração mínima: ~10 linhas adicionadas, 3 linhas modificadas.

