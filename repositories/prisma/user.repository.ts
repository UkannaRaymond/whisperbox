import type { PrismaClient, User, UserProfile, UserStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";
import type {
  IUserRepository,
  UserWithProfile,
  CreateUserProfileInput,
  UpdateUserProfileInput,
} from "../interfaces/user.repository.interface";
import { NotFoundError, ConflictError } from "../../errors";

/**
 * `User` (Better Auth's own table — id, email, name, image, ...) joined
 * with its 1:1 WhisperBox `UserProfile` (username, displayName, bio,
 * status, ...). See the doc comment on `UserWithProfile` in
 * `../interfaces/user.repository.interface.ts` for why these are two rows
 * instead of one — this was previously a single flat `User` model with
 * fields (`username`, `status`, `passwordHash`, `role`, ...) that don't
 * exist on the current schema at all.
 */
export class UserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<UserWithProfile | null> {
    return this.prisma.user.findUnique({ where: { id }, include: { profile: true } });
  }

  async findMany(params?: { take?: number; cursor?: string }): Promise<UserWithProfile[]> {
    return this.prisma.user.findMany({
      include: { profile: true },
      take: params?.take ?? 50,
      ...(params?.cursor ? { skip: 1, cursor: { id: params.cursor } } : {}),
      orderBy: { createdAt: "asc" },
    });
  }

  /** Creates the WhisperBox `UserProfile` row for an already-existing Better Auth `User`. */
  async create(data: CreateUserProfileInput): Promise<UserWithProfile> {
    const { userId, ...profileFields } = data;
    try {
      await this.prisma.userProfile.create({ data: { userId, ...profileFields } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        const target = (err.meta?.target as string[] | undefined) ?? [];
        if (target.includes("username")) {
          throw new ConflictError(`Username "${data.username}" is already taken`);
        }
        throw new ConflictError("A profile already exists for this account");
      }
      throw err;
    }
    return this.getOrThrow(userId);
  }

  /** Updates the caller's profile fields. Throws `NotFoundError` if no `UserProfile` row exists yet. */
  async update(id: string, data: UpdateUserProfileInput): Promise<UserWithProfile> {
    await this.assertHasProfile(id);
    await this.prisma.userProfile.update({ where: { userId: id }, data });
    return this.getOrThrow(id);
  }

  /** Soft delete — sets `UserProfile.deletedAt` (the `User`/auth row itself is untouched). */
  async softDelete(id: string): Promise<UserWithProfile> {
    await this.assertHasProfile(id);
    await this.prisma.userProfile.update({
      where: { userId: id },
      data: { deletedAt: new Date() },
    });
    return this.getOrThrow(id);
  }

  /** Permanently removes the `User` row (cascades to `UserProfile` and everything else owned by it). */
  async hardDelete(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }

  async findByEmail(email: string): Promise<UserWithProfile | null> {
    return this.prisma.user.findUnique({ where: { email }, include: { profile: true } });
  }

  async findByUsername(username: string): Promise<UserWithProfile | null> {
    const profile = await this.prisma.userProfile.findUnique({
      where: { username },
      include: { user: true },
    });
    if (!profile) return null;
    return this.toUserWithProfile(profile);
  }

  /** Case-insensitive partial match on username/displayName, restricted to profiles marked searchable. */
  async search(
    query: string,
    params?: { take?: number; excludeUserId?: string },
  ): Promise<UserWithProfile[]> {
    return this.prisma.user.findMany({
      where: {
        ...(params?.excludeUserId ? { id: { not: params.excludeUserId } } : {}),
        profile: {
          searchable: true,
          deletedAt: null,
          OR: [
            { username: { contains: query, mode: "insensitive" } },
            { displayName: { contains: query, mode: "insensitive" } },
          ],
        },
      },
      include: { profile: true },
      take: params?.take ?? 20,
    });
  }

  async updatePresence(id: string, status: UserStatus): Promise<UserWithProfile> {
    await this.assertHasProfile(id);
    await this.prisma.userProfile.update({
      where: { userId: id },
      data: { status, lastSeenAt: new Date() },
    });
    return this.getOrThrow(id);
  }

  private async getOrThrow(id: string): Promise<UserWithProfile> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundError("User", id);
    return user;
  }

  private async assertHasProfile(id: string): Promise<void> {
    const exists = await this.prisma.userProfile.findUnique({
      where: { userId: id },
      select: { userId: true },
    });
    if (!exists) throw new NotFoundError("UserProfile", id);
  }

  private toUserWithProfile(profile: UserProfile & { user: User }): UserWithProfile {
    const { user, ...rest } = profile;
    return { ...user, profile: rest as UserProfile };
  }
}
