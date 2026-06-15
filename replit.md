# HelpIT

A full-stack IT Helpdesk web application for managing support tickets, asset inventory, and user roles.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at `/api`)
- `pnpm --filter @workspace/helpit run dev` — run the frontend (port 23186, proxied at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Wouter, TanStack Query, shadcn/ui, Tailwind CSS v4
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Auth: JWT (jsonwebtoken) + bcryptjs, stored in localStorage key `helpit_token`
- Validation: Zod, drizzle-zod
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (ESM bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — single source of truth for API contract
- `lib/api-client-react/src/generated/` — generated React Query hooks (do not edit)
- `lib/api-client-react/src/custom-fetch.ts` — JWT token injection into all API calls
- `lib/db/src/schema/` — Drizzle ORM schema (users, tickets, assets, comments, ratings)
- `artifacts/api-server/src/routes/` — Express route handlers (auth, tickets, assets, users)
- `artifacts/api-server/src/middlewares/auth.ts` — JWT verification middleware
- `artifacts/api-server/src/lib/notifications.ts` — Telegram + SendGrid email notifications
- `artifacts/helpit/src/pages/` — all frontend pages
- `artifacts/helpit/src/components/layout.tsx` — sidebar + header shell

## Architecture decisions

- Contract-first: OpenAPI spec → Orval codegen → typed hooks; never write fetch calls by hand.
- JWT stored in localStorage (not cookies) for simplicity; `custom-fetch.ts` injects the token.
- Auto-triage: critical keywords in ticket description → priority set to `critical` automatically.
- Role hierarchy: `user` (own tickets) < `technician` (all tickets + assets) < `admin` (+ user management).
- Notifications are fire-and-forget (no await); missing env vars silently no-op.

## Product

- **Ticket Management**: create, view, filter, assign, resolve tickets with real-time priority detection
- **Asset Inventory**: register and track IT equipment with QR/barcode scanner support
- **User Management**: admin can promote/demote roles (user → technician → admin)
- **Dashboard**: technicians see live stats (open/critical/resolved); users see their own tickets
- **Satisfaction Rating**: 5-star rating form appears on resolved tickets for the creator
- **Notifications**: Telegram alerts for critical tickets; email on create/resolve (optional env vars)

## Demo accounts

| Email | Password | Role |
|-------|----------|------|
| admin@helpit.com | admin123 | Admin |
| tech@helpit.com | tech123 | Technician |
| user@helpit.com | user123 | User |

## Gotchas

- Always run `pnpm --filter @workspace/api-spec run codegen` after changing `openapi.yaml`.
- Do NOT use `pnpm dev` at workspace root — use per-artifact workflow or `--filter`.
- `zod` must be listed in `@workspace/api-server` dependencies (not just the root) for esbuild to bundle it.
- JWT_SECRET defaults to `helpit-secret-key-change-in-prod` — set a real secret in production.
- Notifications (Telegram/SendGrid) silently no-op if env vars are missing — this is intentional.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
