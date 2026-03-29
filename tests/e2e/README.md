# E2E Tests

Playwright tests covering critical user flows. Run against a live dev server.

## Setup

Set these in `.env.local` (already used by the app) or export them in your shell before running tests:

```
TEST_ADMIN_EMAIL=admin@tayloegray.com
TEST_ADMIN_PASSWORD=...
TEST_CLIENT_EMAIL=client@example.com
TEST_CLIENT_PASSWORD=...
```

## Running

```bash
npm test           # headless
npm run test:ui    # interactive Playwright UI
```

The dev server starts automatically if not already running (`reuseExistingServer: true`).

## Test files

| File | Covers |
|---|---|
| `auth.spec.ts` | Login page, redirects, invalid credentials, invite tokens |
| `admin.spec.ts` | Admin dashboard, clients, milestones — requires TEST_ADMIN_* credentials |
| `portal.spec.ts` | Client portal dashboard, branding, role redirects — requires TEST_CLIENT_* credentials |
