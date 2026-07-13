/**
 * Access Log Controller - Handles access log HTTP requests
 */

import { Request, Response, NextFunction } from "express";
import {
  logAccess,
  getDocumentAccessLogs,
  getSharedDocumentAccessLogs,
  getUserAccessLogs,
  getDocumentDownloadStats,
  getDocumentShareHistory,
} from "./accessLog.service.js";
import { ApiError } from "../../utils/ApiError.js";

/**
 * Get access logs for a document
 */
export const getDocumentAccessLogsController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return next(new ApiError(401, "UNAUTHORIZED", "User not authenticated"));
    }

    const { documentId } = req.params;
    const documentIdStr = Array.isArray(documentId) ? documentId[0] : documentId;
    const page = parseInt((req.query.page as string) || "1");
    const limit = parseInt((req.query.limit as string) || "50");

    const result = await getDocumentAccessLogs(documentIdStr, userId, page, limit);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get access logs for a shared document
 */
export const getSharedDocumentAccessLogsController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return next(new ApiError(401, "UNAUTHORIZED", "User not authenticated"));
    }

    const { sharedDocumentId } = req.params;
    const sharedDocumentIdStr = Array.isArray(sharedDocumentId) ? sharedDocumentId[0] : sharedDocumentId;
    const page = parseInt((req.query.page as string) || "1");
    const limit = parseInt((req.query.limit as string) || "50");

    const result = await getSharedDocumentAccessLogs(sharedDocumentIdStr, userId, page, limit);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get access logs for the current user
 */
export const getUserAccessLogsController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return next(new ApiError(401, "UNAUTHORIZED", "User not authenticated"));
    }

    const page = parseInt((req.query.page as string) || "1");
    const limit = parseInt((req.query.limit as string) || "50");

    const result = await getUserAccessLogs(userId, page, limit);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get download statistics for a document
 */
export const getDocumentDownloadStatsController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return next(new ApiError(401, "UNAUTHORIZED", "User not authenticated"));
    }

    const { documentId } = req.params;
    const documentIdStr = Array.isArray(documentId) ? documentId[0] : documentId;

    const stats = await getDocumentDownloadStats(documentIdStr, userId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get share history for a document
 */
export const getDocumentShareHistoryController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return next(new ApiError(401, "UNAUTHORIZED", "User not authenticated"));
    }

    const { documentId } = req.params;
    const documentIdStr = Array.isArray(documentId) ? documentId[0] : documentId;

    const history = await getDocumentShareHistory(documentIdStr, userId);

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    next(error);
  }
};
