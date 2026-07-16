/**
 * Share Service - Handles document sharing operations
 */

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { SharedDocumentModel, ISharedDocument } from "./sharedDocument.model.js";
import { DocumentModel } from "../documents/document.model.js";
import { AccessLogModel, AccessAction } from "./accessLog.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { getEnv } from "../../config/env.js";

interface CreateShareInput {
  documentId: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  password?: string;
  expiresAt?: Date;
  maxAccessCount?: number;
  createdBy: string;
}

interface AccessShareInput {
  shareToken: string;
  password?: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Generate a unique share token
 */
const generateShareToken = (): string => {
  return crypto.randomBytes(32).toString("hex");
};

/**
 * Generate share URL
 */
const generateShareUrl = (shareToken: string): string => {
  const baseUrl = getEnv().FRONTEND_ORIGIN || "http://localhost:5173";
  return `${baseUrl}/share/${shareToken}`;
};

/**
 * Hash password for storage using bcrypt
 */
const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 10);
};

/**
 * Create a new share link
 */
export const createShare = async (input: CreateShareInput): Promise<ISharedDocument> => {
  const { documentId, ownerId, ownerName, ownerEmail, password, expiresAt, maxAccessCount, createdBy } = input;

  if (typeof documentId !== "string" || typeof ownerId !== "string" || typeof createdBy !== "string") {
    throw new ApiError(400, "INVALID_INPUT", "Invalid document ID, owner ID, or creator ID");
  }
  const cleanDocumentId = String(documentId);
  const cleanOwnerId = String(ownerId);
  const cleanCreatedBy = String(createdBy);

  // Verify document exists and user owns it
  const document = await DocumentModel.findOne({ _id: cleanDocumentId, owner: cleanOwnerId });
  if (!document) {
    throw new ApiError(404, "DOCUMENT_NOT_FOUND", "Document not found or you don't have permission to share it");
  }

  // Check if document is archived
  if (document.isArchived) {
    throw new ApiError(400, "DOCUMENT_ARCHIVED", "Cannot share archived documents");
  }

  // Generate share token and URL
  const shareToken = generateShareToken();
  const shareUrl = generateShareUrl(shareToken);

  // Hash password if provided
  const hashedPassword = password ? await hashPassword(password) : undefined;

  // Create shared document
  const sharedDocument = await SharedDocumentModel.create({
    documentId: cleanDocumentId,
    documentTitle: document.title,
    documentFileName: document.fileName,
    owner: cleanOwnerId,
    ownerName,
    ownerEmail,
    shareToken,
    shareUrl,
    password: hashedPassword,
    expiresAt,
    maxAccessCount,
    currentAccessCount: 0,
    isActive: true,
    createdBy: cleanCreatedBy,
  });

  // Log share action
  await AccessLogModel.create({
    documentId: cleanDocumentId,
    documentTitle: document.title,
    sharedDocumentId: sharedDocument._id,
    shareToken,
    userId: cleanCreatedBy,
    userEmail: ownerEmail,
    userName: ownerName,
    action: "share",
    metadata: {
      expiresAt,
      maxAccessCount,
      hasPassword: !!password,
    },
  });

  return sharedDocument;
};

/**
 * Get share by token (without password)
 */
export const getShareByToken = async (shareToken: string): Promise<ISharedDocument | null> => {
  if (typeof shareToken !== "string") {
    throw new ApiError(400, "INVALID_INPUT", "Invalid share token");
  }
  const cleanShareToken = String(shareToken);

  const share = await SharedDocumentModel.findOne({ 
    shareToken: cleanShareToken, 
    isActive: true 
  }).select("-password");

  if (!share) {
    return null;
  }

  // Check if expired
  if (share.expiresAt && share.expiresAt < new Date()) {
    await SharedDocumentModel.findByIdAndUpdate(share._id, { isActive: false });
    return null;
  }

  // Check if max access count reached
  if (share.maxAccessCount && share.currentAccessCount >= share.maxAccessCount) {
    await SharedDocumentModel.findByIdAndUpdate(share._id, { isActive: false });
    return null;
  }

  return share;
};

/**
 * Validate and access a shared document
 */
