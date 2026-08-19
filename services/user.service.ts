import { repositories } from "../repositories/prisma";
import { NotFoundError } from "../errors";
import type { UserWithProfile } from "../repositories/interfaces/user.repository.interface";
import type { CreateProfileDto, UpdateMeDto, UserResponseDto } from "../schemas/user.schema";

/**
 * Maps a Better-Auth `User` + WhisperBox `UserProfile` pair to the public
 * response DTO. Kept local to this service (rather than added to the
 * shared `services/mappers.ts`) so this fix doesn't touch that file's
 * other mapper functions, which target conversations/messages/attachments
 * and have their own, separate schema-drift issues outside this change's
 * scope.
 */
function toUserResponse(user: UserWithProfile): UserResponseDto {
  const profile = user.profile;
  return {
    id: user.id,
    email: user.email,
    username: profile?.username ?? null,
    displayName: profile?.displayName ?? user.name,
    avatarUrl: profile?.avatarUrl ?? user.image,
    bio: profile?.bio ?? null,
    status: profile?.status ?? "OFFLINE",
    lastSeenAt: profile?.lastSeenAt ? profile.lastSeenAt.toISOString() : null,
    createdAt: user.createdAt.toISOString(),
  };
}

/**
 * Creates the caller's initial `UserProfile` row — the missing piece that
 * used to leave every self-registered account with no username (Better
 * Auth's `signUpEmail` only creates the core `User` row: id/email/name).
 * Called once, right after sign-up, from the `/onboarding/username` step
 * (features/auth/components/set-username-form.tsx) rather than inline on
 * the register form itself — see that form's doc comment for why it's a
 * separate step.
 *
 * Throws `ConflictError` (409) if a profile already exists for this user
 * (e.g. a retried/duplicate submission) or if the username is taken —
 * both surface from repositories/prisma/user.repository.ts's `create`,
 * which translates Prisma's unique-constraint violation into that error.
 */
export async function createProfile(
  userId: string,
  dto: CreateProfileDto,
): Promise<UserResponseDto> {
  const user = await repositories.users.create({
    userId,
    username: dto.username,
    displayName: dto.displayName,
  });
  return toUserResponse(user);
}

export async function getMe(userId: string): Promise<UserResponseDto> {
  const user = await repositories.users.findById(userId);
  if (!user) throw new NotFoundError("User", userId);
  return toUserResponse(user);
}

/**
 * Updates the caller's profile fields. Requires a `UserProfile` row to
 * already exist (thrown as `NotFoundError` if not) — see `createProfile`
 * above for creating the initial one, which now happens at sign-up time.
 */
export async function updateMe(userId: string, dto: UpdateMeDto): Promise<UserResponseDto> {
  const user = await repositories.users.update(userId, dto);
  return toUserResponse(user);
}

/**
 * Resolves a username or email to a user, for "start a conversation with
 * ___" flows where the caller only has a human-typed handle, not a user
 * id. Tries username first (the more common case for an in-app "add
 * someone" flow), then falls back to treating the handle as an email.
 */
export async function lookupUser(handle: string): Promise<UserResponseDto> {
  const byUsername = await repositories.users.findByUsername(handle);
  const user = byUsername ?? (await repositories.users.findByEmail(handle));
  if (!user) throw new NotFoundError("User", handle);
  return toUserResponse(user);
}
