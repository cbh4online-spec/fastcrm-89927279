

## Plano: Adicionar registo TXT `_lovable` nas Instruções DNS

### Problema
A secção "Instruções DNS" na página `/dashboard/c2c/config` apenas mostra os dois registos A (@ e www), mas falta o registo TXT `_lovable` que é obrigatório para o Lovable verificar a propriedade do domínio e provisionar o certificado SSL.

### Alteração
**Ficheiro:** `src/pages/dashboard/marketplace/MarketplaceConfigPage.tsx` (linhas 296-299)

Adicionar uma terceira linha no bloco de instruções DNS com o registo TXT:

```
Tipo: A    | Nome: @        | Valor: 185.158.133.1
Tipo: A    | Nome: www      | Valor: 185.158.133.1
Tipo: TXT  | Nome: _lovable | Valor: (ver Project Settings → Domains)
```

Também adicionar uma nota explicativa abaixo a indicar que o valor exacto do TXT deve ser obtido em **Project Settings → Domains → Connect Domain**.

### Impacto
- Apenas 1 ficheiro editado
- Sem alterações de lógica, apenas conteúdo informativo

