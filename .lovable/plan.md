

# Links curtos para Bio Pages

## Problema
O URL actual `/bio/metodopare/consultoria-marketing-digital-pro` e demasiado longo para usar numa bio do Instagram.

## Solucao
Criar um sistema de short links com codigos curtos (6 caracteres), resultando em URLs como:
`https://fastcrm.metodopare.ai/b/x7kM2p`

### 1. Migration: adicionar coluna `short_code` a `bio_pages`
- Coluna `short_code` (varchar 8, unique, not null, com default gerado automaticamente)
- Funcao SQL para gerar codigo alfanumerico aleatorio de 6 chars
- Preencher os registos existentes

### 2. Nova rota `/b/:shortCode` no `App.tsx`
- Componente leve que busca a `bio_page` pelo `short_code` e redireciona para a rota completa `/bio/:workspaceSlug/:pageSlug`
- Alternativa mais eficiente: renderizar directamente o `PublicBioPage` resolvendo pelo short code

### 3. Actualizar UI para mostrar o link curto
- No `BioPageBuilder.tsx`: botao "Copiar Link Curto" ao lado do existente
- No `BioOS.tsx`: mostrar o link curto na listagem de paginas

### Ficheiros a alterar/criar

| Ficheiro | Accao |
|----------|-------|
| Migration SQL | Adicionar `short_code` a `bio_pages` |
| `src/App.tsx` | Adicionar rota `/b/:shortCode` |
| `src/pages/PublicBioShortLink.tsx` | Criar - resolve short code e renderiza pagina |
| `src/components/bio/BioPageBuilder.tsx` | Adicionar botao "Link Curto" |
| `src/pages/BioOS.tsx` | Mostrar link curto na lista |

### Resultado
- Link longo (SEO): `fastcrm.metodopare.ai/bio/metodopare/consultoria-marketing-digital-pro`
- Link curto (Instagram): `fastcrm.metodopare.ai/b/x7kM2p`
