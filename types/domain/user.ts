/**
 * Domain representation of a user, for frontend consumption.
 *
 * This now re-exports the real `UserResponseDto` (schemas/user.schema.ts)
 * instead of a hand-maintained parallel shape.
 */
export type { UserResponseDto as User } from "@/schemas/user.schema";
