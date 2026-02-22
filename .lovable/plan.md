

# Corrigir filtro do "Iniciar Sequencia"

## Problema encontrado

O botao "Iniciar Sequencia" filtra apenas perfis com `outreach_step === 0` ou `null`. Os perfis que seleccionou ja tinham `outreach_step = 1` (ja receberam a primeira mensagem anteriormente), por isso nenhum passou no filtro.

## Solucao

Tornar o filtro mais flexivel e dar mais informacao ao utilizador:

### `ProspectingResults.tsx`

1. **Remover o filtro restritivo** - permitir iniciar sequencia para qualquer perfil seleccionado, independentemente do `outreach_step` actual
2. **Mostrar aviso** quando alguns perfis ja tiverem outreach em progresso, perguntando se quer reiniciar ou continuar a sequencia
3. **Melhorar a mensagem de erro** - se todos os perfis estiverem filtrados, dizer exactamente quantos ja tem outreach e dar opcao de prosseguir

### Alteracao concreta

Alterar a funcao `handleBulkOutreach`:
- Em vez de filtrar silenciosamente, seleccionar todos os perfis escolhidos
- Se houver perfis com `outreach_step > 0`, mostrar um toast informativo: "X perfis ja iniciaram sequencia - a gerar nova mensagem para todos"
- Permitir que o utilizador avance com todos os perfis seleccionados

### Ficheiro a modificar
- `src/components/professional-prospecting/ProspectingResults.tsx` - remover filtro `(!p.outreach_step || p.outreach_step === 0)` e substituir por logica que inclui todos os seleccionados
