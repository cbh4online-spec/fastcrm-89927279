

# Remover Estágio "Implementação"

## Problema
O pipeline tem 7 estágios mas o "Implementação" não é necessário. Todos os estágios "Implementação" em todos os workspaces têm 0 oportunidades — é seguro removê-los.

## Alterações

### Base de dados (via edge function temporária)

1. **DELETE** todos os registos de `pipeline_stages` onde `name = 'Implementação'` (9 registos, 0 oportunidades)
2. **UPDATE** `pipeline_stages` onde `name = 'Perdido'` → `position = 5` (era 6)

### Pipeline Final (6 estágios)

```text
Pos 0: Lead               (#3B82F6)
Pos 1: Qualificação        (#8B5CF6)
Pos 2: Proposta            (#F59E0B)
Pos 3: Negociação          (#06B6D4)
Pos 4: Fechado/Ganho       (#22C55E)
Pos 5: Perdido             (#EF4444)
```

### Implementação

Criar uma edge function temporária `cleanup-stages` que executa o DELETE + UPDATE, invocá-la, e depois removê-la.

Sem alterações de código frontend — o Kanban renderiza dinamicamente com base nos estágios da base de dados.

| Acção | Detalhe |
|-------|---------|
| Criar `supabase/functions/cleanup-stages/index.ts` | Edge function que apaga "Implementação" e ajusta posição de "Perdido" |
| Deploy + invocar | Executar a limpeza |
| Apagar a edge function | Remover após uso |

