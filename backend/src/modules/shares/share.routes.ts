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
 * Share Link Routes
 */
router.post("/shares", protect, createShareController);
router.get("/shares", protect, getUserSharesController);
router.get("/shares/:shareId", protect, getShareByIdController);
router.put("/shares/:shareId", protect, updateShareController);
router.delete("/shares/:shareId", protect, revokeShareController);

/**
 * Public Share Access Routes
 */
router.get("/shares/public/:token", getShareByTokenController);
router.post("/shares/public/:token/access", protect, accessShareController);

/**
 * Member Routes
 */
router.post("/shares/members", protect, inviteMemberController);
router.post("/shares/members/accept/:token", protect, acceptInviteController);
router.post("/shares/members/decline/:token", protect, declineInviteController);
router.delete("/shares/members/:memberId", protect, revokeMemberController);
router.put("/shares/members/:memberId/permission", protect, updateMemberPermissionController);
router.get("/shares/documents/:documentId/members", protect, getDocumentMembersController);
router.get("/shares/members/invitations", protect, getUserInvitationsController);
router.get("/shares/shared-with-me", protect, getSharedWithUserController);

/**
 * Access Log Routes
 */
router.get("/shares/logs/documents/:documentId", protect, getDocumentAccessLogsController);
router.get("/shares/logs/shared/:sharedDocumentId", protect, getSharedDocumentAccessLogsController);
router.get("/shares/logs/user", protect, getUserAccessLogsController);
router.get("/shares/logs/documents/:documentId/downloads", protect, getDocumentDownloadStatsController);
router.get("/shares/logs/documents/:documentId/history", protect, getDocumentShareHistoryController);

export default router;
