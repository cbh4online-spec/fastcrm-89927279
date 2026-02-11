

# Corrigir URL base da loja e adicionar dominio proprio

## O que muda

### 1. URL base fixo
Atualmente o link usa `window.location.origin` (que muda conforme o ambiente -- preview, localhost, etc). Vai passar a usar sempre `https://fastcrm.metodopare.ai` como base fixa.

Exemplo: `https://fastcrm.metodopare.ai/store/minha-loja`

### 2. Dominio proprio (opcional)
O cliente pode configurar um dominio proprio (ex: `loja.minhaempresa.pt`). Se definido, o URL partilhado usa esse dominio em vez do dominio padrao.

Exemplo com dominio proprio: `https://loja.minhaempresa.pt/store/minha-loja`

## Seccao Tecnica

### Migracao SQL
Adicionar coluna `custom_domain` a tabela `store_settings`:

```sql
ALTER TABLE public.store_settings 
  ADD COLUMN IF NOT EXISTS custom_domain TEXT;
```

### Ficheiros a alterar

| Ficheiro | Alteracao |
|---|---|
| `src/hooks/useStoreSettings.ts` | Adicionar `custom_domain` ao tipo `StoreSettings` |
| `src/pages/StoreSettingsPage.tsx` | Mudar URL base de `window.location.origin` para `https://fastcrm.metodopare.ai`. Adicionar campo "Dominio Proprio" ao formulario. A logica de construcao do URL: se `custom_domain` existe usa-o como base, senao usa `https://fastcrm.metodopare.ai` |
| `src/components/store-settings/StoreShareCard.tsx` | Sem alteracoes (ja recebe o URL como prop) |

### Logica de construcao do URL

```text
Se custom_domain preenchido:
  URL = https://{custom_domain}/store/{slug}
Senao:
  URL = https://fastcrm.metodopare.ai/store/{slug_ou_id}
```

### UI do campo dominio proprio
Um campo de texto opcional na tab "Geral" com instrucoes de como apontar o dominio (registo A para 185.158.133.1).

