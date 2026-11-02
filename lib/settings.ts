import { Storage } from "@plasmohq/storage"

export type Theme = "auto" | "light" | "dark" | "warm"

export const THEMES: { value: Theme; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "warm", label: "Warm" }
]

export const syncStorage = new Storage({ area: "sync" })
export const localStorageArea = new Storage({ area: "local" })

export const KEY_ENABLED = "enabled"
export const KEY_THEME = "theme"
export const KEY_COLLAPSED = "awCollapsed"

// "sepia" was the old name of the warm theme; keep saved choices working.
export function normalizeTheme(value: string | null | undefined): Theme {
  if (value === "sepia") return "warm"
  return THEMES.some((t) => t.value === value) ? (value as Theme) : "auto"
}

export async function getSettings() {
  const [enabled, theme] = await Promise.all([
    syncStorage.get<boolean>(KEY_ENABLED),
    syncStorage.get<Theme>(KEY_THEME)
  ])
  return { enabled: enabled !== false, theme: normalizeTheme(theme) }
}
