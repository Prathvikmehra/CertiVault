/**
 * Email Job Queue
 * Defines the BullMQ queue and all typed job payloads for email sending.
 */

import { Queue } from "bullmq";
import { redis } from "../config/redis.js";
import { createModuleLogger } from "../common/utils/logger.js";

const log = createModuleLogger("email-queue");

// ─── Job payload types ────────────────────────────────────────────────────────

export interface WelcomeEmailJobData {
  type: "welcome-email";
  email: string;
  name: string;
}

export interface EmailVerificationJobData {
  type: "email-verification";
  email: string;
  name: string;
  verificationToken: string;
}

export interface PasswordResetJobData {
  type: "password-reset";
  email: string;
  name: string;
  resetToken: string;
}

export interface DocumentSharedJobData {
  type: "document-shared";
  /** Recipient email */
  email: string;
  /** Recipient name (or "there" if unknown) */
  recipientName: string;
  /** Vault owner's display name */
  ownerName: string;
  /** Role granted */
  role: "viewer" | "editor";
  /** Invite accept URL */
  inviteUrl: string;
}

export interface DocumentVerifiedJobData {
  type: "document-verified";
  email: string;
  name: string;
  documentTitle: string;
  /** "verified" | "rejected" */
  status: "verified" | "rejected";
  documentId: string;
  dashboardUrl: string;
}

export interface ExpiryReminderJobData {
  type: "expiry-reminder";
  email: string;
  name: string;
  documentTitle: string;
  expiresAt: string; // ISO date string
  documentId: string;
  dashboardUrl: string;
}

export type EmailJobData =
  | WelcomeEmailJobData
  | EmailVerificationJobData
  | PasswordResetJobData
  | DocumentSharedJobData
  | DocumentVerifiedJobData
  | ExpiryReminderJobData;

// ─── Queue instance ───────────────────────────────────────────────────────────

export const EMAIL_QUEUE_NAME = "email";

export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000, // 2 s → 4 s → 8 s
    },
    removeOnComplete: {
      age: 24 * 3600, // keep completed jobs for 24 h
      count: 500,
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // keep failed jobs for 7 days for inspection
    },
  },
});

emailQueue.on("error", (err: Error) => {
  log.error("Email queue error", { error: err.message });
});

// ─── Typed job adder helpers ──────────────────────────────────────────────────

export async function queueWelcomeEmail(
  data: Omit<WelcomeEmailJobData, "type">
): Promise<void> {
  await emailQueue.add("welcome-email", { type: "welcome-email", ...data });
  log.info("Queued welcome-email", { email: data.email });
}

export async function queueEmailVerification(
  data: Omit<EmailVerificationJobData, "type">
): Promise<void> {
  await emailQueue.add("email-verification", {
    type: "email-verification",
    ...data,
  });
  log.info("Queued email-verification", { email: data.email });
}

export async function queuePasswordReset(
  data: Omit<PasswordResetJobData, "type">
): Promise<void> {
  await emailQueue.add("password-reset", { type: "password-reset", ...data });
  log.info("Queued password-reset", { email: data.email });
}

export async function queueDocumentShared(
  data: Omit<DocumentSharedJobData, "type">
): Promise<void> {
  await emailQueue.add("document-shared", {
    type: "document-shared",
    ...data,
  });
  log.info("Queued document-shared", { email: data.email });
}

export async function queueDocumentVerified(
  data: Omit<DocumentVerifiedJobData, "type">
): Promise<void> {
  await emailQueue.add("document-verified", {
    type: "document-verified",
    ...data,
  });
  log.info("Queued document-verified", { email: data.email });
}

export async function queueExpiryReminder(
  data: Omit<ExpiryReminderJobData, "type">
): Promise<void> {
  await emailQueue.add("expiry-reminder", {
    type: "expiry-reminder",
    ...data,
  });
  log.info("Queued expiry-reminder", { email: data.email });
}
