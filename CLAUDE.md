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

## Development approach: test-driven development (TDD)

All feature work and bug fixes follow TDD: **write the spec tests first, then the code.**

1. **Spec:** before touching implementation code, write tests that describe the expected behavior, including edge and error cases (what the user sees, or what the API returns).
2. **Red:** run the tests and confirm each new one fails for the expected reason (missing behavior, not a typo or broken setup).
3. **Green:** write the minimum code that makes the tests pass. Nothing that no test asks for.
4. **Refactor:** clean up code and tests while keeping everything green.
5. Repeat in small steps, one behavior at a time.

Rules:

- Don't write or change production code without a failing test that requires it.
- A bug fix starts with a test that reproduces the bug.
- Never weaken or delete a test just to make it pass. If the spec was wrong, change it deliberately and say why.
- Test behavior through public interfaces (rendered UI, HTTP responses), not implementation details (internal state, private helpers).
- The whole test suite must pass before committing.

Testing tools:

| App | Tools | Status | What to test |
| --- | --- | --- | --- |
| Server | Vitest, Supertest | Installed | HTTP endpoints via `createApp()` from `src/app.ts`, against a separate test database (never the development database) |
| Client | Vitest, React Testing Library, `@testing-library/user-event`, `@testing-library/jest-dom`, jsdom | Installed | Pages, components and helpers through what the user sees and does, with the `api/` modules mocked |

- Test files sit next to the code they test: `src/routes/foods.test.ts` (server), `src/pages/MealsPage.test.tsx` (client). Shared helpers live in each app's `src/test/`.
- Both apps: `npm test` (watch mode) or `npm run test:run` (single run).
- Client page tests render the whole app at a URL with `renderApp('/meals')` (`src/test/renderApp.tsx`), mock API modules with `vi.mock('../api/meals.ts')`, and query by role/label like a user would. Real network calls are blocked. Tests run in UTC; pin "now" with `vi.useFakeTimers({ toFake: ['Date'] })` and `vi.setSystemTime(...)`.
- Server tests need PostgreSQL running. They create and migrate a separate `<database>_test` database (e.g. `nutrition_tracker_test`) automatically and empty it before every test. They refuse to run against a database whose name doesn't end in `_test`.

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

# Run the tests
docker compose exec nutrition-tracker-server npm run test:run
docker compose exec nutrition-tracker-client npm run test:run

# After editing prisma/schema.prisma: create + apply a migration, then regenerate the client
docker compose exec nutrition-tracker-server npm run db:migrate -- --name <short_change_name>
docker compose exec nutrition-tracker-server npm run db:generate

