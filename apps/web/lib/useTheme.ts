export type Theme = "dark" | "light";
const KEY = "flexmatches_theme";

export function applyTheme(t: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", t);
  localStorage.setItem(KEY, t);
}

export function getStoredTheme(): Theme {
  if (typeof localStorage === "undefined") return "dark";
  return (localStorage.getItem(KEY) as Theme) ?? "dark";
}
