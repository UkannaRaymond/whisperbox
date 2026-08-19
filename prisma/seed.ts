/**
 * Development-only seed script.
 * DATABASE.md: "Seed only development data."
 *
 * Run with: pnpm db:seed
 *
 * Rewritten against the current schema — the previous version of this
 * file predated the Better Auth migration and referenced fields/models
 * that no longer exist (a flat `username`/`passwordHash`/`role` on
 * `User`, a `userDevice` model, `message.ciphertext`, `notification.data`,
 * etc. — see the same class of bug fixed in repositories/prisma/
 * user.repository.ts and notification.repository.ts). It would have
 * failed immediately if run.
 *
 * Users are created through Better Auth's own `signUpEmail` API rather
 * than a raw `prisma.user.create` with a fake password hash — Better
 * Auth owns credential storage (its own `Account` row, hashed
 * separately), so a directly-inserted `User` row has no usable password
 * and can't actually log in. This script creates real, working
 * credentials so you can log in as any seeded user in the dev app.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { auth } from "../lib/auth";

const prisma = new PrismaClient();

const SEED_PASSWORD = "whisperbox-dev-pw!";

async function upsertAuthUser(email: string, name: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;

  const result = await auth.api.signUpEmail({
    body: { email, password: SEED_PASSWORD, name },
  });
  return prisma.user.findUniqueOrThrow({ where: { id: result.user.id } });
}

async function main() {
  console.log("Seeding WhisperBox development data...");
  console.log(`All seeded users share the password: ${SEED_PASSWORD}`);

  // --- Users (Better Auth) + profiles ---------------------------------------
  const alice = await upsertAuthUser("alice@example.com", "Alice Adeyemi");
  const bob = await upsertAuthUser("bob@example.com", "Bob Chukwu");
  const carol = await upsertAuthUser("carol@example.com", "Carol Nwosu");
  const admin = await upsertAuthUser("admin@example.com", "WhisperBox Admin");

  const aliceProfile = await prisma.userProfile.upsert({
    where: { userId: alice.id },
    update: {},
    create: {
      userId: alice.id,
      username: "alice",
      displayName: "Alice Adeyemi",
      status: "OFFLINE",
    },
  });
  const bobProfile = await prisma.userProfile.upsert({
    where: { userId: bob.id },
    update: {},
    create: { userId: bob.id, username: "bob", displayName: "Bob Chukwu", status: "OFFLINE" },
  });
  const carolProfile = await prisma.userProfile.upsert({
    where: { userId: carol.id },
    update: {},
    create: { userId: carol.id, username: "carol", displayName: "Carol Nwosu", status: "OFFLINE" },
  });
  await prisma.userProfile.upsert({
    where: { userId: admin.id },
    update: {},
    create: {
      userId: admin.id,
      username: "admin",
      displayName: "WhisperBox Admin",
      status: "OFFLINE",
    },
  });
  void aliceProfile;
  void bobProfile;
  void carolProfile;

  // --- Devices ---------------------------------------------------------------
  const aliceDevice = await prisma.device.upsert({
    where: { deviceIdentifier: "dev-device-alice-macbook" },
    update: {},
    create: {
      userId: alice.id,
      name: "Alice's MacBook",
      platform: "MACOS",
      devicePublicKey: "dev-device-key-alice-macbook",
      fingerprint: "dev-fingerprint-alice-macbook",
      deviceIdentifier: "dev-device-alice-macbook",
      trusted: true,
    },
  });

  const bobDevice = await prisma.device.upsert({
    where: { deviceIdentifier: "dev-device-bob-iphone" },
    update: {},
    create: {
      userId: bob.id,
      name: "Bob's iPhone",
      platform: "IOS",
      devicePublicKey: "dev-device-key-bob-iphone",
      fingerprint: "dev-fingerprint-bob-iphone",
      deviceIdentifier: "dev-device-bob-iphone",
      trusted: true,
    },
  });

  await prisma.device.upsert({
    where: { deviceIdentifier: "dev-device-carol-chrome" },
    update: {},
    create: {
      userId: carol.id,
      name: "Carol's Chrome",
      platform: "WEB",
      devicePublicKey: "dev-device-key-carol-chrome",
      fingerprint: "dev-fingerprint-carol-chrome",
      deviceIdentifier: "dev-device-carol-chrome",
      trusted: true,
    },
  });

  // --- Contacts (mutual, accepted) + one pending request ---------------------
  await prisma.contact.upsert({
    where: { ownerId_contactId: { ownerId: alice.id, contactId: bob.id } },
    update: {},
    create: { ownerId: alice.id, contactId: bob.id },
  });
  await prisma.contact.upsert({
    where: { ownerId_contactId: { ownerId: bob.id, contactId: alice.id } },
    update: {},
    create: { ownerId: bob.id, contactId: alice.id },
  });
  await prisma.contactRequest.upsert({
    where: { senderId_receiverId: { senderId: alice.id, receiverId: carol.id } },
    update: {},
    create: { senderId: alice.id, receiverId: carol.id },
  });

  // --- Direct conversation (Alice <-> Bob) -----------------------------------
  const directConversation = await prisma.conversation.create({
    data: {
      type: "DIRECT",
      createdById: alice.id,
      members: {
        create: [
          { userId: alice.id, role: "OWNER" },
          { userId: bob.id, role: "MEMBER" },
        ],
      },
    },
  });

  const directMessage = await prisma.message.create({
    data: {
      conversationId: directConversation.id,
      senderId: alice.id,
      clientMessageId: "dev-client-msg-hello-bob",
      type: "TEXT",
      encryptedContent: "dev-ciphertext-hello-bob",
      nonce: "dev-nonce-hello-bob",
      status: "DELIVERED",
      sequenceNumber: 1n,
      encryptedKeys: {
        create: [
          { recipientId: alice.id, encryptedKey: "dev-wrapped-key-for-alice" },
          { recipientId: bob.id, encryptedKey: "dev-wrapped-key-for-bob" },
        ],
      },
    },
  });

  // --- Group conversation (Alice, Bob, Carol) --------------------------------
  const groupConversation = await prisma.conversation.create({
    data: {
      type: "GROUP",
      name: "Project Falcon",
      description: "Coordination channel for Project Falcon",
      createdById: alice.id,
      members: {
        create: [
          { userId: alice.id, role: "OWNER" },
          { userId: bob.id, role: "ADMIN" },
          { userId: carol.id, role: "MEMBER" },
        ],
      },
    },
  });

  const groupMessage = await prisma.message.create({
    data: {
      conversationId: groupConversation.id,
      senderId: bob.id,
      clientMessageId: "dev-client-msg-group-kickoff",
      type: "TEXT",
      encryptedContent: "dev-ciphertext-group-kickoff",
      nonce: "dev-nonce-group-kickoff",
      status: "DELIVERED",
      sequenceNumber: 1n,
      encryptedKeys: {
        create: [
          { recipientId: alice.id, encryptedKey: "dev-wrapped-key-group-alice" },
          { recipientId: bob.id, encryptedKey: "dev-wrapped-key-group-bob" },
          { recipientId: carol.id, encryptedKey: "dev-wrapped-key-group-carol" },
        ],
      },
    },
  });

  await prisma.attachment.create({
    data: {
      messageId: groupMessage.id,
      uploadedById: bob.id,
      type: "DOCUMENT",
      fileName: "kickoff-deck.pdf.enc",
      originalFileName: "kickoff-deck.pdf",
      mimeType: "application/pdf",
      size: 245_000n,
      storageKey: "dev/kickoff-deck.pdf.enc",
      encryptedKey: "dev-wrapped-attachment-key",
      nonce: "dev-nonce-attachment",
      checksum: "dev-checksum-kickoff-deck",
    },
  });

  // --- Notifications -----------------------------------------------------
  await prisma.notification.create({
    data: {
      userId: bob.id,
      type: "MESSAGE",
      title: "New message from Alice",
      body: "You have a new encrypted message.",
      payload: { conversationId: directConversation.id, messageId: directMessage.id },
    },
  });

  await prisma.notification.create({
    data: {
      userId: carol.id,
      type: "GROUP",
      title: "Added to Project Falcon",
      body: "Alice added you to a new group.",
      payload: { conversationId: groupConversation.id },
    },
  });

  console.log("Seed complete:");
  console.log({
    users: ["alice@example.com", "bob@example.com", "carol@example.com", "admin@example.com"],
    password: SEED_PASSWORD,
    conversations: [directConversation.id, groupConversation.id],
    devices: [aliceDevice.id, bobDevice.id],
  });
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