# Open a psql shell
docker compose exec nutrition-tracker-db psql -U nutrition -d nutrition_tracker
```

**After adding or removing npm packages**, restart that app's container (e.g. `docker compose restart nutrition-tracker-client`). Each container keeps `node_modules` in a volume that survives rebuilds; on start, `docker-entrypoint.sh` compares `package-lock.json` with what's installed and runs `npm ci` if they differ. If dependencies still look wrong, start from fresh volumes:

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
| `npm test` / `npm run test:run` | Vitest in watch mode / single run |
| `npm run preview` | Serve the production build locally |

Server (`nutrition-tracker-server`):

| Script | What it does |
| --- | --- |
| `npm run dev` | Start API with hot reload (`tsx watch`) |
| `npm run build` / `npm start` | Compile to `dist/` (tests left out via `tsconfig.build.json`) / run compiled build |
| `npm run typecheck` | Type-check only (includes tests) |
| `npm test` / `npm run test:run` | Vitest in watch mode / single run |
| `npm run db:generate` | Generate the Prisma client into `src/generated/prisma` |
| `npm run db:migrate` | `prisma migrate dev`: create + apply a migration (development) |
| `npm run db:deploy` | `prisma migrate deploy`: apply existing migrations |
| `npm run db:seed` | Run `prisma/seed.ts` |
| `npm run db:studio` | Prisma Studio (run on the host with `.env` pointing at `localhost:5432`) |
| `npm run docker:dev` | Container start command (generate → deploy → dev) |

## Architecture

### Client (`nutrition-tracker-client/src`)

- `main.tsx`: mounts `App` inside `ThemeProvider` + `CssBaseline`; loads the Roboto font.
- `theme.ts`: MUI theme (palette, shape, component defaults). Change colors here, not in components.
- `App.tsx`: creates the browser router (React Router 8, data mode) from `routes.tsx`.
- `routes.tsx`: the route table. Every page renders inside `layouts/AppLayout.tsx`; `/` redirects to `/foods`; unknown URLs show `NotFoundPage`. Tests use the same table with a memory router.
- `layouts/`: `AppLayout` (app bar, collapsible side menu, `<Outlet />` for the current page) and `navItems.tsx` (menu sections: label, path, icon, order).
- `pages/`: one component per route, each starting with `PageHeader` (the page's `<h1>`):

  | Route | Page | Status |
  | --- | --- | --- |
  | `/charts` | `ChartsPage` | Placeholder |
  | `/targets` | `TargetsPage` ("Set targets") | Placeholder |
  | `/foods` | `FoodsPage` ("Food management") | Paginated, searchable list; add a food with all fields and a picture; delete |
  | `/meals` | `MealsPage` ("Meal management") | View meals by day; add, edit and delete today's meals |
  | `/nutrition-report` | `NutritionReportPage` | Placeholder |

- `components/`: UI components that receive data via props (`SideMenu`, `PageHeader`, `FoodFormDialog`, `FoodTable`, `MealCard`, `MealDialog`, `FoodSearchField`, `ConfirmDialog`, `ServerStatus`).
- `hooks/`: custom hooks that own state and data fetching (`useFoods`, `useMeals`) plus `useDebouncedValue` (waits for a pause in typing before searching).
- `api/`: fetch wrappers. `client.ts` has `apiRequest()` (JSON in/out, throws `ApiError` with status); one file per resource (`foods.ts`, `meals.ts`, `health.ts`).
- `types/`: TypeScript types mirroring API responses (`food.ts`, `meal.ts`, `page.ts`).
- `utils/`: pure helpers with their own tests: `date.ts` (local dates and times, browser timezone) and `nutrition.ts` (energy per item, meal and day; amounts in g/ml).
- `test/`: `setup.ts` (jest-dom matchers, blocks real network calls) and `renderApp.tsx`.

Meal management keeps the viewed day in the URL (`/meals?date=YYYY-MM-DD`; no date means today). Only today's meals can be added, edited or deleted; other days are read-only. It sends the browser's timezone with `GET /api/meals`, and the food picker searches with `GET /api/foods?search=`.

File uploads use `FormData` (see `createFood` in `api/foods.ts`); `apiRequest()` then leaves the `Content-Type` header to the browser. Food pictures are `<img>`s pointing at `pictureUrl` (`/uploads/...`).

The client calls relative `/api/...` URLs. The Vite dev server proxies `/api` and `/uploads` to `API_PROXY_TARGET` (default `http://localhost:4000`; Docker sets `http://nutrition-tracker-server:4000`). `VITE_API_BASE_URL` can override the base URL.

### Server (`nutrition-tracker-server`)

