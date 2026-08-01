# AGENTS.md

## Agent skills

### Issue tracker

Issues and PRDs for this repo live as GitHub issues (`phasehumans/december`). See `docs/agents/issue-tracker.md`.

### Triage labels

Uses canonical triage label vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout (`CONTEXT.md` + `docs/adr/` at repo root). See `docs/agents/domain.md`.

## Server Module Architecture & Service Standards

Reference gold standard modules: `auth`, `notification`, `session`.

- **File Responsibility Separation**:
    - `<module>.routes.ts`: Defines Express routes delegating to controller functions (`export default <module>Router`).
    - `<module>.controller.ts`: Handles HTTP requests using `asyncHandler`, parses validation schemas via Zod (`.parse()`), and returns `sendSuccess(res, message, data, status)` or throws `AppError(message, status)`. Exports `<module>Controller` object.
    - `<module>.service.ts`: Business logic functions. Exports `<module>Service` object.
    - `<module>.repository.ts`: Database / Prisma queries. Exports `<module>Repository` object.
    - `<module>.schema.ts`: Zod request validation schemas.
    - `<module>.types.ts`: Centralized TypeScript interfaces and types.
    - `<module>.utils.ts`: Module helper functions.

- **Service Layer Rules**:
    - **Arrow Functions**: All service functions must be declared as private `const functionName = async (data: TypeName) => { ... }` arrow functions.
    - **Single Parameter & Destructuring**: Service functions accept a single typed `data` object parameter and destructure its fields on the **first line** inside the function body (`const { prop1, prop2 } = data`).
    - **Type Centralization**: Service parameter types and interfaces must be defined in `<module>.types.ts` and imported into `<module>.service.ts`.
    - **Singleton Export**: Individual service functions must not be exported directly. Export exclusively via a single object at the end of the file (`export const <module>Service = { ... }`).

## Testing & Environment

- **Test Environment & DB Setup**: Tests run against `.env.test`.
- **Database Migrations for Tests**: Before running integration or server tests against the test database, deploy test migrations:
    ```bash
    bun --cwd packages/database db:migrate:test
    ```

## Code Quality & Linting Standards

- **No Empty Catch Blocks**: Never leave catch blocks empty (`catch (e) {}`). Always include a descriptive comment explaining why the error is ignored (e.g. `// Intentionally swallowed: fallback handled`), or log/handle the error.
- **No `require()` Imports**: Never use CommonJS `require()`. Always use top-level ES module `import` statements (`import ... from '...'`).
- **Scoped Switch Cases**: Always enclose `case` blocks in curly braces `{ ... }` when declaring `const` or `let` variables inside a `switch` statement.
- **Complete React Hook Dependencies**: Ensure all `useEffect`, `useCallback`, and `useMemo` hooks have complete dependency arrays or explicitly documented refs.
