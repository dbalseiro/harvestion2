# AGENTS.md

## Product Summary

This Chrome extension enables users to quickly add Harvest time entries directly from Notion tickets or database elements. It streamlines the workflow of tracking time against tasks stored in Notion by automating the creation of corresponding entries in Harvest, saving user effort and increasing accuracy.

**Core Workflow:**
- User visits a Notion ticket or database entry in their browser.
- The extension parses relevant data from the Notion page (e.g., ticket title, tags, description).
- Through a popup UI, the user can select a project and task, enter hours and notes, and trigger the creation of a Harvest time entry with all details pre-filled from Notion.
- The extension communicates with Harvest API to fetch real projects and tasks, and submits time entries securely.
- Credentials are stored securely in the extension's local storage via the background service worker.

---

## Agents and Roles

### 1. Background Service Worker

**Script:** `src/background/index.ts` (TypeScript, transpiled to service-worker-loader.js)
**Role:** Serves as the extension's central coordinator. Handles messaging between scripts, manages extension state, and performs privileged background logic such as interacting with the Harvest API.

**Key Responsibilities:**
- **Harvest API Integration:** Fetches active projects, project task assignments, and creates time entries via Harvest API v2.
- **Credential Storage:** Reads and writes Harvest Account ID and Personal Access Token to `chrome.storage.local`.
- **Message Routing:** Listens for messages from popup and options pages:
  - `harvest:getSettingsStatus` — checks if credentials are configured
  - `harvest:getProjects` — fetches active projects from Harvest
  - `harvest:getProjectTasks` — fetches task assignments for a given project
  - `harvest:createTimeEntry` — creates a new time entry in Harvest
- **Error Handling:** Returns structured success/error responses for all API calls.

**Communication:**
- Receives chrome.runtime.sendMessage calls from popup and options pages.
- Returns discriminated union responses (`{ ok: true; data: T }` or `{ ok: false; error: string }`).
- Handles pagination and data transformation from Harvest API.

**Implementation Details:**
- Uses `fetch` with Bearer token authentication and Account ID headers.
- Paginates through project and task lists automatically.
- De-duplicates tasks by ID when fetching task assignments.

### 2. Popup UI Agent

**Script:** `src/popup/App.tsx` (React component)
**HTML Entry:** `src/popup/index.html`
**Role:** Provides the browser toolbar popup UI for creating time entries. Fetches live project/task data from the background worker and displays a polished form.

**Key Responsibilities:**
- **Settings Integration:** Detects if Harvest is configured; displays an alert if not. "Settings" button opens the options page.
- **Live Data Loading:** On mount, fetches projects and displays them in a dropdown. When project changes, fetches and displays tasks.
- **Form Management:** Manages hours (with real-time h:mm formatting), notes, project, and task selection.
- **Time Entry Creation:** Submits time entries with today's date, selected project/task, hours, and notes.
- **User Feedback:** Displays status messages (loading, success, error) with color-coded UI.
- **Notion Context:** Displays sample Notion ticket details (title, tags) — ready for dynamic extraction from content script.

**State:**
- `configured`: whether Harvest settings exist
- `projects`: array of active Harvest projects
- `tasks`: array of task assignments for the selected project
- `selectedProjectId`, `selectedTaskId`: currently selected project and task IDs
- `hours`, `notes`: form inputs
- `message`, `messageVariant`: user-facing feedback
- Loading states for async operations

**Communication:**
- Sends `chrome.runtime.sendMessage` to background for all Harvest operations.
- Calls `chrome.runtime.openOptionsPage()` to open settings.

### 3. Options/Settings UI Agent

**Script:** `src/options/App.tsx` (React component)
**HTML Entry:** `src/options/index.html`
**Role:** Provides the extension settings page for credential management and connection testing.

**Key Responsibilities:**
- **Credential Input:** Collects Harvest Account ID and Personal Access Token.
- **Credential Storage:** Saves credentials to extension storage on form submit.
- **Connection Testing:** Sends a test request to Harvest API to verify credentials before saving.
- **Load Existing Credentials:** On mount, loads previously saved credentials from storage.
- **User Feedback:** Displays save/test status and error or success messages.

**State:**
- `accountId`, `accessToken`: form inputs
- `saveState`, `testState`: loading/success/error states for save and test actions
- `feedback`: user-facing message

**Communication:**
- Reads from and writes to `chrome.storage.local` directly (runs in options page context).
- Sends test request via `chrome.runtime.sendMessage` to the background service worker.

### 4. Content Script Agent

**Status:** Not yet implemented.
**Future Role:** Runs within Notion pages to detect and extract ticket metadata (title, description, tags), inject UI controls, and pass data to the popup.

---

## Data Models & Message Contracts

**File:** `src/lib/harvest.ts`

### Storage
```typescript
type HarvestSettings = {
  accountId: string
  accessToken: string
}
```
Stored in `chrome.storage.local['harvestSettings']`.

### API Data
```typescript
type HarvestProject = {
  id: number
  name: string
  code: string | null
  isActive: boolean
}

type HarvestTask = {
  id: number
  name: string
  billableByDefault: boolean
  isActive: boolean
}
```

### Message Protocol
```typescript
type MessageRequest =
  | { type: 'harvest:getSettingsStatus' }
  | { type: 'harvest:getProjects' }
  | { type: 'harvest:getProjectTasks'; projectId: number }
  | {
      type: 'harvest:createTimeEntry'
      payload: {
        projectId: number
        taskId: number
        spentDate: string
        notes: string
        hours: number
      }
    }

type MessageResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }
```

---

## Inter-Agent Communication

Agents communicate using the Chrome Extensions Messaging API:

