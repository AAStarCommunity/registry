# AGENTS.md

## Commands
- **Build**: `pnpm build` (TypeScript compile + Vite build)
- **Lint**: `pnpm lint` (ESLint with TypeScript, React hooks, React refresh rules)
- **Test**: `npx playwright test` (E2E tests in /e2e directory)
- **Single test**: `npx playwright test e2e/filename.spec.ts`
- **Dev**: `pnpm dev` (Vite dev server on 5173 + Vercel dev on 3000)

## Code Style
- **Imports**: Group external libs first, then internal modules, use named imports preferred
- **Components**: Functional components with TypeScript, export as named functions
- **Types**: Strict TypeScript enabled, use interfaces for object shapes
- **Naming**: PascalCase for components, camelCase for variables/functions
- **Error handling**: Try-catch blocks with proper error logging
- **Styling**: CSS modules with component-specific .css files
- **i18n**: Use react-i18next with translation keys (e.g., "header.home")
- **File structure**: Pages in /pages, components in /components, utilities in /utils