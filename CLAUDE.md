# CLAUDE.md

This file gives Claude Code guidance when working in this repository.

## Project overview

**nutrition-tracker-react** is a full-stack nutrition tracker built as a **learning project**: the goal is to demonstrate and practise React (and a typical TypeScript backend), not to ship a production app. Clarity matters more than cleverness.

It has three parts, all run together with Docker Compose:

| Part | Name | Stack |
| --- | --- | --- |
| Frontend | `nutrition-tracker-client` | React 19, Material UI 9, TypeScript, Vite 8 |
| Backend | `nutrition-tracker-server` | Node 24, Express 5, Prisma 7 ORM, zod 4, TypeScript |
| Database | `nutrition-tracker-db` | PostgreSQL 18 (`postgres:18-alpine`) |

## Repository layout

```
nutrition-tracker-react/
├── docker-compose.yml          # runs db + server + client for development
├── .env.example                # optional overrides for compose (DB credentials, host ports)
├── nutrition-tracker-client/   # React + MUI app (Vite)
├── nutrition-tracker-server/   # Express API + Prisma
└── (nutrition-tracker-db)      # PostgreSQL service defined in docker-compose.yml (no folder)
```

## Running with Docker (main workflow)

```bash
docker compose up --build        # start everything; first run builds the images
docker compose up -d             # start in the background
docker compose logs -f nutrition-tracker-server   # follow one service's logs
docker compose down              # stop (database data is kept)
docker compose down -v           # stop AND delete the database volume
```

- Client: http://localhost:5173
- API: http://localhost:4000/api (e.g. `/api/health`)
- PostgreSQL: `localhost:5432`, user `nutrition`, password `nutrition`, database `nutrition_tracker` (development-only credentials)

Both apps mount their source folders into the containers, so edits hot-reload (Vite HMR for the client, `tsx watch` for the server). On start the server container runs `prisma generate`, then `prisma migrate deploy`, then the dev server (`npm run docker:dev`).

Common tasks inside the containers:

```bash
# Add sample data
docker compose exec nutrition-tracker-server npm run db:seed

# After editing prisma/schema.prisma: create + apply a migration, then regenerate the client
docker compose exec nutrition-tracker-server npm run db:migrate -- --name <short_change_name>
docker compose exec nutrition-tracker-server npm run db:generate

# Open a psql shell
docker compose exec nutrition-tracker-db psql -U nutrition -d nutrition_tracker
```

**After adding or removing npm packages**, rebuild and refresh the containers' `node_modules` volumes:

```bash
docker compose up --build -V     # -V = --renew-anon-volumes
```

Ports or credentials can be changed by copying `.env.example` to `.env` at the repo root.

## Running without Docker (optional)

```bash
docker compose up -d nutrition-tracker-db          # still use Docker for PostgreSQL

cd nutrition-tracker-server
cp .env.example .env
npm install
npm run db:generate && npm run db:deploy
npm run dev                                        # http://localhost:4000

cd ../nutrition-tracker-client
npm install
npm run dev                                        # http://localhost:5173, proxies /api to :4000
```

## Commands

Client (`nutrition-tracker-client`):

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check (`tsc -b`) and build to `dist/` |
| `npm run typecheck` | Type-check only |
| `npm run lint` | Oxlint (includes React rules-of-hooks) |
| `npm run preview` | Serve the production build locally |

Server (`nutrition-tracker-server`):

| Script | What it does |
| --- | --- |
| `npm run dev` | Start API with hot reload (`tsx watch`) |
| `npm run build` / `npm start` | Compile to `dist/` / run compiled build |
| `npm run typecheck` | Type-check only |
| `npm run db:generate` | Generate the Prisma client into `src/generated/prisma` |
| `npm run db:migrate` | `prisma migrate dev`: create + apply a migration (development) |
| `npm run db:deploy` | `prisma migrate deploy`: apply existing migrations |
| `npm run db:seed` | Run `prisma/seed.ts` |
| `npm run db:studio` | Prisma Studio (run on the host with `.env` pointing at `localhost:5432`) |
| `npm run docker:dev` | Container start command (generate → deploy → dev) |

## Architecture

### Client (`nutrition-tracker-client/src`)

- `main.tsx`: mounts the app inside `ThemeProvider` + `CssBaseline`; loads the Roboto font.
- `theme.ts`: MUI theme (palette, shape, component defaults). Change colors here, not in components.
- `App.tsx`: page shell (AppBar + container).
- `pages/`: page-level components that compose hooks and components (`FoodsPage`).
- `components/`: UI components that receive data via props (`FoodForm`, `FoodTable`, `ServerStatus`).
- `hooks/`: custom hooks that own state and data fetching (`useFoods`).
- `api/`: fetch wrappers. `client.ts` has `apiRequest()` (JSON in/out, throws `ApiError` with status); one file per resource (`foods.ts`, `health.ts`).
- `types/`: TypeScript types mirroring API responses.

