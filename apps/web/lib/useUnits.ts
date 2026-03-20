"use client";
import { useEffect, useState } from "react";

export type UnitSystem = "imperial" | "metric";

const KEY = "flexmatches_units";

export function getUnits(): UnitSystem {
  if (typeof window === "undefined") return "imperial";
  return (localStorage.getItem(KEY) as UnitSystem) ?? "imperial";
}

export function setUnits(system: UnitSystem) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, system);
  window.dispatchEvent(new Event("units-changed"));
}

export function useUnits() {
  const [units, setUnitsState] = useState<UnitSystem>("imperial");

  useEffect(() => {
    setUnitsState(getUnits());
    const handler = () => setUnitsState(getUnits());
    window.addEventListener("units-changed", handler);
    return () => window.removeEventListener("units-changed", handler);
  }, []);

  const isImperial = units === "imperial";

  return {
    units,
    weightUnit: isImperial ? "lbs" : "kg",
    distanceUnit: isImperial ? "mi" : "km",
    weightLabel: isImperial ? "lbs" : "kg",
    distanceLabel: isImperial ? "mi" : "km",
  };
}
