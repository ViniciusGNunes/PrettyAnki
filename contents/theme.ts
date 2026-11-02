import type { PlasmoCSConfig } from "plasmo"

import { getSettings, KEY_ENABLED, KEY_THEME, normalizeTheme, syncStorage, type Theme } from "~lib/settings"

import "~styles/ankiweb.css"

export const config: PlasmoCSConfig = {
  matches: [
    "https://ankiweb.net/*",
    "https://*.ankiweb.net/*",
    "https://ankiuser.net/*",
    "https://*.ankiuser.net/*"
  ],
  run_at: "document_start"
}

const root = document.documentElement

function apply(settings: { enabled: boolean; theme: Theme }) {
  root.classList.toggle("aw-min", settings.enabled)
  root.setAttribute("data-aw-theme", settings.theme)
  // Cache for the next page load: chrome.storage is async, localStorage is not, so this
  // lets us pick the right state immediately and avoid a flash of the wrong design.
  try {
    localStorage.setItem("awEnabled", settings.enabled ? "1" : "0")
    localStorage.setItem("awTheme", settings.theme)
  } catch {}
}

try {
  apply({
    enabled: localStorage.getItem("awEnabled") !== "0",
    theme: normalizeTheme(localStorage.getItem("awTheme"))
  })
} catch {
  apply({ enabled: true, theme: "auto" })
}

const refresh = () => getSettings().then(apply)
refresh()
syncStorage.watch({ [KEY_ENABLED]: refresh, [KEY_THEME]: refresh })
