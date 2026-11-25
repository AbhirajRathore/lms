# LMS — Learning Management System

An internal learning platform for employees. Authors build courses from text, video and document
lessons and publish them; everyone else browses the catalogue and reads the lessons. See
[`ROADMAP.md`](ROADMAP.md) for what comes next.

TypeScript monorepo (npm workspaces):

| Path              | What                                                                                                                                   |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api`        | NestJS 12 API (ESM), Prisma 7 + Postgres, token-based sign-in                                                                          |
| `apps/web`        | React 19 + Vite 8 single-page app (React Router, TanStack Query)                                                                       |
| `packages/shared` | Types and constants shared by API and web (`@lms/shared`)                                                                              |
| `infra`           | Infrastructure as code (CDK): network, managed Postgres, API containers behind a load balancer, user directory, web hosting with a CDN |

## Run locally

Needs Node 22.12+ and Docker.

```bash
npm install
cp .env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
npm run db:up          # Postgres on localhost:54330
npm run db:migrate     # apply Prisma migrations
npm run db:seed        # demo users and courses (safe to re-run)
npm run dev:api        # http://localhost:3000/api
npm run dev:web        # http://localhost:5173 (proxies /api to the API)
```

### Auth in local dev

With `COGNITO_USER_POOL_ID` / `COGNITO_CLIENT_ID` empty, the API accepts a dev bearer token
`<email>` or `<email>:<role>,<role>` (roles: `admin`, `instructor`, `learner`). In the web app,
pick a seeded user from the "Sign in as" switcher in the header; until you pick one it sends
`VITE_DEV_TOKEN` from `apps/web/.env`. The dev token is refused when `NODE_ENV=production`, and the
API will not start in production without the identity-provider settings.

Every route needs a signed-in user unless it is marked `@Public()`. Restrict by role with
`@Roles('admin')`.

## Checks

`npm test` runs the API integration tests against a real Postgres, so start it first with
`npm run db:up`. They use their own `lms_test` database on localhost:54330, created and migrated
automatically (or set `TEST_DATABASE_URL` to a database whose name ends in `_test`).

```bash
npm run lint
npm run format:check
npm run typecheck
npm test
npm run build
npm run synth
```

CI (`.github/workflows/ci.yml`) runs the same checks and builds the API Docker image.

## Deploy

```bash
cd infra
npx cdk bootstrap                  # once per account/region
npx cdk deploy -c stage=dev        # stack name: Lms-dev
```

Account and region come from `CDK_DEFAULT_ACCOUNT` / `CDK_DEFAULT_REGION` (the default region is set
in `infra/bin/lms.ts`). In the cloud the API reads its database credentials from the secrets store
as `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` and connects with TLS.

Not wired up yet:

- Running `prisma migrate deploy` on deploy (e.g. a one-off task using the API image).
- Uploading the web build to the web bucket (`WebBucketName` output) and clearing the CDN cache.
- Web sign-in with the identity provider (the web app only sends the dev token today).
- A custom domain with TLS certificates, and HTTPS between the CDN and the load balancer.
