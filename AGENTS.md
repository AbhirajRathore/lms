# LMS — agent guide

Instructions for AI coding agents and automated review on this repo.

## Layout

- `apps/api` — NestJS 12, **ESM** (`"type": "module"`): relative imports end in `.js`.
  Nest resolves constructor injection from decorator metadata, so injected classes must be value
  imports (not `import type`).
- `apps/api/prisma/schema.prisma` — the data model. The client is generated into
  `apps/api/src/generated/prisma` (git-ignored); every API script runs `prisma generate` first.
  Change the schema with `npm run db:migrate -w @lms/api -- --name <change>` and commit the migration.
- `apps/web` — React + Vite. All API calls go through `src/api/client.ts`.
- `packages/shared` — request/response types and role constants used by both sides. Build it
  (`npm run build -w @lms/shared`) before typechecking other workspaces.
- `infra` — AWS CDK (TypeScript). Run with `tsx`; keep `infra/test` assertions in step with the stack.

## Rules

- Every API route is authenticated by the global `AuthGuard`; mark public routes with `@Public()`
  and restrict by role with `@Roles(...)`. Never let the dev token verifier run in production.
- Read configuration only through `loadEnv()` (`apps/api/src/config/env.ts`), injected as `ENV`.
- Secrets never go in plain env vars in CDK; use `ecs.Secret` from Secrets Manager.
- Tests: Vitest in all workspaces. API e2e tests mock `PrismaService`; add a unit or e2e test with
  each new endpoint.
- Before a PR run: `npm run format:check && npm run lint && npm run typecheck && npm test && npm run build`.
