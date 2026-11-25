# saas-uat-frontend

Web app for VAICS UAT. Testers work through one case at a time, paste screenshots, and the app turns fails into defects, tracks fixes and retests, and builds the client audit report.

Stack: React 19, Vite, TypeScript, Tailwind. Deployed on Vercel.

## Screens

- Projects: one per app.
- Project: runs and the case template. Import the Excel tracker, add cases, start a run.
- Run dashboard: progress by module, pass rate, counts, open defects, who tested what. Updates live.
- Focus view (`/runs/:id/test`): one case at a time. Open in app, Pass / Fail / Blocked, a one-line note, screenshots by Ctrl+V or drag and drop. Moves to the next case that still needs a result.
  Shortcuts: `P` pass, `F` fail, `B` blocked, `N` or `J` next, `K` previous, `/` note, `Ctrl+V` paste a screenshot.
- Defects board: Open, Retest failed, Fixed, Retest passed, Closed. Assign, mark fixed with a reference, close or reopen.
- Case history: every result, fix and retest.
- Sign-off and client links: checks, signers, lock, expiring read-only links, audit log.
- Audit report (`/runs/:id/report`) and the public client view (`/audit/:token`) with PDF download.
- People: invite links and roles.

## Run locally

```bash
cp .env.example .env     # VITE_API_URL=http://localhost:4000
npm install
npm run dev
```

Sample data with no backend:

```bash
npm run dev:mock         # uses .env.mock (VITE_MOCK=true)
```

The public audit view works in mock mode at `/audit/demo`.

## Checks

```bash
npm run lint
npm run build
```

## Branding

Brand colours, name and logo live in `src/brand.ts`. Tailwind reads its colours from there, so aligning with the hub Portal later is a one-file change.

## API types

`api/openapi.json` is a copy of the backend spec. `npm run gen:api` regenerates `src/api/schema.d.ts`, and `src/api/types.ts` takes its types from there. `src/api/client.ts` has the HTTP client and `src/api/mock.ts` has the sample-data client. Both follow the same `Api` interface.

## Vercel

`vercel.json` sets the Vite build and the SPA rewrite. Set `VITE_API_URL` to the Railway backend URL. Add the Vercel URL to the backend `CORS_ORIGINS` and set the backend `APP_URL` to it, so invite and share links point to the right place.
