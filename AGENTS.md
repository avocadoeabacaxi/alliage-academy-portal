# AGENTS.md

## Project Context

This is the self-hosted Alliage Trainning application. Treat it as user-owned application code, keep changes focused on the user's request, and preserve existing project conventions.

Start with `README.md` for local setup, environment variables, and publish workflow.

## Key Files

- `src/`: frontend application source.
- `src/api/base44Client.js`: compatibility facade for the self-hosted API.
- `server/`: Node.js API, authentication, SQLite persistence, email and AI integrations.
- `vite.config.js`: Vite frontend configuration and local API proxy.
- `docker-compose.yml`: production container definition.
- `.env.local`: local-only environment values; never commit secrets.

## Working Notes

- Use `npm run dev:server` for the backend and `npm run dev` for the frontend during local development.
- Preserve the `base44Client.js` facade unless migrating all frontend call sites together; it now talks only to the local API.
- Keep production configuration in environment variables and never commit secrets or exported databases.
- Use `npm run import:data -- /path/to/export.json` to import a historical Base44 export.
- Run the relevant checks from `package.json` before finishing code changes.
