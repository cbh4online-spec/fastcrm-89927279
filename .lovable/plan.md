

# Tornar a Prospeccao Profissional mais produtiva

## Analise do estado actual

O fluxo actual exige muitos passos manuais:
1. Preencher formulario e pesquisar (esperar)
2. Mudar para tab "Resultados"
3. Expandir cada perfil individualmente
4. Enriquecer com Instagram um a um
5. Converter para lead um a um
6. Gerar mensagem um a um

## Melhorias propostas

### 1. Accoes em lote (Bulk Actions)

Os checkboxes de seleccao ja existem na lista de resultados, mas nao fazem nada. Activar:

- **Converter seleccionados**: Converter multiplos perfis em leads de uma vez
- **Rejeitar seleccionados**: Rejeitar multiplos perfis de uma vez
- **Enriquecer seleccionados**: Enriquecer dados Instagram de todos os seleccionados em sequencia

Aparece uma barra de accoes flutuante quando ha perfis seleccionados com contagem e botoes.

### 2. Auto-navegacao para resultados com progresso

Ao pesquisar, em vez de o utilizador esperar num botao "A pesquisar...", mostrar:
- Progresso em tempo real: "A pesquisar... X perfis encontrados" -> "A analisar com IA... X/Y"
- Transicao automatica para resultados (ja acontece parcialmente)

### 3. Pesquisas rapidas / Templates

Guardar pesquisas anteriores como templates reutilizaveis:
- Botao "Repetir" no historico (ja existe click para ver resultados, mas nao para repetir a mesma pesquisa)
- Botao "Repetir pesquisa" que pre-preenche o formulario com os mesmos parametros

### 4. Ordenacao e filtros avancados

Adicionar ao painel de resultados:
- Ordenar por: Lead Score (desc), Seguidores, Data
- Filtro por score minimo (slider)
- Seleccionar todos / nenhum

### 5. Enriquecimento automatico de Instagram durante a analise

O sistema ja suporta `autoEnrichInstagram` na edge function `professional-prospecting-analyze`, mas o frontend nao o activa. Activar por defeito para eliminar o passo manual de enriquecimento.

---

## Detalhes tecnicos

### Ficheiro: `src/components/professional-prospecting/ProspectingResults.tsx`

- Adicionar barra de accoes em lote (bulk action bar) fixa no fundo quando `selectedIds.size > 0`
- Implementar `convertBatch`: itera pelos perfis seleccionados e converte cada um com opcoes default
- Implementar `rejectBatch`: rejeita todos os seleccionados
- Implementar `enrichBatch`: enriquece Instagram de todos os seleccionados
- Adicionar botoes "Seleccionar todos" / "Limpar seleccao"
- Adicionar dropdown de ordenacao (Lead Score, Data, Seguidores)
- Adicionar slider de score minimo

### Ficheiro: `src/components/professional-prospecting/ProspectingSearch.tsx`

- Modificar `handleWebSearch` para passar `autoEnrichInstagram: true` na chamada de analise (linha 108)
- Isto activa o enriquecimento Instagram automatico durante a fase de analise

### Ficheiro: `src/components/professional-prospecting/ProspectingHistory.tsx`

- Adicionar botao "Repetir" em cada entrada do historico
- Ao clicar, emite callback `onRepeatSearch` com os parametros da pesquisa original (profissao, localizacao, keywords, plataformas)

### Ficheiro: `src/pages/ProfessionalProspecting.tsx`

- Adicionar handler `onRepeatSearch` que recebe parametros e muda para tab "search" com os campos pre-preenchidos
- Passar props de pre-fill para `ProspectingSearch`

### Sem alteracoes de base de dados necessarias

Toda a logica ja existe na BD e edge functions. As melhorias sao puramente de frontend e de activacao de flags existentes.

