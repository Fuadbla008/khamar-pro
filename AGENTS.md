<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Working here

- `next dev` regenerates only the text between the markers above; put manual notes outside them. Don't delete the block to get a clean diff.
- JavaScript, not TypeScript. App Router is under `src/app/` (README's `app/page.js` is stale); `@/*` → `./src/*` via `jsconfig.json`.
- Next 16 renamed `middleware` → `proxy`: the auth gate is `src/proxy.js`. Reintroducing `middleware.js` triggers a deprecation warning.
- shadcn/ui v4 is initialized with the `radix-nova` preset and JSX (`components.json` has `tsx: false`); `cn` comes from the `cn` package. Add primitives with `npx shadcn@latest add <name>` instead of hand-writing them.
- No `postcss.config.*` or `tsconfig.json` by design: Tailwind v4 runs through the Turbopack loader in `next.config.mjs`, and there is no TypeScript.

## Verification

- Scripts: `npm run dev`, `npm run build`, `npm start`, `npm run lint`. No test, typecheck, or formatter script exists; `npm run build` is the strongest check.
- ESLint 9 flat config (`eslint.config.mjs`) redeclares the default ignores (`.next/**`, `out/**`, `build/**`, `next-env.d.ts`); add ignores there, not in `.eslintignore`.

## Config that changes the code you write

- `cacheComponents: true` + `partialPrefetching: true` in `next.config.mjs`: data is dynamic by default and PPR is on. Use `use cache` (with `cacheLife`/`cacheTag`) for cached work; no `runtime` route segment exports (Node.js runtime only). Guide: `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/cacheComponents.md`.
- Under `cacheComponents`, any page that reads `params`, `searchParams`, `cookies()`, or `headers()` must wrap that read in `<Suspense>` (or set `export const instant = false`), or `next build` fails with `blocking-prerender-dynamic`.
- `reactCompiler: true`: memoization is automatic — don't add manual `useMemo`/`useCallback` for performance.
- Tailwind v4 is wired through Turbopack via `turbopack.rules["*.css"]` → `@tailwindcss/turbopack`; there is no PostCSS config. Configure CSS handling in `next.config.mjs`, not `postcss.config.*`.
