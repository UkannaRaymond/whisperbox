# WhisperBox

End-to-end encrypted messaging platform. This repository currently
contains **Phase 1 — Project Foundation** only: the application shell,
tooling, and infrastructure wiring described in the Technical
Requirements Document (TRD). No authentication, encryption, or messaging
features are implemented yet — see [Scope](#scope) below.

## Stack

- **Framework:** Next.js 16 (App Router, Turbopack), React 19, strict TypeScript
- **Styling:** Tailwind CSS v4, shadcn/ui (new-york style), Framer Motion
- **State:** TanStack Query (server state), Zustand (global UI state)
- **Forms:** React Hook Form + Zod
- **Data:** Prisma ORM, PostgreSQL 17, Redis
- **Auth:** Better Auth (wired, not yet configured with providers)
- **Observability:** Pino (structured logs), Sentry
- **Testing:** Vitest + Testing Library (unit/integration), Playwright (e2e), MSW
- **Deployment:** Docker, GitHub Actions, Railway/Vercel-ready

## Getting started

```bash
cp .env.example .env      # fill in real values
pnpm install
npx prisma generate
pnpm run dev
```

The app runs at http://localhost:3000. A health check is available at
`/api/health`.

### With Docker Compose

```bash
docker compose up --build
```

This starts the app alongside PostgreSQL 17 and Redis containers.

## Scripts

| Script                 | Purpose                           |
| ---------------------- | --------------------------------- |
| `pnpm run dev`         | Start the dev server              |
| `pnpm run build`       | Production build                  |
| `pnpm run start`       | Start the production server       |
| `pnpm run lint`        | ESLint                            |
| `pnpm run format`      | Prettier (write)                  |
| `pnpm run typecheck`   | `tsc --noEmit`                    |
| `pnpm test`            | Unit + integration tests (Vitest) |
| `pnpm run test:e2e`    | End-to-end tests (Playwright)     |
| `pnpm run db:generate` | Generate the Prisma client        |
| `pnpm run db:migrate`  | Run a dev migration               |
| `pnpm run db:studio`   | Open Prisma Studio                |

## Folder structure

```
app/                Next.js App Router routes, layouts, error/loading UI
components/ui/       shadcn/ui primitives
components/layout/   App shell components (header, sidebar, etc.)
components/shared/   Cross-feature shared components
features/<name>/     Feature modules (components, hooks, actions, services,
                      schemas, types, constants, utils per feature)
repositories/         Repository interfaces — abstract persistence behind
                      domain types (no implementations yet)
services/             Service interfaces — business operations (no
                      implementations yet)
server/              Server-only infrastructure (db, redis, logger, storage)
providers/            App-wide React providers (theme, query, motion, socket stub)
store/                Zustand stores (global UI state only)
lib/                  Shared utilities (cn, auth config, safe-action, errors, motion)
config/               Environment variable validation
prisma/               Database schema
types/domain/         Shared domain types (User, Conversation, Message, ...),
                      decoupled from Prisma
tests/                Unit, integration, and e2e tests
```

Each `features/<name>/` module is currently an empty scaffold
(`.gitkeep` placeholders) — it will be filled in during the phase that
owns it, per the PRD milestones.

### Architectural dependency rules (per the SDD)

- UI (`app/`, `components/`) never imports Prisma or `@prisma/client`.
- Domain code (`types/domain/`, `repositories/`, `services/`) never
  imports React.
- `repositories/` and `services/` currently contain **interfaces only** —
  concrete implementations (e.g. a Prisma-backed `UserRepository`) are
  added in the phase that needs them.
- No circular dependencies: `types/domain` → `repositories` → `services`.

## Scope

This repository implements the **Foundation** (Stage 01–02) and
**Software Architecture Foundation** (Stage 03) phases only:

- Next.js App Router structure, strict TypeScript, Tailwind v4, shadcn/ui
- Prisma + Better Auth wiring (schema/config only — no auth flows yet)
- Feature-based folder organization
- Zustand, TanStack Query, theme, motion, and Socket.IO-stub providers
- Environment variable validation, Pino logging, Sentry initialization
- ESLint, Prettier, Husky, lint-staged
- Docker, docker-compose, GitHub Actions CI
- Base layout, error boundaries, loading UI, not-found page
- Shared domain types (`types/domain/`), decoupled from Prisma
- Repository and service **interfaces only** (`repositories/`, `services/`)
- A typed `AppError` hierarchy (`lib/errors.ts`)

Authentication, encryption, real-time messaging, groups, attachments,
offline sync, and notifications — including any concrete implementation
of the repository/service interfaces above — are **out of scope** for
this phase and land in subsequent prompts per the PRD milestones.
