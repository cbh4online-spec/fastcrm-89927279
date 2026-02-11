

# Adicionar Scroll na Criacao de Produto com IA

## Problema

O dialogo de criacao de produto (`StoreQuickProductDialog`) nao tem scroll. Quando a IA devolve os dados do produto e o formulario completo aparece (nome, preco, peso, categoria, stock, condicao, descricao, etc.), o conteudo ultrapassa a altura da janela e fica cortado/inacessivel.

## Solucao

Envolver o conteudo interior do `DialogContent` num `ScrollArea` com altura maxima limitada (ex: `max-h-[80vh]`), garantindo que todo o formulario fica acessivel via scroll.

## Seccao Tecnica

### Ficheiro: `src/components/store/StoreQuickProductDialog.tsx`

- Importar `ScrollArea` de `@/components/ui/scroll-area`
- Envolver todo o conteudo dentro do `DialogContent` (desde o `DialogHeader` ate ao fim) num `ScrollArea` com `className="max-h-[80vh]"`
- Adicionar padding interno (`pr-4`) para compensar a scrollbar e manter o layout limpo

Alteracao minima -- apenas uma linha de import e dois wrappers JSX.

