import { z } from "zod";

/**
 * Client-side form validation for Login/Register/username setup.
 *
 * `registerFormSchema` used to also collect `username` up front, which
 * made the register form unusually long (name + username + email +
 * password + confirm, all on one screen). It's collected separately now,
 * one step later: `RegisterForm` only handles the fields Better Auth's
 * `emailAndPassword` provider itself needs (`name`/`email`/`password`),
 * then routes to `/onboarding/username`
 * (features/auth/components/set-username-form.tsx) to create the
 * `UserProfile` row the username lives on via
 * `POST /api/v1/users/me/profile` — see that component's doc comment.
 * `usernameFormSchema` is the same validation the old inline field used,
 * just split into its own schema so it can be reused by that step.
 *
 * This is a fresh, small schema rather than a reuse of the old
 * `schemas/auth.schema.ts` file — that file no longer exists (it modeled
 * the pre-Better-Auth custom `/v1/auth/register` endpoint, which Better
 * Auth's own endpoints replaced).
 */

export const loginFormSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
export type LoginFormValues = z.infer<typeof loginFormSchema>;

export const registerFormSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(100),
    email: z.string().min(1, "Email is required").email("Enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters").max(128),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type RegisterFormValues = z.infer<typeof registerFormSchema>;

// Matches the server-side check in schemas/user.schema.ts#createProfileSchema.
export const usernameFormSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(24, "Username must be at most 24 characters")
    .regex(/^[a-z0-9_]+$/, "Lowercase letters, numbers, and underscores only"),
});
export type UsernameFormValues = z.infer<typeof usernameFormSchema>;
