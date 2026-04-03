

# Eliminar Informação Repetida no Dashboard

## Diagnóstico

O dashboard principal (`WeeklyDashboard.tsx`) tem dois componentes consecutivos que repetem informação:

1. **`PremiumDashboardHeader`** — mostra "Boa tarde, Jorge · Sexta-Feira, 3 De Abril"
2. **`ClockInOutButton`** — mostra novamente "16:47:10", "Sexta-Feira, 3 de Abril", "Boa tarde! ☁ 21°C · Cascais"

A data, saudação e dia da semana aparecem **duas vezes** consecutivas.

## Solução

Consolidar a informação do pica ponto no `ClockInOutButton`, removendo os dados redundantes (data por extenso e saudação) que já aparecem no header acima. O widget passa a mostrar apenas a informação **única e operacional** do pica ponto:

- **Manter**: Relógio em tempo real (HH:mm:ss), estado da sessão (em serviço/pausa/timer), botões de acção, resumo do dia, meteorologia + localização (é contexto operacional útil para o pica ponto)
- **Remover do ClockInOutButton**: Data por extenso ("Sexta-Feira, 3 de Abril") e saudação ("Boa tarde!") — já estão no `PremiumDashboardHeader`

## Alteração

| Ficheiro | Acção |
|---|---|
| `src/components/hr/ClockInOutButton.tsx` | Remover a linha da data (`format(now, "EEEE, d 'de' MMMM")`) e simplificar o texto de meteorologia para mostrar apenas ícone + temperatura + cidade, sem saudação |

### Detalhe

No `ClockInOutButton`, linhas 127-141:
- Remover linha 130-131 (data por extenso)
- Linha 135: mudar de `{greeting}! {weatherText}` para apenas `{weatherText}` (sem saudação)
- Linha 139: remover o fallback de saudação sem meteo (já está no header)

O relógio grande (HH:mm:ss) mantém-se pois é funcional para o pica ponto — é diferente da data que aparece no header.

