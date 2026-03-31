

## Adicionar Clock-In/Out ao Dashboard Principal

### Alterações

**1. `src/components/hr/ClockInOutButton.tsx`** — Melhorar com relógio live e tradução PT:
- Adicionar `useState` + `useEffect` com `setInterval(1s)` para relógio em tempo real
- Traduzir "Clock In" → "Iniciar Trabalho", "Clock Out" → "Terminar Trabalho"

**2. `src/components/member-panel/MemberPanel.tsx`** — Inserir `<ClockInOutButton />` entre `DayOverview` e `AIPriorities`

### Critérios de aceitação
1. Relógio actualiza em tempo real no dashboard
2. "Iniciar Trabalho" regista clock-in com geolocalização
3. Após clock-in, mostra hora de entrada e botão "Terminar Trabalho"
4. Toast de confirmação em PT

