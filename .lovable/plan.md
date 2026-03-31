

## Adicionar Clock-In/Out ao Dashboard (MemberPanel)

### O que muda

Integrar o componente `ClockInOutButton` existente (`src/components/hr/ClockInOutButton.tsx`) no `MemberPanel`, posicionado entre o `DayOverview` e as `AIPriorities`. O relógio já funciona com `useTimeEntries` — basta importar e renderizar.

Melhoria adicional: o `ClockInOutButton` actual não actualiza o relógio em tempo real (renderiza `new Date()` apenas uma vez). Adicionar um `useEffect` com `setInterval` de 1 segundo para o relógio ser live.

### Ficheiros

| Acção | Ficheiro |
|-------|----------|
| Editar | `src/components/member-panel/MemberPanel.tsx` — importar e renderizar `ClockInOutButton` após `DayOverview` |
| Editar | `src/components/hr/ClockInOutButton.tsx` — adicionar `useState` + `setInterval` para relógio live; traduzir botões para PT ("Iniciar Trabalho" / "Terminar Trabalho") |

### Detalhe técnico

**MemberPanel.tsx**: Adicionar `import { ClockInOutButton }` e colocar `<ClockInOutButton />` logo após o bloco `<DayOverview />`.

**ClockInOutButton.tsx**:
- `const [now, setNow] = useState(new Date())` + `useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, [])`
- Usar `now` em vez de `new Date()` nos `format()`
- Renomear "Clock In" → "Iniciar Trabalho", "Clock Out" → "Terminar Trabalho"
- "Em serviço desde" já está em PT ✓

### Critérios de aceitação

1. Dashboard mostra widget de ponto com relógio a correr em tempo real
2. Botão "Iniciar Trabalho" regista clock-in com geolocalização
3. Após clock-in, mostra hora de entrada e botão "Terminar Trabalho"
4. Botão "Terminar Trabalho" regista clock-out
5. Toast de confirmação em PT

