import "server-only";

import type { z } from "zod";

import { createLogger } from "@/server/logger";
import { isAppError } from "@/lib/errors";
import type { ApiResult } from "@/types/api";

const log = createLogger("server-action");

// `@/types/api` only exports the envelope *types* now (plus `isApiError`),
// not factory functions — building the objects directly here matches the
// nested `error: { code, message }` shape that `http/response.ts` actually
// produces, rather than the flat shape the old `apiSuccess`/`apiError`
// helpers used to build.
function successEnvelope<TOutput>(data: TOutput): ApiResult<TOutput> {
  return { success: true, data };
}

function errorEnvelope<TOutput>(code: string, message: string): ApiResult<TOutput> {
  return { success: false, error: { code, message } };
}

/**
 * Wraps a Server Action so that:
 *  - input is parsed and validated with a Zod schema before the handler
 *    ever runs (no uncontrolled/unvalidated mutations, per the TRD),
 *  - thrown errors are caught, logged, and turned into the standard
 *    `{ success, error, code, message }` envelope instead of leaking a
 *    stack trace to the client — typed `AppError`s (from `lib/errors`)
 *    surface their own `code`/`message`; anything else collapses to a
 *    generic `INTERNAL_ERROR` so implementation details never leak,
 *  - the return type is always `ApiResult<TOutput>`, so calling code can
 *    narrow on `result.success` without a try/catch at every call site.
 *
 * Usage:
 *   export const createContact = createSafeAction(
 *     createContactSchema,
 *     async (input) => {
 *       // input is fully typed and validated here
 *       return contact;
 *     },
 *   );
 */
export function createSafeAction<TSchema extends z.ZodTypeAny, TOutput>(
  schema: TSchema,
  handler: (input: z.infer<TSchema>) => Promise<TOutput>,
) {
  return async (rawInput: z.infer<TSchema>): Promise<ApiResult<TOutput>> => {
    const parsed = schema.safeParse(rawInput);

    if (!parsed.success) {
      return errorEnvelope(
        "VALIDATION_ERROR",
        parsed.error.issues.map((issue) => issue.message).join(", "),
      );
    }

    try {
      const data = await handler(parsed.data);
      return successEnvelope(data);
    } catch (error) {
      if (isAppError(error)) {
        log.warn({ code: error.code, message: error.message }, "Server action rejected");
        return errorEnvelope(error.code, error.message);
      }

      log.error({ error }, "Server action failed");

      return errorEnvelope("INTERNAL_ERROR", "Something went wrong while processing your request.");
    }
  };
}