export const accessShare = async (input: AccessShareInput): Promise<{ 
  documentId: string; 
  documentTitle: string; 
  requiresPassword: boolean;
  accessGranted: boolean;
}> => {
  const { shareToken, password, userId, userEmail, userName, ipAddress, userAgent } = input;

  if (typeof shareToken !== "string") {
    throw new ApiError(400, "INVALID_INPUT", "Invalid share token");
  }
  const cleanShareToken = String(shareToken);

  if (userId !== undefined && typeof userId !== "string") {
    throw new ApiError(400, "INVALID_INPUT", "Invalid user ID");
  }
  const cleanUserId = userId ? String(userId) : undefined;

  // Get share with password field for validation
  const share = await SharedDocumentModel.findOne({ 
    shareToken: cleanShareToken, 
    isActive: true 
  });

  if (!share) {
    throw new ApiError(404, "SHARE_NOT_FOUND", "Share link not found or has expired");
  }

  // Check if expired
  if (share.expiresAt && share.expiresAt < new Date()) {
    await SharedDocumentModel.findByIdAndUpdate(share._id, { isActive: false });
    throw new ApiError(400, "SHARE_EXPIRED", "Share link has expired");
  }

  // Check if max access count reached
  if (share.maxAccessCount && share.currentAccessCount >= share.maxAccessCount) {
    await SharedDocumentModel.findByIdAndUpdate(share._id, { isActive: false });
    throw new ApiError(400, "SHARE_LIMIT_REACHED", "Share link has reached maximum access count");
  }

  // Check password if required
  if (share.password) {
    if (!password) {
      return {
        documentId: share.documentId.toString(),
        documentTitle: share.documentTitle,
        requiresPassword: true,
        accessGranted: false,
      };
    }

    const isMatch = await bcrypt.compare(password, share.password);
    if (!isMatch) {
      throw new ApiError(401, "INVALID_PASSWORD", "Invalid password");
    }
  }

  // Increment access count
  await SharedDocumentModel.findByIdAndUpdate(share._id, {
    $inc: { currentAccessCount: 1 },
  });

  // Log access
  await AccessLogModel.create({
    documentId: share.documentId,
    documentTitle: share.documentTitle,
    sharedDocumentId: share._id,
    shareToken: cleanShareToken,
    userId: cleanUserId,
    userEmail,
    userName,
    action: "view",
    ipAddress,
    userAgent,
  });

  return {
    documentId: share.documentId.toString(),
    documentTitle: share.documentTitle,
    requiresPassword: !!share.password,
    accessGranted: true,
  };
};

/**
 * Revoke a share link
 */
export const revokeShare = async (shareId: string, userId: string): Promise<void> => {
  if (typeof shareId !== "string" || typeof userId !== "string") {
    throw new ApiError(400, "INVALID_INPUT", "Invalid share ID or user ID");
  }
  const cleanShareId = String(shareId);
  const cleanUserId = String(userId);

  const share = await SharedDocumentModel.findOne({ _id: cleanShareId, owner: cleanUserId });
  if (!share) {
    throw new ApiError(404, "SHARE_NOT_FOUND", "Share link not found or you don't have permission to revoke it");
  }

  await SharedDocumentModel.findByIdAndUpdate(cleanShareId, { isActive: false });

  // Log revoke action
  await AccessLogModel.create({
    documentId: share.documentId,
    documentTitle: share.documentTitle,
    sharedDocumentId: share._id,
    shareToken: share.shareToken,
    userId: cleanUserId,
    action: "revoke",
  });
};

/**
 * Get all shares for a user
 */
export const getUserShares = async (userId: string, page = 1, limit = 20): Promise<{
  shares: ISharedDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> => {
  if (typeof userId !== "string") {
    throw new ApiError(400, "INVALID_INPUT", "Invalid user ID");
  }
  const cleanUserId = String(userId);
  const skip = (page - 1) * limit;

  const [shares, total] = await Promise.all([
    SharedDocumentModel.find({ owner: cleanUserId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("-password")
      .lean(),
    SharedDocumentModel.countDocuments({ owner: cleanUserId }),
  ]);

  return {
    shares: shares as unknown as ISharedDocument[],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

/**
 * Get share by ID
 */
export const getShareById = async (shareId: string, userId: string): Promise<ISharedDocument | null> => {
  if (typeof shareId !== "string" || typeof userId !== "string") {
    throw new ApiError(400, "INVALID_INPUT", "Invalid share ID or user ID");
  }
  const cleanShareId = String(shareId);
  const cleanUserId = String(userId);

  const share = await SharedDocumentModel.findOne({ 
    _id: cleanShareId, 
    owner: cleanUserId 
  }).select("-password").lean();

  return share as unknown as ISharedDocument | null;
};

/**
 * Update share settings
 */
export const updateShare = async (
  shareId: string,
  userId: string,
  updates: {
    expiresAt?: Date;
    maxAccessCount?: number;
    password?: string;
  }
): Promise<ISharedDocument> => {
  if (typeof shareId !== "string" || typeof userId !== "string") {
    throw new ApiError(400, "INVALID_INPUT", "Invalid share ID or user ID");
  }
  const cleanShareId = String(shareId);
  const cleanUserId = String(userId);

  const share = await SharedDocumentModel.findOne({ _id: cleanShareId, owner: cleanUserId });
  if (!share) {
    throw new ApiError(404, "SHARE_NOT_FOUND", "Share link not found or you don't have permission to update it");
  }

  const updateData: any = {};
  if (updates.expiresAt !== undefined) updateData.expiresAt = updates.expiresAt;
  if (updates.maxAccessCount !== undefined) updateData.maxAccessCount = updates.maxAccessCount;
  if (updates.password !== undefined) {
    updateData.password = updates.password ? await hashPassword(updates.password) : null;
  }

  const updatedShare = await SharedDocumentModel.findByIdAndUpdate(
    cleanShareId,
    updateData,
    { new: true }
  ).select("-password").lean();

  return updatedShare as unknown as ISharedDocument;
};
