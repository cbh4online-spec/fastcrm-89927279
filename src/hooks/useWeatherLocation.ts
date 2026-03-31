import { useQuery } from "@tanstack/react-query";

interface WeatherLocationData {
  city: string | null;
  temperature: number | null;
  weatherCode: number | null;
  isLoading: boolean;
}

function getPosition(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 10000 }
    );
  });
}

async function fetchWeatherAndCity(coords: { lat: number; lng: number }) {
  const [weatherRes, geoRes] = await Promise.all([
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}&current_weather=true`),
    fetch(`https://nominatim.openstreetmap.org/reverse?lat=${coords.lat}&lon=${coords.lng}&format=json&zoom=10`, {
      headers: { "Accept-Language": "pt" },
    }),
  ]);

  const weather = await weatherRes.json();
  const geo = await geoRes.json();

  const city = geo?.address?.city || geo?.address?.town || geo?.address?.village || geo?.address?.municipality || null;
  const temperature = weather?.current_weather?.temperature ?? null;
  const weatherCode = weather?.current_weather?.weathercode ?? null;

  return { city, temperature, weatherCode };
}

export function useWeatherLocation(): WeatherLocationData {
  const { data, isLoading } = useQuery({
    queryKey: ["weather-location"],
    queryFn: async () => {
      const coords = await getPosition();
      if (!coords) return { city: null, temperature: null, weatherCode: null };
      return fetchWeatherAndCity(coords);
    },
    staleTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  return {
    city: data?.city ?? null,
    temperature: data?.temperature ?? null,
    weatherCode: data?.weatherCode ?? null,
    isLoading,
  };
}

export function getWeatherIcon(code: number | null): string {
  if (code === null) return "☀️";
  if (code === 0) return "☀️";
  if (code <= 3) return "⛅";
  if (code <= 48) return "🌫️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "🌨️";
  if (code <= 82) return "🌧️";
  if (code <= 86) return "🌨️";
  if (code <= 99) return "⛈️";
  return "☀️";
}
