

# Melhorar clareza dos gráficos de Evolução Semanal

## Problemas identificados

1. **Cor da Meta quase invisível** — `hsl(var(--muted))` é demasiado claro, confunde-se com o fundo
2. **Gráficos pequenos** — apenas 120px de altura, difícil ler valores
3. **Sem valores visíveis** — as barras não mostram o número, só se vê no tooltip ao passar o rato
4. **Sem escala Y** — impossível saber a magnitude dos valores

## Alterações

### Ficheiro: `WeeklyHistoryCharts.tsx`

1. **Cores mais contrastantes**:
   - Meta: azul claro/cinza escuro com opacidade (`hsl(var(--primary) / 0.25)`) ou uma cor distinta como `#94a3b8`
   - Atingido: manter `hsl(var(--primary))` mas mais saturado

2. **Aumentar altura dos gráficos** de 120px para 160px

3. **Mostrar valor actual** por cima do título de cada métrica (ex: "Receita — €0,00") para leitura imediata

4. **Mostrar labels nos topos das barras** usando a prop `label` do Recharts `<Bar>` com valores formatados

5. **Mostrar YAxis simplificado** com ticks automáticos para dar escala

6. **Actualizar legenda global** com as novas cores

