/**
 * Share Routes - API routes for document sharing
 */

import { Router } from "express";
import { protect } from "../../middleware/auth.js";
import {
  createShareController,
  getShareByTokenController,
  accessShareController,
  revokeShareController,
  getUserSharesController,
  getShareByIdController,
  updateShareController,
} from "./share.controller.js";
import {
  inviteMemberController,
  acceptInviteController,
  declineInviteController,
  revokeMemberController,
  updateMemberPermissionController,
  getDocumentMembersController,
  getUserInvitationsController,
  getSharedWithUserController,
} from "./member.controller.js";
import {
  getDocumentAccessLogsController,
  getSharedDocumentAccessLogsController,
  getUserAccessLogsController,
  getDocumentDownloadStatsController,
  getDocumentShareHistoryController,
} from "./accessLog.controller.js";

const router = Router();

/**
 * Share Link Routes - static routes MUST come before wildcard /:shareId
 */
router.post("/shares", protect, createShareController);
router.get("/shares", protect, getUserSharesController);

/**
 * Public Share Access Routes (static paths before /:shareId wildcard)
 */
router.get("/shares/public/:token", getShareByTokenController);
router.post("/shares/public/:token/access", protect, accessShareController);

/**
 * Shared-with-me route (static path before /:shareId wildcard)
 */
router.get("/shares/shared-with-me", protect, getSharedWithUserController);

/**
 * Member Routes (static paths before /:shareId wildcard)
 */
router.post("/shares/members", protect, inviteMemberController);
router.post("/shares/members/accept/:token", protect, acceptInviteController);
router.post("/shares/members/decline/:token", protect, declineInviteController);
router.get("/shares/members/invitations", protect, getUserInvitationsController);
router.delete("/shares/members/:memberId", protect, revokeMemberController);
router.put("/shares/members/:memberId/permission", protect, updateMemberPermissionController);
router.get("/shares/documents/:documentId/members", protect, getDocumentMembersController);

/**
 * Access Log Routes (static paths before /:shareId wildcard)
 */
router.get("/shares/logs/user", protect, getUserAccessLogsController);
router.get("/shares/logs/documents/:documentId/downloads", protect, getDocumentDownloadStatsController);
router.get("/shares/logs/documents/:documentId/history", protect, getDocumentShareHistoryController);
router.get("/shares/logs/documents/:documentId", protect, getDocumentAccessLogsController);
router.get("/shares/logs/shared/:sharedDocumentId", protect, getSharedDocumentAccessLogsController);

/**
 * Wildcard share ID routes - MUST come last
 */
router.get("/shares/:shareId", protect, getShareByIdController);
router.put("/shares/:shareId", protect, updateShareController);
router.delete("/shares/:shareId", protect, revokeShareController);

export default router;