- **chrome.runtime.sendMessage():** Popup and options pages send requests to the background service worker.
- **chrome.runtime.onMessage.addListener():** Background service worker listens for incoming messages and responds asynchronously.
- **Return value:** Always return `true` from the listener to indicate async response handling.

---

## 5. Test Infrastructure Agent

**Framework:** Vitest 2.1 with Testing Library
**Environment:** jsdom (simulates Chrome browser API)
**Role:** Validates data models, message protocols, API integration, and UI logic without rendering complexity.

**Key Test Modules:**
- `src/lib/harvest.test.ts` (7 tests)
  - Validates HarvestSettings, HarvestProject, HarvestTask type safety
  - Tests MessageResponse discriminated unions (ok/error discrimination)

- `src/background/index.test.ts` (9 tests)
  - Message routing and handler logic
  - Harvest API response format validation
  - Settings status, project/task loading, time entry creation
  - Error response handling

- `src/popup/App.test.tsx` (12 tests)
  - Hours formatting logic (numeric → "Xh YYm" display)
  - Form validation (positive hours, project/task selection)
  - Time entry payload creation with correct fields
  - Harvest API response handling
  - Configuration state management

- `src/options/App.test.tsx` (6 tests)
  - Credential validation (both fields required)
  - Storage format handling
  - Connection test response processing

**Configuration:**
- `vitest.config.ts` — Test runner config with jsdom, global test API, coverage settings
- `tsconfig.app.json` — Excludes test files from production build compilation
- npm scripts: `npm test` (watch), `npm test -- --run` (single run), `npm test:ui` (dashboard), `npm test:coverage` (reports)

**Current Coverage:** 34/34 tests passing (100%)

**When Adding Features:**
1. Add unit tests for new data models in `src/lib/*.test.ts`
2. Add message handler tests in `src/background/index.test.ts` for new message types
3. Add validation/logic tests in component test files (`.test.tsx`)
4. Run `npm test -- --run` to verify before build
5. Run `npm test:coverage` to check coverage metrics

---

## Extensibility

Future enhancements with test coverage requirements:
1. **Content Script:** Extract Notion ticket metadata and pass to popup via message.
   - Test: Message format validation, metadata extraction logic
2. **Field Mapping:** Settings UI to map Notion tags/properties to default Harvest projects/tasks.
   - Test: Mapping storage and retrieval, conflict resolution
3. **OAuth Flow:** Replace personal token with OAuth if Harvest adds support.
   - Test: OAuth flow state machine, token refresh logic
4. **Timer Integration:** Start/stop timer on popup, sync with Harvest via background worker.
   - Test: Timer accumulation, pause/resume logic, sync payload creation

---

## Development Workflow & Commit Guidelines

### Semantic Commit Format

Use semantic commit messages for clarity and automated changelog generation. Format: `<type>(<scope>): <subject>`

**Types:**
- `feat` — New feature (e.g., `feat(popup): add hours formatting`)
- `fix` — Bug fix (e.g., `fix(storage): handle missing credentials`)
- `test` — Test additions/changes (e.g., `test(background): add message handler tests`)
- `docs` — Documentation updates (e.g., `docs: update API integration guide`)
- `refactor` — Code restructuring without behavior change (e.g., `refactor(background): extract API helpers`)
- `chore` — Dependencies, config, build (e.g., `chore(deps): upgrade React to 19.2.4`)
- `perf` — Performance improvements (e.g., `perf(popup): optimize project list rendering`)

**Scopes (optional but recommended):**
- `popup` — Popup UI component and logic
- `options` — Options/settings page
- `background` — Background service worker
- `storage` — Chrome storage integration
- `api` — Harvest API interaction
- `tests` — Test infrastructure and coverage
- `types` — Data models and message protocols
- `ui` — UI/styling across components
- `deps` — Dependencies and configuration

**Examples:**

```
feat(tests): add unit tests for background worker, harvest models, options, and popup components

- Added tests for message handling in the background worker, including settings status checks.
- Created tests for Harvest data models (settings, projects, tasks) to verify structure.
- Implemented tests for options page credential validation and connection responses.
- Developed tests for popup component logic, including time entry creation and project/task handling.
- Configured Vitest for testing environment with coverage reporting.
- Excluded test files from app compilation in tsconfig.

fix(storage): validate chrome.storage availability in options page

- Added defensive check to detect chrome.storage API availability.
- Wrapped initial credential load in try/catch to prevent runtime errors.
- Gracefully handle cases where extension API is not available.

refactor(background): consolidate Harvest API request logic

- Extracted common request handling into harvestRequest<T>() generic function.
- Centralized Bearer token and Account ID header construction.
- Improved error handling for API responses.
```

**Best Practices:**
- Keep subject line under 50 characters
- Use imperative mood ("add", "fix", "update", not "added", "fixed")
- Use concise language; avoid verbose descriptions in subject line
- Include detailed explanation in body for complex changes
- Reference issue numbers if applicable (e.g., "Fixes #123")
- One logical change per commit

### Testing Requirements

All features must include corresponding tests:
- Data model changes → tests in `src/lib/*.test.ts`
- Background worker changes → tests in `src/background/index.test.ts`
- Component logic changes → tests in `src/popup/App.test.tsx` or `src/options/App.test.tsx`
- Run `npm test -- --run` to verify before commit
- Maintain 100% passing test rate

---

## Version History

- **v0.4:** Added comprehensive test coverage (34 tests, 100% passing). Vitest infrastructure, logic-focused testing for data models, message protocols, and UI validation. Excluded test files from production build.
- **v0.3:** Implemented Harvest API integration in background worker, React popup with live project/task loading, options page for credential management.
- **v0.2:** Added Notion/Harvest workflow context and clarified agent responsibilities.
- **v0.1:** Initial agent documentation scaffold.

---

> For questions, suggestions, or modifications, please contact the project maintainer or open an issue in the repository.
