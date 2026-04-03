

# Mapa Visual de Pica Pontos na Página de Time Tracking

## Objectivo

Adicionar um card com mapa interactivo (Google Maps embed) na página de Controlo de Ponto que mostra marcadores para cada sessão com coordenadas GPS, permitindo visualizar onde cada colaborador picou o ponto.

## Alterações

| Ficheiro | Acção |
|---|---|
| `src/components/hr/ClockInsMap.tsx` | **Criar** — componente de mapa com marcadores de pica pontos usando iframes do Google Maps (sem API key, embed estático) ou marcadores clicáveis |
| `src/pages/dashboard/hr/HRTimeTrackingPage.tsx` | **Editar** — adicionar o componente `ClockInsMap` entre os filtros e a tabela de sessões |

## Detalhe técnico

### Componente `ClockInsMap`

- Recebe as `sessions` (já carregadas pelo hook `useHRWorkSessions`) como prop
- Filtra sessões que têm `clock_in_lat` e `clock_in_lng` não nulos
- Renderiza um Google Maps embed com marcadores para cada pica ponto:
  - Usa a API estática do Google Maps (`/maps/embed`) com múltiplos pontos via query `q=lat,lng`
  - Alternativa: renderizar um mapa via iframe centrado na média das coordenadas, com uma lista lateral clicável de marcadores
- Cada marcador/item mostra: nome do colaborador, hora de entrada, localidade
- Cores diferenciadas por estado (completo vs incompleto) ou por colaborador
- Estado vazio: mensagem "Sem registos com localização neste período"

### Abordagem sem API key

Como o Google Maps embed com múltiplos marcadores requer API key, usaremos **OpenStreetMap via Leaflet** (pacote `react-leaflet` + `leaflet`) que é gratuito e open-source:
- Mapa centrado na média das coordenadas das sessões
- Marcadores clicáveis com popup mostrando nome, hora e local
- Cores por colaborador usando ícones customizados
- Cluster de marcadores quando há muitos pontos próximos

### Integração na página

O card do mapa será inserido logo após os filtros de data/funcionário, antes do card "Registar Ponto":
- Card com título "Mapa de Registos" e ícone MapPin
- Altura fixa de ~400px
- Colapsável para não ocupar espaço quando não necessário

### Dependências

- `leaflet` + `react-leaflet` (npm packages a instalar)
- CSS do Leaflet importado no componente

