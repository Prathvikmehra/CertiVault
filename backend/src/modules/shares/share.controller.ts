/**
 * Share Controller - Handles share link HTTP requests
 */

import { Request, Response, NextFunction } from "express";
import {
  createShare,
  getShareByToken,
  accessShare,
  revokeShare,
  getUserShares,
  getShareById,
  updateShare,
} from "./share.service.js";
import { ApiError } from "../../utils/ApiError.js";

/**
 * Create a new share link
 */
export const createShareController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return next(new ApiError(401, "UNAUTHORIZED", "User not authenticated"));
    }

    const { documentId, password, expiresAt, maxAccessCount } = req.body;

    const share = await createShare({
      documentId,
      ownerId: userId,
      ownerName: "Unknown",
      ownerEmail: req.user?.email || "",
      password,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      maxAccessCount,
      createdBy: userId,
    });

    res.status(201).json({
      success: true,
      data: {
        id: share._id,
        shareUrl: share.shareUrl,
        shareToken: share.shareToken,
        expiresAt: share.expiresAt,
        maxAccessCount: share.currentAccessCount,
        hasPassword: !!share.password,
        createdAt: share.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get share by token (public access)
 */
export const getShareByTokenController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params;
    const tokenStr = Array.isArray(token) ? token[0] : token;

    const share = await getShareByToken(tokenStr);

    if (!share) {
      return next(new ApiError(404, "SHARE_NOT_FOUND", "Share link not found or has expired"));
    }

    res.json({
      success: true,
      data: {
        id: share._id,
        documentTitle: share.documentTitle,
        documentFileName: share.documentFileName,
        ownerName: share.ownerName,
        requiresPassword: !!share.password,
        expiresAt: share.expiresAt,
        currentAccessCount: share.currentAccessCount,
        maxAccessCount: share.maxAccessCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Access a shared document (validate password if needed)
 */
export const accessShareController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    const userId = req.user?.userId;
    const userEmail = req.user?.email;
    const userName = "Unknown";
    const ipAddress = req.ip;
    const userAgent = req.headers["user-agent"] as string | undefined;

    const tokenStr = Array.isArray(token) ? token[0] : token;
    const result = await accessShare({
      shareToken: tokenStr,
      password,
      userId,
      userEmail,
      userName,
      ipAddress,
      userAgent,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Revoke a share link
 */
export const revokeShareController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return next(new ApiError(401, "UNAUTHORIZED", "User not authenticated"));
    }

    const { shareId } = req.params;
    const shareIdStr = Array.isArray(shareId) ? shareId[0] : shareId;

    await revokeShare(shareIdStr, userId);

    res.json({
      success: true,
      message: "Share link revoked successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all shares for the current user
 */
export const getUserSharesController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return next(new ApiError(401, "UNAUTHORIZED", "User not authenticated"));
    }

    const page = parseInt((req.query.page as string) || "1");
    const limit = parseInt((req.query.limit as string) || "20");

    const result = await getUserShares(userId, page, limit);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a specific share by ID
 */
export const getShareByIdController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return next(new ApiError(401, "UNAUTHORIZED", "User not authenticated"));
    }

    const { shareId } = req.params;
    const shareIdStr = Array.isArray(shareId) ? shareId[0] : shareId;

    const share = await getShareById(shareIdStr, userId);

    if (!share) {
      return next(new ApiError(404, "SHARE_NOT_FOUND", "Share link not found"));
    }

    res.json({
      success: true,
      data: share,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update share settings
 */
export const updateShareController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return next(new ApiError(401, "UNAUTHORIZED", "User not authenticated"));
    }

    const { shareId } = req.params;
    const shareIdStr = Array.isArray(shareId) ? shareId[0] : shareId;
    const { expiresAt, maxAccessCount, password } = req.body;

    const share = await updateShare(shareIdStr, userId, {
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      maxAccessCount,
      password,
    });

    res.json({
      success: true,
      data: share,
    });
  } catch (error) {
    next(error);
  }
};
