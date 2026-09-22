import { z } from "zod";

export const updateMeSchema = z
  .object({
    displayName: z.string().min(1).max(64).optional(),
    avatarUrl: z.string().url().optional(),
    bio: z.string().max(280).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });
export type UpdateMeDto = z.infer<typeof updateMeSchema>;

export const lookupUserQuerySchema = z.object({
  handle: z.string().min(1, "handle is required"),
});
export type LookupUserQueryDto = z.infer<typeof lookupUserQuerySchema>;

// Matches the client-side check in features/auth/schemas/auth-form.schema.ts
// (registerFormSchema.username) — kept as a separate literal here rather
// than importing across the client/server boundary, same pattern as the
// rest of this file's DTOs.
export const createProfileSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(24, "Username must be at most 24 characters")
    .regex(/^[a-z0-9_]+$/, "Username can only contain lowercase letters, numbers, and underscores"),
  displayName: z.string().min(1).max(100).optional(),
});
export type CreateProfileDto = z.infer<typeof createProfileSchema>;

export const userResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  username: z.string().nullable(),
  displayName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  bio: z.string().nullable(),
  status: z.enum(["ONLINE", "AWAY", "BUSY", "INVISIBLE", "OFFLINE"]),
  lastSeenAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});
export type UserResponseDto = z.infer<typeof userResponseSchema>;
