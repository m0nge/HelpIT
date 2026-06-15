---
name: HelpIT stack quirks
description: Non-obvious build and auth decisions for the HelpIT project
---

## esbuild + zod

esbuild cannot resolve `zod/v4` — always import from `"zod"` in api-server route files. Also, `zod` must be in `@workspace/api-server` `dependencies` (not just the root workspace), or esbuild will fail with "Could not resolve zod".

**Why:** esbuild bundles by tracing imports from the entry point; it resolves packages relative to the package that imports them, so root-level installs are not visible unless hoisted.

**How to apply:** Any new route file in `artifacts/api-server/src/routes/` must use `import { z } from "zod"` (not `zod/v4`).

## JWT auth flow

JWT is stored in `localStorage` under key `helpit_token`. The `custom-fetch.ts` in `lib/api-client-react` reads this key and injects `Authorization: Bearer <token>` on every request. The `AuthProvider` in `artifacts/helpit/src/lib/auth.tsx` manages login/logout state.

**Why:** Web-only app with no SSR; localStorage is simpler than cookies for this use case.

**How to apply:** Never use `setAuthTokenGetter` from the api client — the localStorage injection in custom-fetch handles it directly.

## Seed roles

Users registered via `/api/auth/register` always get `role: "user"`. Promote admin/tech roles via direct SQL: `UPDATE users SET role = 'admin' WHERE email = '...'`.
