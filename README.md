# nutrition-tracker-react

A nutrition tracker built to demonstrate a React project for learning purposes.

| Part | Folder / service | Stack |
| --- | --- | --- |
| Frontend | `nutrition-tracker-client` | React, Material UI, TypeScript, Vite |
| Backend | `nutrition-tracker-server` | Express, Prisma, TypeScript |
| Database | `nutrition-tracker-db` | PostgreSQL |

## Quick start

Requirements: [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine with Compose).

```bash
docker compose up --build
```

Then open:

- App: http://localhost:5173
- API health check: http://localhost:4000/api/health

Optional: load some sample foods.

```bash
docker compose exec nutrition-tracker-server npm run db:seed
```

Stop with `Ctrl+C` or `docker compose down` (add `-v` to also delete the database).

## More

See [CLAUDE.md](./CLAUDE.md) for project structure, commands, API endpoints and conventions.
