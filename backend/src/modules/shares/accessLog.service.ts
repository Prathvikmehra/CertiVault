/**
 * Access Log Service - Handles access logging and tracking
 */

import { AccessLogModel, IAccessLog, AccessAction } from "./accessLog.model.js";
import { ApiError } from "../../utils/apiError.js";

interface LogAccessInput {
  documentId: string;
  documentTitle: string;
  sharedDocumentId?: string;
  sharedMemberId?: string;
  shareToken?: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  action: AccessAction;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

/**
 * Log an access event
 */
export const logAccess = async (input: LogAccessInput): Promise<IAccessLog> => {
  const log = await AccessLogModel.create(input);
  return log;
};

/**
 * Get access logs for a document
 */
export const getDocumentAccessLogs = async (
  documentId: string,
  userId: string,
  page = 1,
  limit = 50
): Promise<{
  logs: IAccessLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> => {
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    AccessLogModel.find({ documentId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AccessLogModel.countDocuments({ documentId }),
  ]);

  return {
    logs: logs as unknown as IAccessLog[],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

/**
 * Get access logs for a shared document
 */
export const getSharedDocumentAccessLogs = async (
  sharedDocumentId: string,
  userId: string,
  page = 1,
  limit = 50
): Promise<{
  logs: IAccessLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> => {
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    AccessLogModel.find({ sharedDocumentId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AccessLogModel.countDocuments({ sharedDocumentId }),
  ]);

  return {
    logs: logs as unknown as IAccessLog[],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

/**
 * Get access logs for a user
 */
export const getUserAccessLogs = async (
  userId: string,
  page = 1,
  limit = 50
): Promise<{
  logs: IAccessLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> => {
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    AccessLogModel.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AccessLogModel.countDocuments({ userId }),
  ]);

  return {
    logs: logs as unknown as IAccessLog[],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

/**
 * Get download statistics for a document
 */
export const getDocumentDownloadStats = async (documentId: string, userId: string): Promise<{
  totalDownloads: number;
  uniqueUsers: number;
  lastDownload?: Date;
  downloads: Array<{
    date: Date;
    userEmail: string;
    userName: string;
  }>;
}> => {
  const downloadLogs = await AccessLogModel.find({
    documentId,
    action: "download",
  })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  const uniqueUsers = new Set(
    downloadLogs.map((log) => log.userEmail).filter(Boolean)
  );

  return {
    totalDownloads: downloadLogs.length,
    uniqueUsers: uniqueUsers.size,
    lastDownload: downloadLogs[0]?.createdAt,
    downloads: downloadLogs.map((log) => ({
      date: log.createdAt,
      userEmail: log.userEmail || "Unknown",
      userName: log.userName || "Unknown",
    })),
  };
};

/**
 * Get share history for a document
 */
export const getDocumentShareHistory = async (documentId: string, userId: string): Promise<IAccessLog[]> => {
  const logs = await AccessLogModel.find({
    documentId,
    action: { $in: ["share", "revoke", "invite", "accept", "decline"] },
  })
    .sort({ createdAt: -1 })
    .lean();

  return logs as unknown as IAccessLog[];
};
