/*
  Warnings:

  - The primary key for the `attachments` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `created_at` on the `attachments` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_at` on the `attachments` table. All the data in the column will be lost.
  - You are about to drop the column `file_name` on the `attachments` table. All the data in the column will be lost.
  - You are about to drop the column `message_id` on the `attachments` table. All the data in the column will be lost.
  - You are about to drop the column `mime_type` on the `attachments` table. All the data in the column will be lost.
  - You are about to drop the column `thumbnail_url` on the `attachments` table. All the data in the column will be lost.
  - You are about to drop the column `url` on the `attachments` table. All the data in the column will be lost.
  - The primary key for the `contacts` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `contact_id` on the `contacts` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `contacts` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_at` on the `contacts` table. All the data in the column will be lost.
  - You are about to drop the column `is_blocked` on the `contacts` table. All the data in the column will be lost.
  - You are about to drop the column `is_favorite` on the `contacts` table. All the data in the column will be lost.
  - You are about to drop the column `owner_id` on the `contacts` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `contacts` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `contacts` table. All the data in the column will be lost.
  - The primary key for the `conversation_members` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `conversation_id` on the `conversation_members` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `conversation_members` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_at` on the `conversation_members` table. All the data in the column will be lost.
  - You are about to drop the column `is_muted` on the `conversation_members` table. All the data in the column will be lost.
  - You are about to drop the column `joined_at` on the `conversation_members` table. All the data in the column will be lost.
  - You are about to drop the column `last_read_message_id` on the `conversation_members` table. All the data in the column will be lost.
  - You are about to drop the column `left_at` on the `conversation_members` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `conversation_members` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `conversation_members` table. All the data in the column will be lost.
  - The `role` column on the `conversation_members` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `conversations` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `avatar_url` on the `conversations` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `conversations` table. All the data in the column will be lost.
  - You are about to drop the column `created_by_id` on the `conversations` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_at` on the `conversations` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `conversations` table. All the data in the column will be lost.
  - The primary key for the `encrypted_message_keys` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `created_at` on the `encrypted_message_keys` table. All the data in the column will be lost.
  - You are about to drop the column `encrypted_key` on the `encrypted_message_keys` table. All the data in the column will be lost.
  - You are about to drop the column `message_id` on the `encrypted_message_keys` table. All the data in the column will be lost.
  - You are about to drop the column `recipient_device_id` on the `encrypted_message_keys` table. All the data in the column will be lost.
  - The primary key for the `messages` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `ciphertext` on the `messages` table. All the data in the column will be lost.
  - You are about to drop the column `conversation_id` on the `messages` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `messages` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_at` on the `messages` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_for_everyone` on the `messages` table. All the data in the column will be lost.
  - You are about to drop the column `edited_at` on the `messages` table. All the data in the column will be lost.
  - You are about to drop the column `is_edited` on the `messages` table. All the data in the column will be lost.
  - You are about to drop the column `is_pinned` on the `messages` table. All the data in the column will be lost.
  - You are about to drop the column `reply_to_id` on the `messages` table. All the data in the column will be lost.
  - You are about to drop the column `sender_id` on the `messages` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `messages` table. All the data in the column will be lost.
  - The `type` column on the `messages` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `notifications` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `created_at` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `data` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_at` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `is_read` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `read_at` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `notifications` table. All the data in the column will be lost.
  - The primary key for the `sessions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `created_at` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_at` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `device_id` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `expires_at` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `ip_address` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `revoked_at` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `token_hash` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `user_agent` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `sessions` table. All the data in the column will be lost.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `avatar_url` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `bio` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_at` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `display_name` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `failed_login_attempts` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `last_seen_at` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `locked_until` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `password_hash` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `public_key` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `username` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `refresh_tokens` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_devices` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[ownerId,contactId]` on the table `contacts` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[conversationId,userId]` on the table `conversation_members` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[messageId,recipientId]` on the table `encrypted_message_keys` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[clientMessageId]` on the table `messages` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[token]` on the table `sessions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `encryptedKey` to the `attachments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fileName` to the `attachments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `messageId` to the `attachments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mimeType` to the `attachments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nonce` to the `attachments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `storageKey` to the `attachments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `attachments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `uploadedById` to the `attachments` table without a default value. This is not possible if the table is not empty.
  - Made the column `checksum` on table `attachments` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `contactId` to the `contacts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ownerId` to the `contacts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `contacts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `conversationId` to the `conversation_members` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `conversation_members` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `conversation_members` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdById` to the `conversations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `conversations` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `type` on the `conversations` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `encryptedKey` to the `encrypted_message_keys` table without a default value. This is not possible if the table is not empty.
  - Added the required column `messageId` to the `encrypted_message_keys` table without a default value. This is not possible if the table is not empty.
  - Added the required column `recipientId` to the `encrypted_message_keys` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientMessageId` to the `messages` table without a default value. This is not possible if the table is not empty.
  - Added the required column `conversationId` to the `messages` table without a default value. This is not possible if the table is not empty.
  - Added the required column `encryptedContent` to the `messages` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nonce` to the `messages` table without a default value. This is not possible if the table is not empty.
  - Added the required column `senderId` to the `messages` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sequenceNumber` to the `messages` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `messages` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `notifications` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `type` on the `notifications` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `expiresAt` to the `sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `token` to the `sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ONLINE', 'AWAY', 'BUSY', 'INVISIBLE', 'OFFLINE');

-- CreateEnum
CREATE TYPE "ConversationType" AS ENUM ('DIRECT', 'GROUP');

-- CreateEnum
CREATE TYPE "ConversationVisibility" AS ENUM ('PRIVATE', 'PUBLIC');

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('OWNER', 'ADMIN', 'MODERATOR', 'MEMBER');

-- CreateEnum
CREATE TYPE "DevicePlatform" AS ENUM ('WINDOWS', 'MACOS', 'LINUX', 'ANDROID', 'IOS', 'WEB');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'FILE', 'LOCATION', 'CONTACT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('SENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateEnum
CREATE TYPE "AttachmentType" AS ENUM ('IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'ARCHIVE', 'OTHER');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('MESSAGE', 'GROUP', 'INVITATION', 'SECURITY', 'SYSTEM');

-- DropForeignKey
ALTER TABLE "attachments" DROP CONSTRAINT "attachments_message_id_fkey";

-- DropForeignKey
ALTER TABLE "contacts" DROP CONSTRAINT "contacts_contact_id_fkey";

-- DropForeignKey
ALTER TABLE "contacts" DROP CONSTRAINT "contacts_owner_id_fkey";

-- DropForeignKey
ALTER TABLE "conversation_members" DROP CONSTRAINT "conversation_members_conversation_id_fkey";

-- DropForeignKey
ALTER TABLE "conversation_members" DROP CONSTRAINT "conversation_members_user_id_fkey";

-- DropForeignKey
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "encrypted_message_keys" DROP CONSTRAINT "encrypted_message_keys_message_id_fkey";

-- DropForeignKey
ALTER TABLE "encrypted_message_keys" DROP CONSTRAINT "encrypted_message_keys_recipient_device_id_fkey";

-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "messages_conversation_id_fkey";

-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "messages_reply_to_id_fkey";

-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "messages_sender_id_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_user_id_fkey";

-- DropForeignKey
ALTER TABLE "refresh_tokens" DROP CONSTRAINT "refresh_tokens_session_id_fkey";

-- DropForeignKey
ALTER TABLE "refresh_tokens" DROP CONSTRAINT "refresh_tokens_user_id_fkey";

-- DropForeignKey
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_device_id_fkey";

-- DropForeignKey
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_user_id_fkey";

-- DropForeignKey
ALTER TABLE "user_devices" DROP CONSTRAINT "user_devices_user_id_fkey";

-- DropIndex
DROP INDEX "attachments_message_id_idx";

-- DropIndex
DROP INDEX "contacts_contact_id_idx";

-- DropIndex
DROP INDEX "contacts_owner_id_contact_id_key";

-- DropIndex
DROP INDEX "contacts_owner_id_idx";

-- DropIndex
DROP INDEX "conversation_members_conversation_id_idx";

-- DropIndex
DROP INDEX "conversation_members_conversation_id_user_id_key";

-- DropIndex
DROP INDEX "conversation_members_user_id_idx";

-- DropIndex
DROP INDEX "conversations_created_by_id_idx";

-- DropIndex
DROP INDEX "encrypted_message_keys_message_id_idx";

-- DropIndex
DROP INDEX "encrypted_message_keys_message_id_recipient_device_id_key";

-- DropIndex
DROP INDEX "encrypted_message_keys_recipient_device_id_idx";

-- DropIndex
DROP INDEX "messages_conversation_id_created_at_idx";

-- DropIndex
DROP INDEX "messages_conversation_id_idx";

-- DropIndex
DROP INDEX "messages_created_at_idx";

-- DropIndex
DROP INDEX "messages_sender_id_idx";

-- DropIndex
DROP INDEX "notifications_user_id_idx";

-- DropIndex
DROP INDEX "notifications_user_id_is_read_idx";

-- DropIndex
DROP INDEX "sessions_device_id_idx";

-- DropIndex
DROP INDEX "sessions_expires_at_idx";

-- DropIndex
DROP INDEX "sessions_user_id_idx";

-- DropIndex
DROP INDEX "users_email_idx";

-- DropIndex
DROP INDEX "users_username_idx";

-- DropIndex
DROP INDEX "users_username_key";

-- AlterTable
ALTER TABLE "attachments" DROP CONSTRAINT "attachments_pkey",
DROP COLUMN "created_at",
DROP COLUMN "deleted_at",
DROP COLUMN "file_name",
DROP COLUMN "message_id",
DROP COLUMN "mime_type",
DROP COLUMN "thumbnail_url",
DROP COLUMN "url",
ADD COLUMN     "deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "downloadCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "duration" INTEGER,
ADD COLUMN     "encryptedKey" TEXT NOT NULL,
ADD COLUMN     "extension" TEXT,
ADD COLUMN     "fileName" TEXT NOT NULL,
ADD COLUMN     "height" INTEGER,
ADD COLUMN     "messageId" TEXT NOT NULL,
ADD COLUMN     "mimeType" TEXT NOT NULL,
ADD COLUMN     "nonce" TEXT NOT NULL,
ADD COLUMN     "originalFileName" TEXT,
ADD COLUMN     "previewKey" TEXT,
ADD COLUMN     "storageKey" TEXT NOT NULL,
ADD COLUMN     "thumbnailKey" TEXT,
ADD COLUMN     "type" "AttachmentType" NOT NULL,
ADD COLUMN     "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "uploadedById" TEXT NOT NULL,
ADD COLUMN     "width" INTEGER,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "size" SET DATA TYPE BIGINT,
ALTER COLUMN "checksum" SET NOT NULL,
ADD CONSTRAINT "attachments_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "contacts" DROP CONSTRAINT "contacts_pkey",
DROP COLUMN "contact_id",
DROP COLUMN "created_at",
DROP COLUMN "deleted_at",
DROP COLUMN "is_blocked",
DROP COLUMN "is_favorite",
DROP COLUMN "owner_id",
DROP COLUMN "status",
DROP COLUMN "updated_at",
ADD COLUMN     "blocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "blockedAt" TIMESTAMP(3),
ADD COLUMN     "contactId" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "favorite" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "ownerId" TEXT NOT NULL,
ADD COLUMN     "pinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "contacts_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "conversation_members" DROP CONSTRAINT "conversation_members_pkey",
DROP COLUMN "conversation_id",
DROP COLUMN "created_at",
DROP COLUMN "deleted_at",
DROP COLUMN "is_muted",
DROP COLUMN "joined_at",
DROP COLUMN "last_read_message_id",
DROP COLUMN "left_at",
DROP COLUMN "updated_at",
DROP COLUMN "user_id",
ADD COLUMN     "archived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "conversationId" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "joinedById" TEXT,
ADD COLUMN     "lastReadMessageId" TEXT,
ADD COLUMN     "leftAt" TIMESTAMP(3),
ADD COLUMN     "muted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nickname" TEXT,
ADD COLUMN     "notificationMutedUntil" TIMESTAMP(3),
ADD COLUMN     "pinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
DROP COLUMN "role",
ADD COLUMN     "role" "MemberRole" NOT NULL DEFAULT 'MEMBER',
ADD CONSTRAINT "conversation_members_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_pkey",
DROP COLUMN "avatar_url",
DROP COLUMN "created_at",
DROP COLUMN "created_by_id",
DROP COLUMN "deleted_at",
DROP COLUMN "updated_at",
ADD COLUMN     "archived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "avatar" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "createdById" TEXT NOT NULL,
ADD COLUMN     "deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "encryptedMetadata" JSONB,
ADD COLUMN     "lastMessageId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "visibility" "ConversationVisibility" NOT NULL DEFAULT 'PRIVATE',
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
DROP COLUMN "type",
ADD COLUMN     "type" "ConversationType" NOT NULL,
ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "encrypted_message_keys" DROP CONSTRAINT "encrypted_message_keys_pkey",
DROP COLUMN "created_at",
DROP COLUMN "encrypted_key",
DROP COLUMN "message_id",
DROP COLUMN "recipient_device_id",
ADD COLUMN     "algorithm" TEXT NOT NULL DEFAULT 'X25519',
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "encryptedKey" TEXT NOT NULL,
ADD COLUMN     "messageId" TEXT NOT NULL,
ADD COLUMN     "recipientId" TEXT NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "encrypted_message_keys_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "messages" DROP CONSTRAINT "messages_pkey",
DROP COLUMN "ciphertext",
DROP COLUMN "conversation_id",
DROP COLUMN "created_at",
DROP COLUMN "deleted_at",
DROP COLUMN "deleted_for_everyone",
DROP COLUMN "edited_at",
DROP COLUMN "is_edited",
DROP COLUMN "is_pinned",
DROP COLUMN "reply_to_id",
DROP COLUMN "sender_id",
DROP COLUMN "updated_at",
ADD COLUMN     "clientMessageId" TEXT NOT NULL,
ADD COLUMN     "conversationId" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "edited" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "editedAt" TIMESTAMP(3),
ADD COLUMN     "encryptedContent" TEXT NOT NULL,
ADD COLUMN     "encryptionVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "ephemeral" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "forwarded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "forwardedFromMessageId" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "nonce" TEXT NOT NULL,
ADD COLUMN     "pinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pinnedAt" TIMESTAMP(3),
ADD COLUMN     "replyToMessageId" TEXT,
ADD COLUMN     "senderId" TEXT NOT NULL,
ADD COLUMN     "sequenceNumber" BIGINT NOT NULL,
ADD COLUMN     "serverReceivedAt" TIMESTAMP(3),
ADD COLUMN     "status" "MessageStatus" NOT NULL DEFAULT 'SENDING',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
DROP COLUMN "type",
ADD COLUMN     "type" "MessageType" NOT NULL DEFAULT 'TEXT',
ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_pkey",
DROP COLUMN "created_at",
DROP COLUMN "data",
DROP COLUMN "deleted_at",
DROP COLUMN "is_read",
DROP COLUMN "read_at",
DROP COLUMN "user_id",
ADD COLUMN     "actionUrl" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "dismissed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dismissedAt" TIMESTAMP(3),
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "payload" JSONB,
ADD COLUMN     "read" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "readAt" TIMESTAMP(3),
ADD COLUMN     "userId" TEXT NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
DROP COLUMN "type",
ADD COLUMN     "type" "NotificationType" NOT NULL,
ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_pkey",
DROP COLUMN "created_at",
DROP COLUMN "deleted_at",
DROP COLUMN "device_id",
DROP COLUMN "expires_at",
DROP COLUMN "ip_address",
DROP COLUMN "revoked_at",
DROP COLUMN "token_hash",
DROP COLUMN "updated_at",
DROP COLUMN "user_agent",
DROP COLUMN "user_id",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "expiresAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "token" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "userAgent" TEXT,
ADD COLUMN     "userId" TEXT NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "sessions_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "users" DROP CONSTRAINT "users_pkey",
DROP COLUMN "avatar_url",
DROP COLUMN "bio",
DROP COLUMN "created_at",
DROP COLUMN "deleted_at",
DROP COLUMN "display_name",
DROP COLUMN "failed_login_attempts",
DROP COLUMN "last_seen_at",
DROP COLUMN "locked_until",
DROP COLUMN "password_hash",
DROP COLUMN "public_key",
DROP COLUMN "role",
DROP COLUMN "status",
DROP COLUMN "updated_at",
DROP COLUMN "username",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "image" TEXT,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");

-- DropTable
DROP TABLE "refresh_tokens";

-- DropTable
DROP TABLE "user_devices";

-- DropEnum
DROP TYPE "contact_status";

-- DropEnum
DROP TYPE "conversation_role";

-- DropEnum
DROP TYPE "conversation_type";

-- DropEnum
DROP TYPE "device_type";

-- DropEnum
DROP TYPE "message_type";

-- DropEnum
DROP TYPE "notification_type";

-- DropEnum
DROP TYPE "presence_status";

-- DropEnum
DROP TYPE "user_role";

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verifications" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "displayName" TEXT,
    "bio" TEXT,
    "avatarUrl" TEXT,
    "bannerUrl" TEXT,
    "website" TEXT,
    "country" TEXT,
    "timezone" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "status" "UserStatus" NOT NULL DEFAULT 'OFFLINE',
    "lastSeenAt" TIMESTAMP(3),
    "profilePublic" BOOLEAN NOT NULL DEFAULT true,
    "searchable" BOOLEAN NOT NULL DEFAULT true,
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'system',
    "language" TEXT NOT NULL DEFAULT 'en',
    "fontScale" INTEGER NOT NULL DEFAULT 100,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "desktopNotifications" BOOLEAN NOT NULL DEFAULT true,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT false,
    "soundEnabled" BOOLEAN NOT NULL DEFAULT true,
    "typingIndicators" BOOLEAN NOT NULL DEFAULT true,
    "readReceipts" BOOLEAN NOT NULL DEFAULT true,
    "linkPreviews" BOOLEAN NOT NULL DEFAULT true,
    "autoDownloadImages" BOOLEAN NOT NULL DEFAULT false,
    "autoDownloadVideos" BOOLEAN NOT NULL DEFAULT false,
    "autoDownloadDocuments" BOOLEAN NOT NULL DEFAULT false,
    "disappearingMessagesDefault" INTEGER,
    "biometricEnabled" BOOLEAN NOT NULL DEFAULT false,
    "sessionTimeoutMinutes" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platform" "DevicePlatform" NOT NULL,
    "devicePublicKey" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "deviceIdentifier" TEXT NOT NULL,
    "appVersion" TEXT,
    "osVersion" TEXT,
    "trusted" BOOLEAN NOT NULL DEFAULT false,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3),
    "lastIPAddress" TEXT,
    "lastUserAgent" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_key_bundles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "identityKeyId" TEXT NOT NULL,
    "currentSignedPreKeyId" TEXT,
    "protocolVersion" INTEGER NOT NULL DEFAULT 1,
    "algorithm" TEXT NOT NULL DEFAULT 'X25519',
    "fingerprint" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastRotationAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_key_bundles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity_keys" (
    "id" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "encryptedPrivateKey" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL DEFAULT 'X25519',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "identity_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signed_pre_keys" (
    "id" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "keyId" INTEGER NOT NULL,
    "publicKey" TEXT NOT NULL,
    "encryptedPrivateKey" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL DEFAULT 'X25519',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "signed_pre_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "one_time_pre_keys" (
    "id" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "keyId" INTEGER NOT NULL,
    "publicKey" TEXT NOT NULL,
    "encryptedPrivateKey" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL DEFAULT 'X25519',
    "consumed" BOOLEAN NOT NULL DEFAULT false,
    "consumedAt" TIMESTAMP(3),
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "one_time_pre_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_receipts" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_reactions" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_requests" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "message" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_invitations" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "inviteeId" TEXT NOT NULL,
    "message" TEXT,
    "expiresAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_join_requests" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "message" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_join_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_blocks" (
    "id" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_mentions" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "mentionedUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_mentions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_edits" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "encryptedContent" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "editedById" TEXT NOT NULL,
    "editedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_edits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pinned_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "pinnedById" TEXT NOT NULL,
    "pinnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pinned_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_providerId_accountId_key" ON "accounts"("providerId", "accountId");

-- CreateIndex
CREATE INDEX "verifications_identifier_idx" ON "verifications"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_userId_key" ON "user_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_username_key" ON "user_profiles"("username");

-- CreateIndex
CREATE INDEX "user_profiles_username_idx" ON "user_profiles"("username");

-- CreateIndex
CREATE INDEX "user_profiles_status_idx" ON "user_profiles"("status");

-- CreateIndex
CREATE INDEX "user_profiles_searchable_idx" ON "user_profiles"("searchable");

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_userId_key" ON "user_settings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "devices_fingerprint_key" ON "devices"("fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "devices_deviceIdentifier_key" ON "devices"("deviceIdentifier");

-- CreateIndex
CREATE INDEX "devices_userId_idx" ON "devices"("userId");

-- CreateIndex
CREATE INDEX "devices_trusted_idx" ON "devices"("trusted");

-- CreateIndex
CREATE INDEX "devices_revoked_idx" ON "devices"("revoked");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs"("entity");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_key_bundles_userId_key" ON "user_key_bundles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_key_bundles_identityKeyId_key" ON "user_key_bundles"("identityKeyId");

-- CreateIndex
CREATE UNIQUE INDEX "user_key_bundles_currentSignedPreKeyId_key" ON "user_key_bundles"("currentSignedPreKeyId");

-- CreateIndex
CREATE UNIQUE INDEX "user_key_bundles_fingerprint_key" ON "user_key_bundles"("fingerprint");

-- CreateIndex
CREATE INDEX "user_key_bundles_userId_idx" ON "user_key_bundles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "identity_keys_fingerprint_key" ON "identity_keys"("fingerprint");

-- CreateIndex
CREATE INDEX "signed_pre_keys_bundleId_idx" ON "signed_pre_keys"("bundleId");

-- CreateIndex
CREATE INDEX "signed_pre_keys_active_idx" ON "signed_pre_keys"("active");

-- CreateIndex
CREATE INDEX "signed_pre_keys_published_idx" ON "signed_pre_keys"("published");

-- CreateIndex
CREATE UNIQUE INDEX "signed_pre_keys_bundleId_keyId_key" ON "signed_pre_keys"("bundleId", "keyId");

-- CreateIndex
CREATE INDEX "one_time_pre_keys_bundleId_idx" ON "one_time_pre_keys"("bundleId");

-- CreateIndex
CREATE INDEX "one_time_pre_keys_consumed_idx" ON "one_time_pre_keys"("consumed");

-- CreateIndex
CREATE INDEX "one_time_pre_keys_published_idx" ON "one_time_pre_keys"("published");

-- CreateIndex
CREATE UNIQUE INDEX "one_time_pre_keys_bundleId_keyId_key" ON "one_time_pre_keys"("bundleId", "keyId");

-- CreateIndex
CREATE INDEX "message_receipts_messageId_idx" ON "message_receipts"("messageId");

-- CreateIndex
CREATE INDEX "message_receipts_userId_idx" ON "message_receipts"("userId");

-- CreateIndex
CREATE INDEX "message_receipts_readAt_idx" ON "message_receipts"("readAt");

-- CreateIndex
CREATE UNIQUE INDEX "message_receipts_messageId_userId_key" ON "message_receipts"("messageId", "userId");

-- CreateIndex
CREATE INDEX "message_reactions_messageId_idx" ON "message_reactions"("messageId");

-- CreateIndex
CREATE INDEX "message_reactions_userId_idx" ON "message_reactions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "message_reactions_messageId_userId_emoji_key" ON "message_reactions"("messageId", "userId", "emoji");

-- CreateIndex
CREATE INDEX "contact_requests_senderId_idx" ON "contact_requests"("senderId");

-- CreateIndex
CREATE INDEX "contact_requests_receiverId_idx" ON "contact_requests"("receiverId");

-- CreateIndex
CREATE UNIQUE INDEX "contact_requests_senderId_receiverId_key" ON "contact_requests"("senderId", "receiverId");

-- CreateIndex
CREATE INDEX "conversation_invitations_conversationId_idx" ON "conversation_invitations"("conversationId");

-- CreateIndex
CREATE INDEX "conversation_invitations_inviteeId_idx" ON "conversation_invitations"("inviteeId");

-- CreateIndex
CREATE INDEX "conversation_join_requests_conversationId_idx" ON "conversation_join_requests"("conversationId");

-- CreateIndex
CREATE INDEX "conversation_join_requests_requesterId_idx" ON "conversation_join_requests"("requesterId");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_join_requests_conversationId_requesterId_key" ON "conversation_join_requests"("conversationId", "requesterId");

-- CreateIndex
CREATE INDEX "user_blocks_blockerId_idx" ON "user_blocks"("blockerId");

-- CreateIndex
CREATE INDEX "user_blocks_blockedId_idx" ON "user_blocks"("blockedId");

-- CreateIndex
CREATE UNIQUE INDEX "user_blocks_blockerId_blockedId_key" ON "user_blocks"("blockerId", "blockedId");

-- CreateIndex
CREATE INDEX "message_mentions_messageId_idx" ON "message_mentions"("messageId");

-- CreateIndex
CREATE INDEX "message_mentions_mentionedUserId_idx" ON "message_mentions"("mentionedUserId");

-- CreateIndex
CREATE UNIQUE INDEX "message_mentions_messageId_mentionedUserId_key" ON "message_mentions"("messageId", "mentionedUserId");

-- CreateIndex
CREATE INDEX "message_edits_messageId_idx" ON "message_edits"("messageId");

-- CreateIndex
CREATE INDEX "message_edits_editedById_idx" ON "message_edits"("editedById");

-- CreateIndex
CREATE UNIQUE INDEX "pinned_messages_messageId_key" ON "pinned_messages"("messageId");

-- CreateIndex
CREATE INDEX "pinned_messages_conversationId_idx" ON "pinned_messages"("conversationId");

-- CreateIndex
CREATE INDEX "pinned_messages_pinnedById_idx" ON "pinned_messages"("pinnedById");

-- CreateIndex
CREATE INDEX "attachments_messageId_idx" ON "attachments"("messageId");

-- CreateIndex
CREATE INDEX "attachments_uploadedById_idx" ON "attachments"("uploadedById");

-- CreateIndex
CREATE INDEX "attachments_storageKey_idx" ON "attachments"("storageKey");

-- CreateIndex
CREATE INDEX "attachments_deleted_idx" ON "attachments"("deleted");

-- CreateIndex
CREATE INDEX "contacts_ownerId_idx" ON "contacts"("ownerId");

-- CreateIndex
CREATE INDEX "contacts_contactId_idx" ON "contacts"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "contacts_ownerId_contactId_key" ON "contacts"("ownerId", "contactId");

-- CreateIndex
CREATE INDEX "conversation_members_conversationId_idx" ON "conversation_members"("conversationId");

-- CreateIndex
CREATE INDEX "conversation_members_userId_idx" ON "conversation_members"("userId");

-- CreateIndex
CREATE INDEX "conversation_members_role_idx" ON "conversation_members"("role");

-- CreateIndex
CREATE INDEX "conversation_members_lastReadMessageId_idx" ON "conversation_members"("lastReadMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_members_conversationId_userId_key" ON "conversation_members"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "conversations_createdById_idx" ON "conversations"("createdById");

-- CreateIndex
CREATE INDEX "conversations_updatedAt_idx" ON "conversations"("updatedAt");

-- CreateIndex
CREATE INDEX "conversations_type_idx" ON "conversations"("type");

-- CreateIndex
CREATE INDEX "conversations_visibility_idx" ON "conversations"("visibility");

-- CreateIndex
CREATE INDEX "conversations_archived_idx" ON "conversations"("archived");

-- CreateIndex
CREATE INDEX "encrypted_message_keys_messageId_idx" ON "encrypted_message_keys"("messageId");

-- CreateIndex
CREATE INDEX "encrypted_message_keys_recipientId_idx" ON "encrypted_message_keys"("recipientId");

-- CreateIndex
CREATE UNIQUE INDEX "encrypted_message_keys_messageId_recipientId_key" ON "encrypted_message_keys"("messageId", "recipientId");

-- CreateIndex
CREATE UNIQUE INDEX "messages_clientMessageId_key" ON "messages"("clientMessageId");

-- CreateIndex
CREATE INDEX "messages_conversationId_sequenceNumber_idx" ON "messages"("conversationId", "sequenceNumber");

-- CreateIndex
CREATE INDEX "messages_conversationId_createdAt_idx" ON "messages"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "messages_senderId_idx" ON "messages"("senderId");

-- CreateIndex
CREATE INDEX "messages_replyToMessageId_idx" ON "messages"("replyToMessageId");

-- CreateIndex
CREATE INDEX "messages_forwardedFromMessageId_idx" ON "messages"("forwardedFromMessageId");

-- CreateIndex
CREATE INDEX "messages_status_idx" ON "messages"("status");

-- CreateIndex
CREATE INDEX "messages_deleted_idx" ON "messages"("deleted");

-- CreateIndex
CREATE INDEX "messages_expiresAt_idx" ON "messages"("expiresAt");

-- CreateIndex
CREATE INDEX "messages_createdAt_idx" ON "messages"("createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_read_idx" ON "notifications"("read");

-- CreateIndex
CREATE INDEX "notifications_dismissed_idx" ON "notifications"("dismissed");

-- CreateIndex
CREATE INDEX "notifications_expiresAt_idx" ON "notifications"("expiresAt");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_key_bundles" ADD CONSTRAINT "user_key_bundles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_key_bundles" ADD CONSTRAINT "user_key_bundles_identityKeyId_fkey" FOREIGN KEY ("identityKeyId") REFERENCES "identity_keys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_key_bundles" ADD CONSTRAINT "user_key_bundles_currentSignedPreKeyId_fkey" FOREIGN KEY ("currentSignedPreKeyId") REFERENCES "signed_pre_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signed_pre_keys" ADD CONSTRAINT "signed_pre_keys_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "user_key_bundles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "one_time_pre_keys" ADD CONSTRAINT "one_time_pre_keys_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "user_key_bundles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_lastMessageId_fkey" FOREIGN KEY ("lastMessageId") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_members" ADD CONSTRAINT "conversation_members_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_members" ADD CONSTRAINT "conversation_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_members" ADD CONSTRAINT "conversation_members_joinedById_fkey" FOREIGN KEY ("joinedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_members" ADD CONSTRAINT "conversation_members_lastReadMessageId_fkey" FOREIGN KEY ("lastReadMessageId") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_replyToMessageId_fkey" FOREIGN KEY ("replyToMessageId") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_forwardedFromMessageId_fkey" FOREIGN KEY ("forwardedFromMessageId") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encrypted_message_keys" ADD CONSTRAINT "encrypted_message_keys_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encrypted_message_keys" ADD CONSTRAINT "encrypted_message_keys_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_receipts" ADD CONSTRAINT "message_receipts_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_receipts" ADD CONSTRAINT "message_receipts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_requests" ADD CONSTRAINT "contact_requests_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_requests" ADD CONSTRAINT "contact_requests_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_invitations" ADD CONSTRAINT "conversation_invitations_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_invitations" ADD CONSTRAINT "conversation_invitations_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_invitations" ADD CONSTRAINT "conversation_invitations_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_join_requests" ADD CONSTRAINT "conversation_join_requests_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_join_requests" ADD CONSTRAINT "conversation_join_requests_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_mentions" ADD CONSTRAINT "message_mentions_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_mentions" ADD CONSTRAINT "message_mentions_mentionedUserId_fkey" FOREIGN KEY ("mentionedUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_edits" ADD CONSTRAINT "message_edits_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_edits" ADD CONSTRAINT "message_edits_editedById_fkey" FOREIGN KEY ("editedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pinned_messages" ADD CONSTRAINT "pinned_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pinned_messages" ADD CONSTRAINT "pinned_messages_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pinned_messages" ADD CONSTRAINT "pinned_messages_pinnedById_fkey" FOREIGN KEY ("pinnedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
