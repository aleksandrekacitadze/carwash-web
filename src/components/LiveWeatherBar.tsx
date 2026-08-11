"use client";

import React, { useEffect, useState } from "react";

type Weather = {
  current?: {
    temperature_2m: number;
    apparent_temperature: number;
    precipitation: number;
    wind_speed_10m: number;
    weather_code: number;
  };
};

function weatherText(code?: number) {
  if (code === 0) return "Clear skies";
  if ([1, 2, 3].includes(code ?? -1)) return "Cloudy";
  if ([51, 53, 55, 61, 63, 65].includes(code ?? -1)) return "Rainy";
  if ([71, 73, 75].includes(code ?? -1)) return "Snowy";
  return "Live weather";
}

export default function LiveWeatherBar() {
  const [data, setData] = useState<Weather | null>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch(
        "https://api.open-meteo.com/v1/forecast?latitude=41.7151&longitude=44.8271&current=temperature_2m,apparent_temperature,precipitation,wind_speed_10m,weather_code&timezone=Asia%2FTbilisi",
      );
      const json = await res.json();
      setData(json);
    }

    load();
    const t = setInterval(load, 10 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  const w = data?.current;

  return (
    <div style={S.bar}>
      <span style={S.brandHint}>Tbilisi</span>
      {w ? (
        <span>
          {Math.round(w.temperature_2m)}° · {weatherText(w.weather_code)} · feels{" "}
          {Math.round(w.apparent_temperature)}°
        </span>
      ) : (
        <span>Checking the weather…</span>
      )}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  bar: {
    width: "100%",
    padding: "8px 16px",
    background: "rgba(255,255,255,0.55)",
    backdropFilter: "blur(10px)",
    color: "var(--ink-soft)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    fontSize: 13,
    borderBottom: "1px solid var(--line)",
  },
  brandHint: {
    fontWeight: 700,
    color: "var(--ink)",
  },
};