The client calls relative `/api/...` URLs. The Vite dev server proxies `/api` to `API_PROXY_TARGET` (default `http://localhost:4000`; Docker sets `http://nutrition-tracker-server:4000`). `VITE_API_BASE_URL` can override the base URL.

### Server (`nutrition-tracker-server`)

- `src/index.ts`: starts the HTTP server and handles graceful shutdown.
- `src/app.ts`: `createApp()` registers middleware and mounts routers under `/api`.
- `src/config.ts`: reads env vars (`DATABASE_URL` required; `PORT`, `CORS_ORIGIN`). Loads `.env` via dotenv when present.
- `src/lib/prisma.ts`: the single shared `PrismaClient`, connected through `@prisma/adapter-pg`.
- `src/routes/`: one Express `Router` per resource. Validate input with zod; throw `HttpError` for expected failures.
- `src/middleware/errorHandler.ts`: central error handling. `ZodError` → 400, `HttpError` → its status, Prisma `P2025` (record missing) → 404, malformed JSON → 400, anything else → 500. Error responses look like `{ "error": "message" }`.
- `prisma/schema.prisma`: data models. `prisma/migrations/`: SQL migrations (committed). `prisma/seed.ts`: sample data.
- `prisma.config.ts`: Prisma 7 CLI config; the database URL lives here, not in the schema.
- `src/generated/prisma/`: generated client (gitignored). Import it as `../generated/prisma/client.js`.

### API endpoints

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/health` | `{ status, database }`; 503 if the database is unreachable |
| GET | `/api/foods` | List foods, newest first |
| GET | `/api/foods/:id` | Get one food |
| POST | `/api/foods` | Create (`name`, `calories`, optional `protein`/`carbs`/`fat` in grams) |
| PUT | `/api/foods/:id` | Replace a food's fields |
| DELETE | `/api/foods/:id` | Delete (204) |

`Food` is an example resource that shows the full stack working end to end; reshape or replace it as the real domain (meals, daily logs, goals…) is designed.

### Database

- Compose service and container: `nutrition-tracker-db`. Data persists in the named volume `nutrition-tracker-db-data`, mounted at `/var/lib/postgresql` (the PostgreSQL 18+ image layout; don't change it to `/var/lib/postgresql/data`).
- Prisma models are PascalCase; tables and columns are snake_case via `@@map` / `@map`.
- Schema changes always go through Prisma migrations. Never edit a migration that has already been applied; create a new one.

## Adding a new feature end to end

1. Add or change a model in `prisma/schema.prisma`, then run `db:migrate` (with `--name`) and `db:generate`.
2. Add a router in `src/routes/` with zod validation and mount it in `src/app.ts`.
3. In the client, add types in `types/`, fetch functions in `api/`, a hook in `hooks/` and components/pages.

## Conventions

- Function components and hooks only; no class components.
- Keep components small and focused; move reusable state/data logic into custom hooks.
- One component per file, named in PascalCase to match the component.
- Use MUI components and the `sx` prop/theme for styling; avoid separate CSS files unless needed.
- Client imports include the file extension (`./App.tsx`), as in the Vite template.
- The client's TS config has `erasableSyntaxOnly`: no `enum`s or constructor parameter properties. Use union types and explicit class fields.
- The server is ESM with `nodenext` resolution: relative imports must end in `.js` (e.g. `./app.js`), even for `.ts` files.
- Prefer plain, readable code over abstractions; avoid adding libraries unless they teach something useful or remove real complexity.
- Do not commit secrets, `.env` files or `src/generated/`.

## Gotchas

- Prisma 7 needs `DATABASE_URL` set even for `prisma generate` (`prisma.config.ts` uses `env()`). Outside Docker, create `nutrition-tracker-server/.env` first.
- Prisma 7 does not regenerate the client or run the seed automatically after migrations; run `db:generate` / `db:seed` yourself.
- The containers keep their own `node_modules` in anonymous volumes. After dependency changes, use `docker compose up --build -V`.
- If port 5432, 4000 or 5173 is already in use on your machine, override `DB_PORT`, `SERVER_PORT` or `CLIENT_PORT` in a root `.env`.

## Working style for this repo

Because this is a learning project:

- Explain the React concepts behind non-trivial changes (why a hook, why lifting state, etc.).
- Make changes in small, reviewable steps rather than large rewrites.
- When there are several reasonable approaches, briefly note the trade-offs before picking one.
- Ask before introducing new dependencies or restructuring the project.
