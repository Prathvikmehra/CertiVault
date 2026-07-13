/**
 * Share Validation Schemas - Zod schemas for share validation
 */

import { z } from "zod";

const PERMISSIONS = ["viewer", "editor", "admin"] as const;
const INVITE_STATUSES = ["pending", "accepted", "declined", "revoked"] as const;
const ACCESS_ACTIONS = ["view", "download", "share", "revoke", "invite", "accept", "decline"] as const;

/**
 * Create share link schema
 */
export const createShareSchema = z.object({
  documentId: z.string().min(1, "Document ID is required"),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  expiresAt: z.string().datetime("Invalid date format").optional(),
  maxAccessCount: z.number().int().positive("Max access count must be positive").optional(),
});

/**
 * Access share schema
 */
export const accessShareSchema = z.object({
  password: z.string().optional(),
});

/**
 * Update share schema
 */
export const updateShareSchema = z.object({
  expiresAt: z.string().datetime("Invalid date format").optional(),
  maxAccessCount: z.number().int().positive("Max access count must be positive").optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
});

/**
 * Invite member schema
 */
export const inviteMemberSchema = z.object({
  documentId: z.string().min(1, "Document ID is required"),
  memberEmail: z.string().email("Invalid email address"),
  memberName: z.string().min(1, "Member name is required").optional(),
  permission: z.enum(PERMISSIONS, {
    errorMap: () => ({ message: "Invalid permission" }),
  }),
  expiresAt: z.string().datetime("Invalid date format").optional(),
});

/**
 * Update member permission schema
 */
export const updateMemberPermissionSchema = z.object({
  permission: z.enum(PERMISSIONS, {
    errorMap: () => ({ message: "Invalid permission" }),
  }),
});

/**
 * Pagination schema
 */
export const paginationSchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val) : 20)),
});
