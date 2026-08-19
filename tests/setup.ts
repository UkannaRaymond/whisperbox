import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./mocks/server";

/**
 * See tests/mocks/server.ts's doc comment — this is what actually starts
 * MSW for the test run. `onUnhandledRequest: "error"` is deliberate: a
 * test that forgets to mock an endpoint it calls should fail loudly with
 * "no handler for X", not silently hit the real network (or silently
 * hang, in an environment with no network access at all).
 */
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
