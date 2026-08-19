import { setupServer } from "msw/node";
import { handlers } from "./handlers";

/**
 * MSW server for unit/integration tests (Node, via vitest). `handlers.ts`
 * existed already but had no `setupServer` anywhere in the codebase, so
 * nothing ever actually intercepted a request — a test that called
 * `fetch` would either hit the real network or fail outright depending on
 * environment. Lifecycle (`listen`/`resetHandlers`/`close`) is wired up
 * once here and started from tests/setup.ts, so every test file gets
 * request mocking for free without repeating the boilerplate.
 */
export const server = setupServer(...handlers);
