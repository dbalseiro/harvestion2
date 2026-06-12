# Copilot Instructions

## Project Overview

Chrome extension (Manifest v3) that creates Harvest time entries from Notion tickets. Built with TypeScript, React 19, Vite 8, and Tailwind CSS 4.

## Architecture

- **`src/background/index.ts`** — Service worker. All Harvest API calls and message routing happen here.
- **`src/popup/App.tsx`** — Toolbar popup UI. Communicates with background via `chrome.runtime.sendMessage`.
- **`src/options/App.tsx`** — Settings page. Reads/writes credentials to `chrome.storage.local`.
- **`src/lib/harvest.ts`** — Shared types: `HarvestSettings`, `HarvestProject`, `HarvestTask`, `MessageRequest`, `MessageResponse<T>`.

## Coding Conventions

- All inter-agent communication uses the `MessageRequest` / `MessageResponse<T>` discriminated unions defined in `src/lib/harvest.ts`. Add new message types there first.
- `MessageResponse<T>` is always `{ ok: true; data: T } | { ok: false; error: string }`. Never throw from message handlers — return `{ ok: false; error: string }`.
- Background worker must `return true` from `onMessage` listener to signal async response.
- Access `chrome.storage` defensively — validate availability before use (see `getChromeStorage()` in `src/options/App.tsx`).
- Use `chrome.runtime.openOptionsPage()` with a fallback to `window.open(chrome.runtime.getURL(...))` for settings navigation.
- TypeScript strict mode is on. No `any` unless mocking in tests.

## Styling

- Tailwind CSS 4 utility classes only. No custom CSS except in `index.css` (global resets, keyframe animations).
- Popup has gradient background via `src/popup/index.css`. Match visual style when adding new UI.

## Testing

- Framework: Vitest 2.1 + Testing Library, jsdom environment.
- Test files: `*.test.ts` / `*.test.tsx` alongside source files in `src/`.
- **All new features require tests.** See test coverage requirements below.
- Run tests: `npm test -- --run`

### Test Coverage Requirements

| Change | Required test file |
|---|---|
| New data model or message type | `src/lib/harvest.test.ts` |
| New background message handler | `src/background/index.test.ts` |
| New popup logic | `src/popup/App.test.tsx` |
| New options logic | `src/options/App.test.tsx` |

Write logic-focused tests (validation, formatting, payload shape). Avoid complex React render mocks.

## Commit Messages

Use semantic commits: `<type>(<scope>): <subject>`

**Types:** `feat`, `fix`, `test`, `docs`, `refactor`, `chore`, `perf`

**Scopes:** `popup`, `options`, `background`, `storage`, `api`, `tests`, `types`, `ui`, `deps`

**Rules:**
- Subject line under 50 characters, imperative mood ("add", "fix", not "added", "fixed")
- Concise language — no filler words
- Body bullets for non-trivial changes

**Example:**
```
feat(popup): add hours formatting display

- Convert numeric hours to h:mm format in real time.
- Show formatted duration below hours input field.
```
