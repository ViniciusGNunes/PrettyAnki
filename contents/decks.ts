// Collapsible deck tree for AnkiWeb's /decks page.
//
// AnkiWeb renders the deck list as flat rows and encodes nesting only as leading
// non-breaking spaces in the deck name (3 more per level). We read that indentation,
// rebuild the hierarchy, add chevron toggles, and remember what is collapsed.
import type { PlasmoCSConfig } from "plasmo"

import { getSettings, KEY_COLLAPSED, KEY_ENABLED, localStorageArea, syncStorage } from "~lib/settings"

export const config: PlasmoCSConfig = {
  matches: [
    "https://ankiweb.net/*",
    "https://*.ankiweb.net/*",
    "https://ankiuser.net/*",
    "https://*.ankiuser.net/*"
  ],
  run_at: "document_start"
}

type Item = {
  row: HTMLElement
  btn: HTMLElement
  col: HTMLElement
  depth: number
  key: string
  kids: number
}

const collapsed = new Set<string>()
let enabled = true
let loaded = false
let queued = false

function save() {
  localStorageArea.set(KEY_COLLAPSED, [...collapsed])
}

function deckButton(row: Element) {
  return row.querySelector<HTMLElement>("button.btn-link:not(.dropdown-toggle)")
}

function leadingText(btn: HTMLElement) {
  return [...btn.childNodes].find((n): n is Text => n.nodeType === Node.TEXT_NODE)
}

function readRows(main: Element): Item[] {
  const out: Item[] = []
  const path: string[] = []
  for (const row of main.querySelectorAll<HTMLElement>(":scope > .row.light-bottom-border")) {
    const btn = deckButton(row)
    if (!btn) continue
    const col = btn.parentElement!
    const tn = leadingText(btn)

    let depth: number
    if (tn && /^\s/.test(tn.data)) {
      // Baseline is 4 chars (3 nbsp + 1 space); each nesting level adds 3 more.
      const leadStr = tn.data.match(/^\s+/)![0]
      depth = Math.max(0, Math.round((leadStr.length - 4) / 3))
      tn.data = tn.data.replace(/^\s+/, "")
      row.dataset.awDepth = String(depth)
      row.dataset.awLead = leadStr
    } else {
      depth = Number(row.dataset.awDepth || 0)
    }

    path.length = depth
    path[depth] = btn.textContent!.trim()
    out.push({ row, btn, col, depth, key: path.join("::"), kids: 0 })
  }
  for (let i = 0; i < out.length; i++) {
    let n = 0
    for (let j = i + 1; j < out.length && out[j].depth > out[i].depth; j++) n++
    out[i].kids = n
  }
  return out
}

function chevronIcon() {
  const ns = "http://www.w3.org/2000/svg"
  const svg = document.createElementNS(ns, "svg")
  for (const [k, v] of Object.entries({
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "2",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    "aria-hidden": "true"
  })) {
    svg.setAttribute(k, v)
  }
  const p = document.createElementNS(ns, "path")
  p.setAttribute("d", "m9 18 6-6-6-6")
  svg.append(p)
  return svg
}

function setAttr(el: Element, name: string, value: string) {
  if (el.getAttribute(name) !== value) el.setAttribute(name, value)
}

function decorate(it: Item, isCollapsed: boolean) {
  const { row, btn, col, depth, kids, key } = it

  if (row.style.getPropertyValue("--aw-depth") !== String(depth)) {
    row.style.setProperty("--aw-depth", String(depth))
  }

  let slot = col.querySelector<HTMLElement>(":scope > .aw-slot")
  if (!slot) {
    slot = document.createElement("span")
    slot.className = "aw-slot"
    col.prepend(slot)
  }

  let chev = slot.firstElementChild as HTMLElement | null
  if (kids > 0) {
    if (!chev) {
      const el = document.createElement("span")
      el.className = "aw-chev"
      el.setAttribute("role", "button")
      el.tabIndex = 0
      el.append(chevronIcon())
      const toggle = (e: Event) => {
        e.preventDefault()
        e.stopPropagation()
        flip(el.dataset.key!)
      }
      el.addEventListener("click", toggle)
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") toggle(e)
      })
      slot.append(el)
      chev = el
    }
    chev.dataset.key = key
    setAttr(chev, "aria-expanded", String(!isCollapsed))
    setAttr(chev, "aria-label", isCollapsed ? "Expand" : "Collapse")
  } else if (chev) {
    chev.remove()
  }

  let badge = col.querySelector(":scope > .aw-count")
  if (isCollapsed) {
    if (!badge) {
      badge = document.createElement("span")
      badge.className = "aw-count"
      btn.after(badge)
    }
    const t = String(kids)
    if (badge.textContent !== t) badge.textContent = t
  } else if (badge) {
    badge.remove()
  }
}

