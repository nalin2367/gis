# Guru Insurance

React/Vite frontend for insurance customer, policy, claim, and invoice management.

The project is prepared for this deployment split:

- Frontend: Vercel static Vite deployment.
- Backend/database: Google Apps Script web app backed by Google Sheets.
- Local development fallback: Express + SQLite with `npm run dev`.

## Local Development

```bash
npm install
npm run dev
```

The local server runs on `http://localhost:3000` and serves both the Vite app and `/api` from `backend/server.ts`.

To test the Vercel-style frontend against Google Apps Script locally, create `.env.local`:

```bash
VITE_API_BASE_URL="https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec"
```

Then run:

```bash
npm run dev:frontend
```

## Deploy Backend And Database To Google Apps Script

1. Create a Google Sheet named `Guru Insurance Database`.
2. Open `Extensions > Apps Script`.
3. Enable the manifest editor in Apps Script project settings.
4. Copy [apps-script/Code.gs](apps-script/Code.gs) into `Code.gs`.
5. Copy [apps-script/appsscript.json](apps-script/appsscript.json) into `appsscript.json`.
6. Run the `setup` function once and authorize it. This creates the `Customers`, `Policies`, `Claims`, and `Invoices` tabs.
7. Deploy with `Deploy > New deployment > Web app`.
8. Use these settings:
   - Execute as: `Me`
   - Who has access: `Anyone` / `Anyone, even anonymous`
9. Copy the web app URL ending in `/exec`.

When you change Apps Script backend code later, create a new version and update the existing web app deployment so the `/exec` URL stays the same.

The deployed Apps Script exposes:

- `GET /exec/health`
- `GET /exec/customers`
- `GET /exec/policies`
- `GET /exec/claims`
- `GET /exec/invoices`
- `POST /exec/customers/sync`
- `POST /exec/policies/sync`
- `POST /exec/claims/sync`
- `POST /exec/invoices/sync`

For first-time data, deploy both sides, open the app, then use `Import Data` with `database/seed.csv` or your own CSV.

## Deploy Frontend To Vercel

Import the repository into Vercel and use these project settings:

- Framework preset: `Vite`
- Build command: `npm run build:frontend`
- Output directory: `dist/frontend`
- Environment variable:

```bash
VITE_API_BASE_URL="https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec"
```

The included [vercel.json](vercel.json) already sets the frontend build command, static output directory, and SPA rewrite.

## Verification

```bash
npm run clean
npm run lint
npm run build:frontend
npm run build
```

`npm run build` still builds the local Express server. Vercel uses `npm run build:frontend` only.
