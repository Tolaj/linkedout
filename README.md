# LinkedOut — Job Application Tracker (Client)

A React-based PWA for tracking job applications, syncing Gmail emails, managing resumes, and auto-filling application forms.

## Tech Stack

- **React 18** + **Vite 5** — SPA with HMR
- **Tailwind CSS 3** — utility-first styling
- **Zustand** — lightweight state management with IndexedDB offline sync
- **React Router 7** — client-side routing
- **Axios** — API client
- **date-fns** — date formatting
- **lucide-react** — icon library
- **vite-plugin-pwa** — service worker + installable PWA

## Getting Started

```bash
npm install
npm run dev        # starts Vite dev server on http://localhost:5173
npm run build      # production build to dist/
npm run preview    # preview production build locally
npm run lint       # lint with oxlint
```

Create a `.env` file (or `.env.local`) in the project root:

```
VITE_API_URL=http://localhost:4000/api
```

## Project Structure

```
src/
├── components/       # Shared UI components
│   ├── AppCard.jsx       # Application card (kanban view)
│   ├── FormModal.jsx     # Reusable modal form
│   ├── Layout.jsx        # Sidebar navigation + layout shell
│   ├── Logo.jsx          # App logo
│   └── NoWorkspace.jsx   # Empty state placeholder
├── pages/            # Route-level page components
│   ├── Applications.jsx  # Main tracker — table + kanban views, email dropdown
│   ├── ColdEmails.jsx    # Email management — sync, read, compose
│   ├── Dashboard.jsx     # Overview stats and charts
│   ├── InterviewPrep.jsx # Interview preparation tools
│   ├── QuickApply.jsx    # Answer bank for auto-filling applications
│   ├── Resumes.jsx       # Resume file management (local filesystem API)
│   ├── Settings.jsx      # Gmail OAuth, LLM provider, preferences
│   ├── Login.jsx         # Auth — login
│   └── Register.jsx      # Auth — register
├── stores/           # Zustand stores (IndexedDB + API sync)
│   ├── useAppStore.js          # Applications CRUD
│   ├── useAuthStore.js         # JWT auth state
│   ├── useContactStore.js      # Contacts CRUD
│   ├── useEmailStore.js        # Tracked emails CRUD
│   ├── useNoteStore.js         # Notes CRUD
│   ├── useProcessedEmailStore.js # Processed email IDs (skip/track state)
│   ├── useProfileFieldStore.js # Quick Apply answer bank
│   ├── useResumeStore.js       # Resume metadata
│   └── useSettingsStore.js     # User preferences
├── services/         # External integrations
│   ├── api.js            # Axios instance + auth interceptor
│   ├── emailSync.js      # 3-pass email sync pipeline (rule-based + LLM)
│   ├── fileSystem.js     # File System Access API for local resume storage
│   ├── gmail.js          # Gmail API — OAuth, send, search, body fetch
│   └── llm.js            # LLM batch analysis (Cerebras/Groq)
└── lib/              # Constants and utilities
```

## Key Features

### Application Tracking
Table and kanban views for tracking job applications through stages (Applied → Screening → Interviewing → Offer/Rejected). Supports bulk import and manual entry.

### Gmail Integration
OAuth2 connection to Gmail for:
- **Inbound email sync** — automatically matches emails to tracked applications by sender domain
- **LLM-powered analysis** — batched email classification via Cerebras/Groq to discover new applications and stage changes
- **Email composition** — send cold outreach emails directly from the app
- **Full email reading** — email bodies stored in DB for offline access

### Quick Apply
Pre-store common application answers (personal info, work authorization, education, links, EEO). The Chrome extension can auto-fill job application forms from this answer bank.

### Resume Management
Uses the File System Access API to manage resume files locally without uploading to a server.

## Chrome Extension

Located in `chrome-extension/`. A Manifest V3 extension that:
- Detects job application pages (Lever, Greenhouse, Workday, LinkedIn, Jobvite)
- Extracts job details and creates tracked applications
- Auto-fills application forms from the Quick Apply answer bank

Load as an unpacked extension in Chrome → `chrome://extensions` → Developer mode → Load unpacked → select `chrome-extension/`.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API base URL (default: `http://localhost:4000/api`) |

Gmail Client ID and LLM API keys are configured in-app via the Settings page.