- `src/index.ts`: starts the HTTP server and handles graceful shutdown.
- `src/app.ts`: `createApp()` registers middleware and mounts routers under `/api`.
- `src/config.ts`: reads env vars (`DATABASE_URL` required; `PORT`, `CORS_ORIGIN`). Loads `.env` via dotenv when present.
- `src/lib/prisma.ts`: the single shared `PrismaClient`, connected through `@prisma/adapter-pg`.
- `src/routes/`: one Express `Router` per resource. Validate input with zod; throw `HttpError` for expected failures.
- `src/middleware/uploadPicture.ts`: `multer` setup for `multipart/form-data` requests (file field `picture`, max 5 MB, kept in memory until checked).
- `src/routes/meals.ts`: meals with their foods. Enforces the 48-hour edit/delete window and finds a day's meals with `src/lib/dates.ts`, which turns a calendar date + IANA timezone into a UTC range (daylight saving included).
- `src/lib/pictures.ts`: checks a picture is really JPEG/PNG/WebP by its first bytes, and saves/deletes files under `UPLOADS_DIR/foods/` (default `nutrition-tracker-server/uploads/`, gitignored). `src/app.ts` serves that folder at `/uploads`.
- `src/middleware/errorHandler.ts`: central error handling. `ZodError` → 400, `HttpError` → its status, upload too large → 413 (other upload errors → 400), Prisma `P2025` (record missing) → 404, malformed JSON → 400, anything else → 500. Error responses look like `{ "error": "message" }`.
- `prisma/schema.prisma`: data models: `Food` (with `FoodType` and `ServingUnit` enums), `Meal` (with `MealTitle`) and `MealItem` (a food in a meal plus servings eaten). `prisma/migrations/`: SQL migrations (committed). `prisma/seed.ts`: six sample foods, each with a copy of `prisma/seed-picture.png`.
- `prisma.config.ts`: Prisma 7 CLI config; the database URL lives here, not in the schema.
- `src/generated/prisma/`: generated client (gitignored). Import it as `../generated/prisma/client.js`.
- `src/routes/*.test.ts`: API spec tests (Vitest + Supertest). `src/test/`: test database setup and reset, helpers and image fixtures. `vitest.config.ts`: test configuration.
- `docs/api-spec.md`: the Foods and Meals API contract, specified by the tests.

### API endpoints

The Foods and Meals API is specified in `nutrition-tracker-server/docs/api-spec.md` and by the spec tests in `nutrition-tracker-server/src/routes/*.test.ts`. If the two disagree, the tests win.

**Status:** Foods API (features 1–4) and Meals API (features 5–7) are implemented and all their spec tests pass. `GET /api/health` returns `{ status, database }` (503 if the database is down).

### Database

- Compose service and container: `nutrition-tracker-db`. Data persists in the named volume `nutrition-tracker-db-data`, mounted at `/var/lib/postgresql` (the PostgreSQL 18+ image layout; don't change it to `/var/lib/postgresql/data`).
- Prisma models are PascalCase; tables and columns are snake_case via `@@map` / `@map`.
- Tables: `foods`, `meals`, `meal_items`. Deleting a meal deletes its items (cascade); a food used in any meal can't be deleted (restrict, plus a friendly 409 from the API). Each food appears at most once per meal.
- Tests use a separate database, `nutrition_tracker_test`, which the test setup creates and migrates automatically.
- Schema changes always go through Prisma migrations. Never edit a migration that has already been applied; create a new one.

## Adding a new feature end to end

Test first at each layer, one behavior at a time:

1. **Server spec:** write Supertest tests for the new or changed endpoints, then run them and watch them fail.
2. If the data shape changes, update `prisma/schema.prisma`, then run `db:migrate` (with `--name`) and `db:generate`.
3. Add or extend a router in `src/routes/` (with zod validation) and mount it in `src/app.ts` until the server tests pass.
4. **Client spec:** write React Testing Library tests for the new UI behavior, then run them and watch them fail.
5. Add types in `types/`, fetch functions in `api/`, a hook in `hooks/` and components/pages until the client tests pass.
6. Refactor with all tests green, then commit.

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
- The `food_details` migration removed the starter foods (they had no type, serving or picture). Run `db:seed` for sample foods.
- The containers keep their own `node_modules` in anonymous volumes, refreshed by `docker-entrypoint.sh` whenever `package-lock.json` changes. An error like `Failed to resolve import "<package>"` in a container means those volumes are stale: restart the container, or use `docker compose up --build -V`.
- If port 5432, 4000 or 5173 is already in use on your machine, override `DB_PORT`, `SERVER_PORT` or `CLIENT_PORT` in a root `.env`.

## Working style for this repo

Because this is a learning project:

- Explain the React concepts behind non-trivial changes (why a hook, why lifting state, etc.).
- Follow the TDD workflow: show the failing spec test first, then the code that makes it pass.
- Make changes in small, reviewable steps rather than large rewrites.
- When there are several reasonable approaches, briefly note the trade-offs before picking one.
- Ask before introducing new dependencies or restructuring the project.
