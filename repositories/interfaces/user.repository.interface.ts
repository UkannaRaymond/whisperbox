import { User, UserProfile, UserStatus } from "@/lib/generated/prisma/client";
import type { IBaseRepository } from "./base.repository.interface";

/**
 * The shape every read method returns: a Better-Auth-owned `User` row
 * together with its 1:1 WhisperBox `UserProfile` (username, display name,
 * avatar, bio, presence status, etc). `profile` can be null for a user who
 * has an auth account but hasn't completed WhisperBox profile setup yet —
 * callers should handle that case explicitly rather than assume it exists.
 *
 * (Previously this interface assumed `username`/`displayName`/`avatarUrl`/
 * `bio`/`status`/`lastSeenAt`/`passwordHash`/`role` lived directly on
 * `User` — none of those fields exist there in the current schema. Profile
 * fields live on `UserProfile`; password lives on Better Auth's `Account`
 * row; there is no site-wide `role` field yet at all.)
 */
export type UserWithProfile = User & { profile: UserProfile | null };

export interface CreateUserProfileInput {
  /** id of an already-existing Better Auth `User` row (created via auth.api.signUpEmail, not here). */
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
}

export interface UpdateUserProfileInput {
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  status?: UserStatus;
  lastSeenAt?: Date;
}

export interface IUserRepository extends IBaseRepository<
  UserWithProfile,
  CreateUserProfileInput,
  UpdateUserProfileInput
> {
  findByEmail(email: string): Promise<UserWithProfile | null>;
  findByUsername(username: string): Promise<UserWithProfile | null>;
  /** Case-insensitive partial match on username/displayName, restricted to profiles marked searchable. */
  search(
    query: string,
    params?: { take?: number; excludeUserId?: string },
  ): Promise<UserWithProfile[]>;
  updatePresence(id: string, status: UserStatus): Promise<UserWithProfile>;
}
