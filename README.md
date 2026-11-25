# LMS — Learning Management System

TypeScript monorepo (npm workspaces), built to run on AWS.

| Path              | What                                                                        |
| ----------------- | --------------------------------------------------------------------------- |
| `apps/api`        | NestJS 12 API (ESM), Prisma 7 + Postgres, Cognito auth                      |
| `apps/web`        | React 19 + Vite 8 single-page app (React Router, TanStack Query)            |
| `packages/shared` | Types and constants shared by API and web (`@lms/shared`)                   |
| `infra`           | AWS CDK app: VPC, RDS Postgres, ECS Fargate + ALB, Cognito, S3 + CloudFront |

## Run locally

Needs Node 22.12+ and Docker.

```bash
npm install
cp .env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
npm run db:up          # Postgres on localhost:5433
npm run db:migrate     # apply Prisma migrations
npm run dev:api        # http://localhost:3000/api
npm run dev:web        # http://localhost:5173 (proxies /api to the API)
```

### Auth in local dev

With `COGNITO_USER_POOL_ID` / `COGNITO_CLIENT_ID` empty, the API accepts a dev bearer token
`<email>` or `<email>:<role>,<role>` (roles: `admin`, `instructor`, `learner`). The web app sends
`VITE_DEV_TOKEN` from `apps/web/.env`. The dev token is refused when `NODE_ENV=production`, and the
API will not start in production without Cognito settings.

Every route needs a signed-in user unless it is marked `@Public()`. Restrict by role with
`@Roles('admin')`.

## Checks

```bash
npm run lint
npm run format:check
npm run typecheck
npm test
npm run build
npm run synth
```

CI (`.github/workflows/ci.yml`) runs the same checks and builds the API Docker image.

## Deploy to AWS

```bash
cd infra
npx cdk bootstrap                  # once per account/region
npx cdk deploy -c stage=dev        # stack name: Lms-dev
```

Region defaults to `me-central-1`; override with `CDK_DEFAULT_REGION`. On AWS the API reads the
RDS secret as `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` and connects with TLS.

Not wired up yet:

- Running `prisma migrate deploy` on deploy (e.g. a one-off ECS task using the API image).
- Uploading the web build to the `WebBucketName` bucket and invalidating CloudFront.
- Web sign-in with Cognito (the web app only sends the dev token today).
- Custom domain + ACM certificate, and HTTPS between CloudFront and the ALB.
