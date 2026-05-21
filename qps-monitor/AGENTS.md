# Repository Guidelines

## Project Structure & Module Organization

This is a small Node.js/Koa monitoring app with a static frontend.

- `server/app.js` starts the Koa server, serves `public/`, registers routes, and schedules QPS checks.
- `server/routes/` contains API handlers: `config.js` for configuration and `metrics.js` for current metrics/history.
- `server/services/` contains integrations and domain logic: Grafana querying, Feishu notifications, and alert checks.
- `server/store/config.js` loads and persists configuration.
- `config/default.json` holds default runtime settings; local overrides may be written as `config/local.json`.
- `public/index.html` and `public/app.js` contain the browser UI.

There is currently no dedicated `test/` directory or build output directory.

## Build, Test, and Development Commands

- `npm install` installs dependencies from `package-lock.json`.
- `npm start` runs the app with `node server/app.js`.
- `npm run dev` currently runs the same command as `npm start`.

The server listens on `config.server.port` from the loaded configuration. Check the startup log for the actual URL, for example `http://localhost:3005`.

## Coding Style & Naming Conventions

Use CommonJS modules (`require`, `module.exports`) to match the existing server code. Keep JavaScript indentation at two spaces and prefer `const`/`let` over `var`. Use camelCase for variables and functions, PascalCase for service classes such as `GrafanaService`, and descriptive route/service filenames such as `metrics.js` or `alert.js`.

Keep route handlers thin. Put external API calls and alerting behavior in `server/services/`, and keep configuration persistence in `server/store/`.

## Testing Guidelines

No automated test framework is configured yet. Before submitting changes, run `npm start` and manually verify the affected API or UI path. Useful endpoints include configuration routes under `/api/config` and metrics routes under `/api/metrics`.

If adding tests, prefer a Node-friendly stack such as Jest or Vitest plus Supertest for Koa routes. Name tests after the module under test, for example `server/services/alert.test.js`.

## Commit & Pull Request Guidelines

This directory does not currently include Git history, so no existing commit convention can be inferred. Use concise, imperative commit subjects, for example `Add alert cooldown validation` or `Update Grafana query handling`.

Pull requests should include a short summary, manual verification steps, configuration changes, and screenshots for UI changes. Link related issues when available.

## Security & Configuration Tips

Do not add real Grafana passwords, Feishu webhooks, or other secrets to shared commits. Prefer local-only overrides in `config/local.json` and document any required configuration keys in the README or PR notes.
