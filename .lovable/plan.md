

# Fix: Dominio Errado nos Links das Bio Pages

## Problema

O link `https://fastcrm.metodopare.ai/bio/be-a-leader/lideranca-resultados-sustentaveis` da erro 404 porque o dominio `fastcrm.metodopare.ai` nao esta configurado. O dominio real publicado do projecto e `https://fastcrm.lovable.app`.

A funcao `getPublicBaseUrl()` em `src/utils/getPublicDomain.ts` esta a devolver o dominio errado.

## Solucao

Alterar o dominio hardcoded de `fastcrm.metodopare.ai` para `fastcrm.lovable.app`.

## Alteracao

| Ficheiro | O que muda |
|---|---|
| `src/utils/getPublicDomain.ts` | Linha 8: `"https://fastcrm.metodopare.ai"` -> `"https://fastcrm.lovable.app"` |

### Detalhe Tecnico

```typescript
// De:
return "https://fastcrm.metodopare.ai";

// Para:
return "https://fastcrm.lovable.app";
```

## Link Correcto

Apos a correcao, o link correcto para a pagina sera:
`https://fastcrm.lovable.app/bio/be-a-leader/lideranca-resultados-sustentaveis`

Todos os botoes "Copiar Link", "Link Curto" e "Ver Pagina" passarao automaticamente a usar o dominio correcto.

