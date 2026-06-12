# Harvestion Chrome Extension

Easily add Harvest time entries straight from Notion tickets or database entries, using a modern TypeScript, React, and Tailwind-powered Chrome Extension.

---

## Features
- Detect tickets/database elements on Notion pages
- Extracts relevant info and lets you add Harvest time entries in one click
- Uses React for the UI (Popup & Options)
- Built with Vite, TypeScript, and Tailwind CSS for best-in-class DX

---

## Local Development

### 1. Install dependencies
```sh
npm install
```

### 2. Start Dev Server (with live rebuilt outputs)
```sh
npm run dev
```
You can also build a production bundle:
```sh
npm run build
```
By default, build output is in `dist/`.

Important for dev mode:
- Keep `npm run dev` running while the extension is loaded.
- Load unpacked from `dist/` (not project root).
- This project uses a fixed dev server port (`http://localhost:5188`) so Chrome and CRXJS stay in sync.
- If dev mode fails to connect, reload the extension from `chrome://extensions/`.

### 3. Load Extension in Chrome
1. Go to `chrome://extensions/`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `dist/` folder (after `npm run dev` or `npm run build`)

Reload in Chrome after each build as you work.

### 4. Project Structure
```
harvestion/
├── src/
│   ├── background/   # Background (service worker) scripts
│   ├── content/      # Content scripts (run in Notion)
│   ├── popup/        # React popup UI & HTML
│   ├── options/      # React options UI & HTML
│   └── ...           # (add logic/helpers/modules as needed)
├── icons/            # Extension icons (16/48/128 px)
├── manifest.config.ts# Manifest (MV3, crxjs style)
├── vite.config.ts    # Vite + CRXJS config
├── tailwind.config.js# Tailwind setup
└── ...
```

### 5. Customization
- Edit manifest in `manifest.config.ts` for permissions, matches, entry points
- React UI: edit files in `src/popup/` and `src/options/`
- Content scraping: edit logic in `src/content/index.ts`

---

## Technology Stack
- TypeScript
- React (Popup, Options, future UI components)
- Vite (bundler)
- Tailwind CSS (modern utility-first styling)
- Manifest v3 (secure, modern Chrome extension platform)
- [crxjs](https://crxjs.dev/) (smoothest Vite+MV3 workflow)

---

## Further Improvements
- Implement Notion and Harvest authentication flows
- Field mapping UI for custom integrations
- Add notifications, error handling, and loading spinners
- Automated tests (unit + e2e)

---

## Useful Links
- [Chrome Extensions Docs](https://developer.chrome.com/docs/extensions)
- [crxjs Docs](https://crxjs.dev/)
- [Notion API](https://developers.notion.com/)
- [Harvest API](https://help.getharvest.com/api-v2/)

---

For issues, suggestions, or contributions, open an Issue or Pull Request.
