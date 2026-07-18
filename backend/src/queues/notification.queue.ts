/**
 * Notification Job Queue
 * Defines the BullMQ queue and all typed job payloads for in-app notifications.
 */

import { Queue } from "bullmq";
import { createBullMQConnection } from "../config/redis.js";
import { createModuleLogger } from "../common/utils/logger.js";

const log = createModuleLogger("notification-queue");

// ─── Job payload types ────────────────────────────────────────────────────────

export interface UploadCompletedJobData {
  type: "upload-completed";
  userId: string;
  documentTitle: string;
  documentId: string;
}

export interface VerificationCompletedJobData {
  type: "verification-completed";
  userId: string;
  documentTitle: string;
  documentId: string;
  /** "verified" | "rejected" */
  status: "verified" | "rejected";
}

export interface DocumentSharedNotifJobData {
  type: "document-shared-notif";
  /** The recipient user ID (vault member being invited) */
  recipientUserId: string;
  ownerName: string;
  role: "viewer" | "editor";
}

export interface StorageWarningJobData {
  type: "storage-warning";
  userId: string;
  storageUsed: number;
  storageLimit: number;
}

export interface ExpiryReminderNotifJobData {
  type: "expiry-reminder-notif";
  userId: string;
  documentTitle: string;
  documentId: string;
  expiresAt: string; // ISO date string
}

export type NotificationJobData =
  | UploadCompletedJobData
  | VerificationCompletedJobData
  | DocumentSharedNotifJobData
  | StorageWarningJobData
  | ExpiryReminderNotifJobData;

// ─── Queue instance ───────────────────────────────────────────────────────────

export const NOTIFICATION_QUEUE_NAME = "notification";

export const notificationQueue = new Queue<NotificationJobData>(
  NOTIFICATION_QUEUE_NAME,
  {
    connection: createBullMQConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
      removeOnComplete: {
        age: 24 * 3600,
        count: 1000,
      },
      removeOnFail: {
        age: 7 * 24 * 3600,
      },
    },
  }
);

notificationQueue.on("error", (err: Error) => {
  log.error("Notification queue error", { error: err.message });
});

// ─── Typed job adder helpers ──────────────────────────────────────────────────

export async function queueUploadCompletedNotif(
  data: Omit<UploadCompletedJobData, "type">
): Promise<void> {
  await notificationQueue.add("upload-completed", {
    type: "upload-completed",
    ...data,
  });
  log.info("Queued upload-completed notif", { userId: data.userId });
}

export async function queueVerificationNotif(
  data: Omit<VerificationCompletedJobData, "type">
): Promise<void> {
  await notificationQueue.add("verification-completed", {
    type: "verification-completed",
    ...data,
  });
  log.info("Queued verification-completed notif", { userId: data.userId });
}

export async function queueDocumentSharedNotif(
  data: Omit<DocumentSharedNotifJobData, "type">
): Promise<void> {
  await notificationQueue.add("document-shared-notif", {
    type: "document-shared-notif",
    ...data,
  });
  log.info("Queued document-shared-notif", {
    recipientUserId: data.recipientUserId,
  });
}

export async function queueStorageWarningNotif(
  data: Omit<StorageWarningJobData, "type">
): Promise<void> {
  await notificationQueue.add("storage-warning", {
    type: "storage-warning",
    ...data,
  });
  log.info("Queued storage-warning notif", { userId: data.userId });
}

export async function queueExpiryReminderNotif(
  data: Omit<ExpiryReminderNotifJobData, "type">
): Promise<void> {
  await notificationQueue.add("expiry-reminder-notif", {
    type: "expiry-reminder-notif",
    ...data,
  });
  log.info("Queued expiry-reminder-notif", { userId: data.userId });
}