function ensureToolbar(main: Element) {
  let bar = document.querySelector(".aw-toolbar")
  if (!bar) {
    bar = document.createElement("div")
    bar.className = "aw-toolbar container"
    for (const [label, act] of [
      ["Collapse all", "collapse"],
      ["Expand all", "expand"]
    ]) {
      const b = document.createElement("button")
      b.type = "button"
      b.textContent = label
      b.dataset.act = act
      bar.append(b)
    }
    bar.addEventListener("click", (e) => {
      const b = (e.target as Element).closest<HTMLElement>("button")
      if (!b) return
      if (b.dataset.act === "expand") {
        collapsed.clear()
      } else {
        const m = document.querySelector("main")
        if (m) for (const it of readRows(m)) if (it.kids > 0) collapsed.add(it.key)
      }
      save()
      apply()
    })
  }
  if (bar.nextElementSibling !== main) main.before(bar)
}

function flip(key: string) {
  if (collapsed.has(key)) collapsed.delete(key)
  else collapsed.add(key)
  save()
  apply()
}

function teardown() {
  for (const bar of document.querySelectorAll(".aw-toolbar")) bar.remove()
  for (const row of document.querySelectorAll<HTMLElement>("main > .row.light-bottom-border")) {
    row.classList.remove("aw-hidden")
    row.style.removeProperty("--aw-depth")
    for (const el of row.querySelectorAll(".aw-slot, .aw-count")) el.remove()
    if (row.dataset.awLead !== undefined) {
      const btn = deckButton(row)
      const tn = btn && leadingText(btn)
      if (tn && !/^\s/.test(tn.data)) tn.data = row.dataset.awLead + tn.data
      delete row.dataset.awLead
      delete row.dataset.awDepth
    }
  }
}

function apply() {
  queued = false
  if (!loaded) return
  if (!enabled) {
    teardown()
    return
  }

  const onDecks = location.pathname.replace(/\/+$/, "") === "/decks"
  const main = onDecks ? document.querySelector("main") : null
  const items = main ? readRows(main) : []

  if (!main || !items.length) {
    document.querySelector(".aw-toolbar")?.remove()
    return
  }

  ensureToolbar(main)

  let hideBelow = -1
  for (const it of items) {
    const hidden = hideBelow >= 0 && it.depth > hideBelow
    if (!hidden) hideBelow = -1
    it.row.classList.toggle("aw-hidden", hidden)
    const isCollapsed = it.kids > 0 && collapsed.has(it.key)
    if (!hidden && isCollapsed) hideBelow = it.depth
    decorate(it, isCollapsed)
  }
}

function schedule() {
  if (queued) return
  queued = true
  requestAnimationFrame(apply)
}

new MutationObserver(schedule).observe(document.documentElement, {
  childList: true,
  subtree: true,
  characterData: true
})
window.addEventListener("popstate", schedule)

Promise.all([localStorageArea.get<string[]>(KEY_COLLAPSED), getSettings()]).then(([arr, settings]) => {
  ;(arr || []).forEach((k) => collapsed.add(k))
  enabled = settings.enabled
  loaded = true
  schedule()
})

localStorageArea.watch({
  [KEY_COLLAPSED]: ({ newValue }) => {
    collapsed.clear()
    ;((newValue as string[]) || []).forEach((k) => collapsed.add(k))
    schedule()
  }
})
syncStorage.watch({
  [KEY_ENABLED]: ({ newValue }) => {
    enabled = newValue !== false
    schedule()
  }
})
