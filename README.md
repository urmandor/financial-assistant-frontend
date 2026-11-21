# Financial Assistant (Frontend)

An AI-powered personal finance management and cash-flow projection web app built with React 18, Vite, Tailwind CSS, TanStack Query, and Recharts.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm.cmd install
```

### 2. Run with Production Backend (Default)
By default, the app points to your live Cloudflare Worker backend:
```bash
npm.cmd run dev
```

### 3. Run with Local Backend
If you are developing your backend locally (e.g. `wrangler dev` on port 8787, or Python/FastAPI on port 8000):

1. Create a `.env.local` file (or copy from `.env.local.example`):
   ```bash
   cp .env.local.example .env.local
   ```
2. Verify the port in `.env.local`:
   ```env
   VITE_API_BASE_URL=http://localhost:8787
   ```
3. Run the local dev script:
   ```bash
   npm.cmd run dev:local
   ```

### 4. Build for Production
```bash
npm.cmd run build
```

---

## 📁 Project Structure

```
financial-assistant-frontend/
├── public/                     # Static assets, PWA icons, manifest, service worker
│   ├── favicon.ico
│   ├── favicon.svg
│   ├── apple-touch-icon.png
│   ├── masked-icon.svg
│   ├── pwa-192x192.png
│   ├── pwa-512x512.png
│   ├── pwa-maskable-512x512.png
│   ├── manifest.webmanifest
│   └── registerSW.js
├── src/
│   ├── api/                    # API client and service endpoints
│   │   ├── client.js           # Base fetch wrapper with auth header injection
│   │   ├── auth.js             # Sign in and session verification
│   │   ├── transactions.js     # Transactions CRUD & text parser
│   │   ├── budgets.js          # Monthly budget limits
│   │   ├── buckets.js          # Reserve funds / buckets
│   │   ├── goals.js            # Savings targets
│   │   ├── rules.js            # Auto-categorization rules
│   │   ├── categories.js       # Categories & impact analysis
│   │   ├── people.js           # Shared expenses & split tracking
│   │   ├── accounts.js         # Payment accounts
│   │   ├── alerts.js           # Budget warnings and notifications
│   │   ├── digests.js          # AI weekly recaps
│   │   ├── plan.js             # Cash-flow forecast & recurring items
│   │   └── chat.js             # AI assistant and receipt OCR scan
│   ├── components/
│   │   ├── common/             # Reusable UI controls (ErrorMessage, Skeleton, TypeSelector, etc.)
│   │   ├── home/               # Dashboard cards (PieChart, BudgetsCard, AlertsCard, RecentTx)
│   │   ├── layout/             # Navigation & chrome (AppShell, Header, DesktopRail, MobileNav, Modal)
│   │   └── modals/             # QuickAddModal, EditTransactionModal
│   ├── hooks/
│   │   ├── useAuth.js          # Token storage and reactive session store
│   │   ├── useRouter.js        # Hash-based navigation and route matching
│   │   ├── useToast.jsx        # Notification toast provider
│   │   └── useQueries.js       # TanStack Query & mutation hooks with cache invalidation
│   ├── pages/                  # Page views
│   │   ├── HomePage.jsx        # /home dashboard
│   │   ├── ActivityPage.jsx    # /activity transactions ledger
│   │   ├── AlertsPage.jsx      # /alerts notification feed
│   │   ├── DigestPage.jsx      # /digest AI weekly recap
│   │   ├── PlanPage.jsx        # /plan planning overview
│   │   ├── BudgetsPage.jsx     # /plan/budgets
│   │   ├── IncomeCostsPage.jsx # /plan/items
│   │   ├── GoalsPage.jsx       # /plan/goals
│   │   ├── FundsPage.jsx       # /plan/funds
│   │   ├── ProjectionPage.jsx  # /plan/projection cash flow forecast
│   │   ├── ChatPage.jsx        # /chat AI assistant & receipt scanning
│   │   ├── SettingsPage.jsx    # /settings
│   │   ├── CategoriesPage.jsx  # /settings/categories
│   │   ├── RulesPage.jsx       # /settings/rules
│   │   ├── AccountsPage.jsx    # /settings/accounts
│   │   ├── PeoplePage.jsx      # /settings/people
│   │   ├── DataPage.jsx        # /settings/data
│   │   └── SignInPage.jsx      # Password lock screen / auth gate
│   ├── utils/
│   │   ├── categories.js       # Category palettes, hashing, auto-infer logic
│   │   ├── dates.js            # Date formatting (Asia/Karachi timezone)
│   │   └── formatters.js       # Currency (PKR), numbers, toast formats
│   ├── App.jsx                 # Auth gate and toast wrapper
│   ├── main.jsx                # React root and QueryClient setup
│   └── index.css               # Tailwind directives & design system components
├── index.html                  # HTML entry point
├── package.json
├── postcss.config.js
├── tailwind.config.js
└── vite.config.js
```

---

## ⚙️ Configuration & Features

- **Backend API**: Connects to the Cloudflare Worker backend at `https://financial-assistant-backend.menuvis.workers.dev`.
- **Locale & Currency**: Formatted in Pakistani Rupee (`₨` / `PKR`) with `Asia/Karachi` timezone defaults.
- **Progressive Web App**: PWA ready with offline caching and shortcut support (`?quick=1` launches the Add Expense modal directly).
