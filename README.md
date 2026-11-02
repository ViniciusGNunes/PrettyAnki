# PrettyAnki

A browser extension that gives [AnkiWeb](https://ankiweb.net/) a clean design based on [Ant Design](https://ant.design/) and adds a collapsible deck tree.

## What it does

- **Redesigned interface:** restyles the header, cards, tables, buttons, forms, and menus across AnkiWeb.
- **Themes:** light, dark, warm, or auto, which follows the system setting.
- **Collapsible decks:** collapse or expand nested decks one at a time or all at once. A badge shows how many subdecks are hidden, and the state is remembered.
- **Keyboard accessible:** deck toggles work with <kbd>Enter</kbd> and <kbd>Space</kbd>.
- **Instant on/off:** a popup switch restores the original AnkiWeb design without reloading the page.

## Engineering highlights

- **Rebuilding structure the site doesn't provide:** AnkiWeb renders decks as flat rows and marks nesting only with leading non-breaking spaces. A content script reads that indentation, rebuilds the hierarchy, and restores the original markup when the extension is off.
- **Safe DOM decoration:** updates are idempotent, so the `MutationObserver` that reacts to AnkiWeb's changes never triggers itself in a loop.
- **No flash of the wrong design:** the extension applies the last known state synchronously from `localStorage` at `document_start`, then syncs with extension storage.
- **Fully reversible styling:** the whole theme is scoped under one root class and driven by design tokens, so turning it off leaves AnkiWeb untouched.
- **Minimal permissions:** it requests only `storage`.

## Stack

| | |
| --- | --- |
| Extension | Plasmo (Manifest V3), React 18, TypeScript |
| UI | Ant Design 6 (popup), plus Ant Design design tokens recreated in CSS for AnkiWeb |
| Themes | Light, dark, and warm |
| Browsers | Chromium browsers and Firefox |
