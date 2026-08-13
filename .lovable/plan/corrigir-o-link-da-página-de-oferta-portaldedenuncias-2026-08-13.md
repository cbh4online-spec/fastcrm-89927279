# Corrigir o link da página de oferta (PORTALDEDENUNCIAS)

## Diagnóstico

O link não abre porque o endereço público do produto é gigantesco. O `store_slug` gerado a partir do nome completo tem 180 caracteres:

```text
/store/metodopare/product/plataforma-de-denuncias-100-web-suporte-tecnico-24-horas-
certificado-ssl-seguranca-setup-de-configuracao-mini-website-de-consulta-edicao-das-
paginas-de-conteudo-ilimitado-registo-das
```

Qualquer versão truncada do endereço (como a que foi partilhada) não corresponde a nenhum registo e a ficha não carrega. Confirmado por consulta ao catálogo: o produto existe, está publicado, e o slug é exatamente o acima.

## O que vai ser feito

1. **Encurtar o slug deste produto** para `portal-de-denuncias`, ficando o endereço:
   `https://fastcrm.metodopare.ai/store/metodopare/product/portal-de-denuncias`
2. **Limitar a geração de slugs** de produtos a ~70 caracteres (corte por palavra, sem cortar a meio), evitando novos casos iguais.
3. **Tolerância a links truncados/antigos**: quando o slug do URL não encontra produto exato, procurar por prefixo do slug e, se houver correspondência única, redirecionar (301 client-side) para o slug correto; caso contrário mostrar o estado "produto não encontrado" já existente em vez de página em branco.
4. **Nome comercial curto opcional**: o campo de nome público continua a ser o do catálogo; o slug passa a ser editável na ficha pública do produto para controlo manual.

## Detalhes técnicos

- `src/utils/getStorefrontItemPath.ts` mantém-se como ponto único de construção de rotas.
- Novo helper de slug com `maxLength` e corte por palavra, usado na criação/atualização de produtos.
- `src/pages/store/StoreProductPage.tsx`: acrescentar fallback de resolução por prefixo (`store_slug ilike '<slug>%'`, limitado a 2 resultados) antes de assumir 404, mantendo o redirecionamento UUID → slug já existente.
- Atualização SQL pontual do `store_slug` do produto `PORTALDEDENUNCIAS` (workspace METODOPARE).

## Critérios de aceitação

- O endereço curto abre a ficha pública sem sessão iniciada.
- O slug antigo continua a funcionar (redireciona para o curto).
- Novos produtos com nomes longos geram slugs ≤ 70 caracteres.
- Sem erros de consola na ficha pública.

## Riscos

- Alterar o slug muda o URL público; o redirecionamento por prefixo cobre partilhas antigas.
