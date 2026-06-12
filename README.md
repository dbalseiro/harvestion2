# Harvestion Chrome Extension

Easily add Harvest time entries straight from Notion tickets or database entries, using a modern TypeScript, React, and Tailwind-powered Chrome Extension.

---

## Features
- **Polished Popup UI:** Modern, responsive form to create time entries in seconds
- **Live Project/Task Loading:** Fetches your real Harvest projects and task assignments
- **Harvest API Integration:** Securely connects to Harvest API v2 for projects, tasks, and time entry creation
- **Settings Management:** Dedicated options page to manage Harvest Account ID and Personal Access Token
- **Real-time Validation:** Hours display as formatted duration (h:mm), message feedback for all actions
- **React + Tailwind:** Professional UI built with React hooks and Tailwind CSS utility-first styling
- **TypeScript:** Full end-to-end type safety

---

## Current Status

**Implemented:**
✅ Popup UI with project/task selection, hours input, notes, and create button
✅ Background service worker with Harvest API integration
✅ Options page for credential management
✅ Message protocol between popup, options, and background worker
✅ Storage of Harvest credentials in extension local storage
✅ Polished UI with gradient backgrounds and animated elements

**Planned:**
⏳ Notion content script to extract ticket metadata
⏳ Field mapping UI for Notion tags to Harvest project/task defaults
⏳ Timer functionality (start/stop, sync to Harvest)
⏳ Automated tests

---

## Local Development

### 1. Install dependencies
```sh
npm install
```

### 2. Get Harvest Credentials

To test with live Harvest data, you need:
- **Account ID:** Your Harvest account ID (numeric, found in account settings)
- **Personal Access Token:** Generate in Harvest under Admin → Developer → Tokens

[Create a token on Harvest →](https://help.getharvest.com/api-v2/authentication/authentication/personal-access-tokens/)

### 3. Start Dev Server (with live rebuilt outputs)
```sh
npm run dev
```

You can also build a production bundle:
```sh
npm run build
```

By default, build output is in `dist/`.

**Important for dev mode:**
- Keep `npm run dev` running while the extension is loaded.
- Load unpacked from `dist/` (not project root).
- This project uses a fixed dev server port (`http://localhost:5188`) so Chrome and CRXJS stay in sync.
- If dev mode fails to connect, reload the extension from `chrome://extensions/`.

### 4. Load Extension in Chrome
1. Go to `chrome://extensions/`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `dist/` folder (after `npm run dev` or `npm run build`)

### 5. Configure Harvest Credentials
1. Click the Harvestion extension icon in the toolbar
2. Click the **Settings** button in the popup
3. Paste your Harvest Account ID and Personal Access Token
4. Click **Save Settings** and then **Test Connection**
5. Return to the popup and start creating time entries

### 6. Project Structure
```
harvestion2/
├── src/
│   ├── background/        # Service worker with Harvest API integration
│   │   └── index.ts       # Handles Harvest API calls & message routing
│   ├── popup/             # Browser toolbar popup UI
│   │   ├── App.tsx        # React popup component with form
│   │   ├── index.html     # Popup entry point
│   │   ├── main.tsx       # React DOM mount
│   │   └── index.css      # Styles with Tailwind & animations
│   ├── options/           # Settings page for credential management
│   │   ├── App.tsx        # React options component
│   │   ├── index.html     # Options entry point
│   │   ├── main.tsx       # React DOM mount
│   │   └── index.css      # Styles with Tailwind
│   ├── lib/
│   │   └── harvest.ts     # Message types, data models, constants
│   └── content/ (planned)  # Content scripts for Notion pages
├── public/                # Extension icons (16/48/128 px)
├── dist/                  # Build output (do not commit)
├── manifest.config.ts     # Extension manifest (MV3, CRXJS style)
├── vite.config.ts         # Vite + CRXJS bundler config
├── tsconfig.json          # TypeScript config
├── tailwind.config.ts     # Tailwind CSS setup (uses v4 ESM plugin)
├── AGENTS.md              # Agent/role documentation
└── README.md              # This file
```

### 7. Customization
- **Popup UI:** Edit [src/popup/App.tsx](src/popup/App.tsx) for form layout and logic
- **Options Page:** Edit [src/options/App.tsx](src/options/App.tsx) for credential management
- **Harvest Integration:** Edit [src/background/index.ts](src/background/index.ts) for API calls
- **Manifest:** Edit [manifest.config.ts](manifest.config.ts) for permissions, icons, entry points
- **Styling:** All UI uses Tailwind CSS utility classes in JSX

---

## API Integration

### Harvest API v2

The extension communicates with Harvest API v2 endpoints:
- `GET /projects` — Fetch active projects
- `GET /projects/{id}/task_assignments` — Fetch tasks for a project
- `POST /time_entries` — Create a new time entry

**Authentication:** Bearer token in `Authorization` header + `Harvest-Account-ID` header.

**Credentials:** Stored securely in `chrome.storage.local` (same browser profile only).

See [Harvest API Documentation →](https://help.getharvest.com/api-v2/)

---

## Technology Stack
- **TypeScript:** Full type safety across extension
- **React 19:** Popup and options UI components
- **Vite 8:** Module bundler with ES modules
- **Tailwind CSS 4:** Utility-first styling with ESM plugin
- **Manifest v3:** Modern, secure Chrome extension platform
- **crxjs:** Seamless Vite + MV3 integration

---

## Next Steps

1. **Notion Content Script:** Detect Notion tickets, extract metadata (title, description, tags), and inject UI
2. **Smart Defaults:** Map Notion tags to Harvest project/task defaults
3. **Timer:** Add start/stop timer that syncs with Harvest on save
4. **Error Recovery:** Better error messages for failed API calls
5. **Tests:** Unit tests for message handlers, integration tests for popup

---

## Useful Links
- [Chrome Extensions Docs](https://developer.chrome.com/docs/extensions)
- [crxjs Docs](https://crxjs.dev/)
- [Harvest API Documentation](https://help.getharvest.com/api-v2/)
- [Notion API](https://developers.notion.com/)
- [Tailwind CSS](https://tailwindcss.com/)

---

For issues, suggestions, or contributions, open an Issue or Pull Request.
