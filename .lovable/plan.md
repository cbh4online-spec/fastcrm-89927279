

# Corrigir Footer do Portal do Fornecedor

## Estado Atual
O footer em `src/pages/procurement/SupplierPortalPage.tsx` (linhas 316-332) já aponta para `fastcrm.lovable.app` e tem a tagline. Precisa apenas de melhor separador visual e refinamento.

## Alterações

**Ficheiro: `src/pages/procurement/SupplierPortalPage.tsx` (linhas 316-332)**

Substituir o footer atual por uma versão com:
- Separador visual (`<Separator />` do shadcn) antes do bloco
- Link clicável para `https://fastcrm.lovable.app`
- Tagline "AI Revenue Operating System" com formatação clara
- Manter aviso de link pessoal
- Melhorar espaçamento e hierarquia visual

