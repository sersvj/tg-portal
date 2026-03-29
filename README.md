# TG Portal

Internal client onboarding portal for Tayloe/Gray. Admins manage clients, assign milestones, and review submissions. Clients complete questionnaires and upload files through a guided portal.

**Internal use only — not a public-facing product.**

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, React 19) |
| UI | Mantine v8 |
| Auth | NextAuth v5 (JWT, Credentials provider) |
| Database | PostgreSQL via Prisma ORM (hosted on Supabase) |
| File Storage | Supabase Storage (logos) + Dropbox (milestone uploads) |
| Email | Resend |
| Drag & Drop | dnd-kit |
| Testing | Playwright (E2E) |

---

## Architecture

Two route groups, one auth group:

```
(admin)/admin/     — Admin panel  (role: ADMIN, @tayloegray.com only)
(portal)/portal/   — Client portal (role: CLIENT)
(auth)/            — Login + invite acceptance
```

Route protection is enforced in `auth.config.ts` (edge middleware) and repeated server-side in every server action.

### Data model highlights

- **Client** → has Contacts, Milestones, and ClientUsers (portal logins)
- **MilestoneDefinition** → global template; cloned into **ClientMilestone** per client
- **QuestionnaireField** → per-milestone form fields (TEXT, RADIO, LIKERT, etc.)
- **QuestionnaireResponse** → submitted answers linked to a milestone

---

## Local Development

```bash
npm install
npm run dev       # http://localhost:3000
```

Copy `.env.local` from Dashlane — contains Supabase, Dropbox, Resend, and NextAuth credentials.

Seed the initial admin user:
```bash
npm run db:seed
```

---

## Common Commands

```bash
npm run dev          # dev server
npm run build        # production build
npm run lint         # ESLint
npm run typecheck    # TypeScript (no emit)
npm test             # Playwright E2E (needs dev server or starts one)
npm run test:ui      # Playwright interactive UI
npm run db:seed      # seed initial admin user
```

Prisma:
```bash
npx prisma migrate dev    # apply migrations + generate client
npx prisma studio         # browse database in browser
```

---

## Testing

Playwright E2E tests live in `tests/e2e/`. They cover login flows, route protection, and critical page rendering. Set `TEST_ADMIN_EMAIL`, `TEST_ADMIN_PASSWORD`, `TEST_CLIENT_EMAIL`, `TEST_CLIENT_PASSWORD` in your environment before running admin/portal tests.

See `tests/e2e/README.md` for details.

---

## Design System

All UI decisions are documented in `DESIGN.md`. Read it before building any new component or page.

Key rules:
- Mantine v8 for all UI — no raw HTML form elements or layout primitives
- `SectionCard` for all content panels (not raw `Box` with inline borders)
- Orange is brand-only (TG identity). Blue/green/red/gray for all functional states
- Named Mantine sub-component exports in server components (`TableThead` not `Table.Thead`)
- `LinkButton`/`LinkAnchor`/etc. wrappers for navigation in server components

---

## External Services

| Service | Purpose | Credentials |
|---|---|---|
| Supabase | PostgreSQL + file storage | `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY` |
| Dropbox | Milestone file uploads | `DROPBOX_APP_KEY`, `DROPBOX_APP_SECRET`, `DROPBOX_REFRESH_TOKEN` |
| Resend | Invite + completion emails | `RESEND_API_KEY`, `RESEND_FROM` |
