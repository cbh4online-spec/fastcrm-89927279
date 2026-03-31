

## Widget de Ponto no Dashboard — Redesign

### O que muda

Redesenhar o `ClockInOutButton` para ser um widget completo e "amigável" que mostra:

1. **Relógio live** (já existe)
2. **Data** (já existe)
3. **Temperatura actual** — via API gratuita Open-Meteo (sem API key)
4. **Localização por texto** — reverse geocoding via API gratuita (nominatim.openstreetmap.org)
5. **Contagem de tempo em serviço** — timer live desde o clock-in (ex: "2h 34m 12s")
6. **Botões Iniciar/Terminar** (já existem)

A abordagem é apresentar a localização e temperatura como informação contextual do dia (como um "bom dia, está 18°C em Lisboa") — não como vigilância.

### Ficheiros

| Acção | Ficheiro |
|-------|----------|
| Criar | `src/hooks/useWeatherLocation.ts` — hook que obtém geolocalização, reverse geocode (cidade) e temperatura via Open-Meteo |
| Editar | `src/components/hr/ClockInOutButton.tsx` — redesenhar widget com layout horizontal, incluir temperatura, cidade, timer de sessão |

### Detalhe técnico

**`useWeatherLocation` hook:**
- `navigator.geolocation.getCurrentPosition()` → lat/lng
- Reverse geocode: `fetch("https://nominatim.openstreetmap.org/reverse?lat=...&lon=...&format=json")` → cidade
- Temperatura: `fetch("https://api.open-meteo.com/v1/forecast?latitude=...&longitude=...&current_weather=true")` → temp em °C
- Cache com `react-query` (staleTime 15min)
- Retorna `{ city, temperature, isLoading }`

**`ClockInOutButton` redesign:**
- Layout horizontal em card com 3 zonas:
  - **Esquerda**: Relógio grande + data + "☀️ 18°C · Lisboa"
  - **Centro**: Se em serviço → timer live "Em serviço há 2h 34m" com animação pulse
  - **Direita**: Botão Iniciar/Terminar
- Timer calculado: `now - activeEntry.clock_in` actualizado a cada segundo
- Ícone de weather (sol/nuvem/chuva) baseado no weathercode da Open-Meteo
- Tom amigável: "Bom dia! 18°C em Lisboa" em vez de "Localização: 38.7223, -9.1393"

### Critérios de aceitação
1. Widget mostra temperatura e cidade junto à data
2. Timer live conta tempo desde clock-in
3. Botões de iniciar/terminar funcionam com geolocalização
4. Sem sensação de controlo — informação contextual e amigável
5. Fallback gracioso se geolocalização/API falhar

