# AGENTS.md

## Product Summary

This Chrome extension enables users to quickly add Harvest time entries directly from Notion tickets or database elements. It streamlines the workflow of tracking time against tasks stored in Notion by automating the creation of corresponding entries in Harvest, saving user effort and increasing accuracy.

**Core Workflow:**
- User visits a Notion ticket or database entry in their browser.
- The extension parses relevant data from the Notion page (e.g., ticket title, tags, description).
- Through a UI (e.g., popup or injected button), the user can trigger the creation of a Harvest time entry pre-filled with Notion data.
- The extension communicates with both Notion (for extracting task data) and Harvest (for submitting time entries), handling authentication and data mapping.

---

## Agents and Roles

### 1. Background Agent

**Script:** `background.js`  
**Role:** Serves as the extension's central coordinator. Handles messaging between scripts, manages extension state, and performs privileged background logic such as interacting with the Harvest API.

**Key Responsibilities:**
- Receives and processes requests to create Harvest time entries.
- Manages Harvest API tokens and authentication flow (if required).
- Performs privileged network requests to the Harvest API (due to CORS/content security policies).
- Mediates messaging between popup/options pages, content scripts, and manages extension storage (Notion/Harvest credentials, preferences, etc).
- Handles notifications or error reporting for critical operations.

**Communication:**
- Listens for messages from content and popup agents (e.g., "create harvest entry").
- Initiates API calls and communicates success/failure results back to requesters.
- May initiate communication to content scripts for page context or updates.

### 2. Content Script Agent

**Script:** `content.js`  
**Role:** Runs within Notion pages. Extracts data from Notion tickets/database elements, injects UI (such as a button or control), and facilitates user interaction directly on Notion.

**Key Responsibilities:**
- Detects eligible Notion tickets or database elements on the current page.
- Parses and extracts relevant task data (title, description, tags, etc.).
- Injects UI components (e.g., "Add to Harvest" button) into the Notion page.
- Responds to user interactions to prepare and send data to the background agent.
- Handles edge cases where page structure may vary.

**Communication:**
- Sends extracted task data and interaction events to the background agent (e.g., "user requested Harvest entry for this ticket").
- Receives requests or commands from the background agent (e.g., to update UI or report operation status).

### 3. Popup/Options UI Agent

**Script:** `popup.js` / `options.js`  
**Role:** Provides user interface via the browser toolbar popup, allowing users to trigger actions, view status/feedback, and manage extension settings such as API integrations.

**Key Responsibilities:**
- Displays UI for initiating Harvest entry creation from page-context data (when available).
- Collects/validates user credentials or API tokens for Notion and Harvest.
- Offers settings page for mapping Notion fields to Harvest projects/tasks, or customizing extension behavior.
- Displays feedback (e.g., success/failure notifications) on entry creation.

**Communication:**
- Communicates with background agent using the messaging API to query page context, trigger actions, or access state.
- May receive messages from background agent to display operation status or error feedback.

### 4. External Service Agents (Future/Optional)

**Role:** If needed, abstraction modules or agents may be introduced to handle integration with Notion and Harvest APIs in a maintainable way. These may operate as helper libraries or dedicated background scripts responsible for:
- Providing a robust, reusable interface for Notion and Harvest API calls.
- Handling authentication flows (OAuth2 etc.) and token refresh logic.
- Mapping or synchronizing data between systems.

---

## Inter-Agent Communication

Agents communicate using the Chrome Extensions Messaging API, enabling asynchronous and robust coordination:

- **chrome.runtime.sendMessage / onMessage:** For simple, stateless communication between agents.
- **chrome.tabs.sendMessage:** Enables background agent to interact directly with content scripts in open Notion tabs.
- **Long-lived connections (chrome.runtime.connect):** Supports streaming or persistent message channels for continual operations (e.g., OAuth flows).

---

## Extensibility

New agents/modules (e.g., service connectors, worker scripts) should be documented here as they are added. Each agent should have a clear responsibility, consistent communication interface, and well-isolated logic.

---

## Version History

- **v0.2:** Added Notion/Harvest workflow context and clarified agent responsibilities.
- **v0.1:** Initial agent documentation scaffold.

---

> For questions, suggestions, or modifications, please contact the project maintainer or open an issue in the repository.
