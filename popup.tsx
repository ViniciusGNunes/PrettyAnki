import { useEffect, useState } from "react"

import { useStorage } from "@plasmohq/storage/hook"
import { ConfigProvider, Segmented, Switch, theme as antTheme, Typography, type ThemeConfig } from "antd"

import { KEY_ENABLED, KEY_THEME, normalizeTheme, syncStorage, THEMES, type Theme } from "~lib/settings"

import "~styles/popup.css"

const SHAPE = { borderRadius: 12, borderRadiusLG: 18, borderRadiusSM: 8 }

const WARM: ThemeConfig = {
  token: {
    ...SHAPE,
    colorPrimary: "#8a5a1e",
    colorTextBase: "#433422",
    colorBgBase: "#f4ecd8",
    colorBgContainer: "#f9f2e1",
    colorBorder: "#d6c7a4",
    colorBorderSecondary: "#e4d8bc"
  }
}

function useSystemDark() {
  const query = "(prefers-color-scheme: dark)"
  const [dark, setDark] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = (e: MediaQueryListEvent) => setDark(e.matches)
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])
  return dark
}

function themeConfig(theme: Theme, systemDark: boolean): ThemeConfig {
  if (theme === "warm") return WARM
  const dark = theme === "dark" || (theme === "auto" && systemDark)
  if (!dark) return { token: { ...SHAPE, colorBgContainer: "#f2f2f2", colorBgElevated: "#fafafa", colorBgLayout: "#f2f2f2", colorBorder: "#d0d0d0", colorBorderSecondary: "#e2e2e2" } }
  return { token: SHAPE, algorithm: dark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm }
}

function Panel() {
  const { token } = antTheme.useToken()
  const [enabled, setEnabled] = useStorage<boolean>({ key: KEY_ENABLED, instance: syncStorage }, true)
  const [storedTheme, setTheme] = useStorage<Theme>({ key: KEY_THEME, instance: syncStorage }, "auto")
  const theme = normalizeTheme(storedTheme)

  useEffect(() => {
    document.body.style.background = token.colorBgContainer
  }, [token.colorBgContainer])

  return (
    <div style={{ color: token.colorText }}>
      <Typography.Title level={5} style={{ margin: 0 }}>
        PrettyAnki
      </Typography.Title>
      <Typography.Text type="secondary">A prettier AnkiWeb</Typography.Text>

      <div className="card">
        <div className="row">
          <span>Enabled</span>
          <Switch checked={enabled} onChange={setEnabled} />
        </div>
      </div>

      <div className="card">
        <span className="label">Theme</span>
        <Segmented<Theme>
          block
          value={theme}
          onChange={setTheme}
          options={THEMES.map((t) => ({ value: t.value, label: t.label }))}
        />
      </div>
    </div>
  )
}

function IndexPopup() {
  const [storedTheme] = useStorage<Theme>({ key: KEY_THEME, instance: syncStorage }, "auto")
  const theme = normalizeTheme(storedTheme)
  const systemDark = useSystemDark()

  return (
    <ConfigProvider theme={themeConfig(theme, systemDark)}>
      <Panel />
    </ConfigProvider>
  )
}

export default IndexPopup
