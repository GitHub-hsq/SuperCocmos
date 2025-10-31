# Repository Guidelines

## Project Structure & Module Organization
SuperCocmos pairs a Vite-powered Vue 3 client with an Express-based service. Use the root `src/` folder for browser code: `components/` holds reusable UI, `views/` maps to router entries, `services/` wraps remote calls, and `hooks/` keeps composables named `useSomething`. Server logic lives in `service/src/` with REST handlers under `api/`, conversation orchestration in `chatgpt/`, persistence adapters in `db/`, and cache or middleware helpers alongside. Place shared copy under `docs/`, static assets in `public/`, and Tailwind primitives in `src/styles/`. Keep DTOs mirrored between `src/typings/` and `service/src/types.ts` to avoid drift.

## Build, Test, and Development Commands
- `pnpm bootstrap` - install dependencies and enable Husky hooks.
- `pnpm dev` - run the Vite dev server (default: http://localhost:5173).
- `pnpm build` - run `vue-tsc` then generate the production bundle in `dist/`.
- `pnpm lint` / `pnpm lint:fix` - apply `@antfu/eslint-config` rules and autofixes.
- `cd service && pnpm dev` - start the Express service with `esno` watch mode.
- `cd service && pnpm build` - bundle the service to `build/index.mjs` via `tsup`.
- `cd service && pnpm test:db|test:redis|test:llm` - smoke-test external integrations before merging.

## Coding Style & Naming Conventions
Editors should honor `.editorconfig`: tabs with visual width 2, LF endings, UTF-8. Author Vue SFCs with `<script setup lang="ts">`, export camelCase utilities, and keep component filenames PascalCase. Align Tailwind classes with existing patterns and avoid inline styles when a token exists in `src/styles/`. Always stage lint fixes before committing.

## Testing Guidelines
Automated checks currently rely on linting, type checks, and targeted service scripts. When adding unit coverage, co-locate Vitest suites under the related folder (for example `src/components/__tests__/` or `service/tests/`) and mock third-party providers to keep runs deterministic. Document any manual verification (screenshots, API traces) in the PR when automated coverage is impractical.

## Commit & Pull Request Guidelines
Commits follow Conventional Commit prefixes enforced by Commitlint (for example `feat(router): add auth guard`). Scope commits narrowly and prefer follow-up issues over speculative changes. Before opening a PR, run `pnpm lint`, `pnpm build`, and relevant service smoke tests. Each PR should link its issue, summarize behavior changes, list verification steps, and attach UI screenshots or API logs whenever the user experience changes. Keep descriptions concise but actionable.
