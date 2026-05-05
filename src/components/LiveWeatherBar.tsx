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
  if (code === 0) return "Clear";
  if ([1, 2, 3].includes(code ?? -1)) return "Cloudy";
  if ([51, 53, 55, 61, 63, 65].includes(code ?? -1)) return "Rain";
  if ([71, 73, 75].includes(code ?? -1)) return "Snow";
  return "Weather";
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
      <b>🌤 Tbilisi Weather</b>
      {w ? (
        <span>
          {Math.round(w.temperature_2m)}°C • Feels {Math.round(w.apparent_temperature)}°C •{" "}
          {weatherText(w.weather_code)} • Wind {Math.round(w.wind_speed_10m)} km/h
        </span>
      ) : (
        <span>Loading weather...</span>
      )}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  bar: {
    width: "100%",
    padding: "10px 16px",
    background: "#07111f",
    color: "#fff",
    display: "flex",
    justifyContent: "center",
    gap: 14,
    flexWrap: "wrap",
    fontSize: 14,
    borderBottom: "1px solid rgba(255,255,255,0.12)",
  },
};