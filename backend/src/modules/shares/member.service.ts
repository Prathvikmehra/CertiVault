/**
 * Member Service - Handles member invitation and management
 */

import crypto from "crypto";
import { SharedMemberModel, ISharedMember, Permission } from "./sharedMember.model.js";
import { DocumentModel } from "../documents/document.model.js";
import { AccessLogModel, AccessAction } from "./accessLog.model.js";
import { ApiError } from "../../utils/apiError.js";

interface InviteMemberInput {
  documentId: string;
  memberEmail: string;
  memberName?: string;
  permission: Permission;
  invitedBy: string;
  invitedByName: string;
  invitedByEmail: string;
  expiresAt?: Date;
}

interface AcceptInviteInput {
  inviteToken: string;
  userId: string;
  userEmail: string;
  userName: string;
}

/**
 * Generate invite token
 */
const generateInviteToken = (): string => {
  return crypto.randomBytes(32).toString("hex");
};

/**
 * Invite a member to a document
 */
export const inviteMember = async (input: InviteMemberInput): Promise<ISharedMember> => {
  const { documentId, memberEmail, memberName, permission, invitedBy, invitedByName, invitedByEmail, expiresAt } = input;

  // Verify document exists and user owns it
  const document = await DocumentModel.findOne({ _id: documentId, owner: invitedBy });
  if (!document) {
    throw new ApiError(404, "DOCUMENT_NOT_FOUND", "Document not found or you don't have permission to share it");
  }

  // Check if member already has access
  const existingMember = await SharedMemberModel.findOne({
    documentId,
    memberEmail,
    inviteStatus: { $in: ["pending", "accepted"] },
    isActive: true,
  });

  if (existingMember) {
    throw new ApiError(400, "ALREADY_INVITED", "User already has access to this document");
  }

  // Generate invite token
  const inviteToken = generateInviteToken();

  // Create shared member
  const member = await SharedMemberModel.create({
    documentId,
    memberEmail,
    memberName,
    permission,
    invitedBy,
    invitedByName,
    invitedByEmail,
    inviteToken,
    inviteStatus: "pending",
    expiresAt,
    isActive: true,
  });

  // Log invite action
  await AccessLogModel.create({
    documentId,
    documentTitle: document.title,
    sharedMemberId: member._id,
    userId: invitedBy,
    userEmail: invitedByEmail,
    userName: invitedByName,
    action: "invite",
    metadata: {
      memberEmail,
      permission,
      expiresAt,
    },
  });

  return member;
};

/**
 * Accept an invitation
 */
export const acceptInvite = async (input: AcceptInviteInput): Promise<ISharedMember> => {
  const { inviteToken, userId, userEmail, userName } = input;

  const member = await SharedMemberModel.findOne({
    inviteToken,
    inviteStatus: "pending",
    isActive: true,
  });

  if (!member) {
    throw new ApiError(404, "INVITE_NOT_FOUND", "Invitation not found or has expired");
  }

  // Check if expired
  if (member.expiresAt && member.expiresAt < new Date()) {
    await SharedMemberModel.findByIdAndUpdate(member._id, { 
      inviteStatus: "declined",
      isActive: false 
    });
    throw new ApiError(400, "INVITE_EXPIRED", "Invitation has expired");
  }

  // Update member
  const updatedMember = await SharedMemberModel.findByIdAndUpdate(
    member._id,
    {
      inviteStatus: "accepted",
      memberUserId: userId,
      memberName: member.memberName || userName,
      acceptedAt: new Date(),
    },
    { new: true }
  ).lean();

  // Log accept action
  await AccessLogModel.create({
    documentId: member.documentId,
    documentTitle: "", // Will be populated by document lookup
    sharedMemberId: member._id,
    userId,
    userEmail,
    userName,
    action: "accept",
  });

  return updatedMember as unknown as ISharedMember;
};

/**
 * Decline an invitation
 */
export const declineInvite = async (inviteToken: string, userId: string): Promise<void> => {
  const member = await SharedMemberModel.findOne({
    inviteToken,
    inviteStatus: "pending",
    isActive: true,
  });

  if (!member) {
    throw new ApiError(404, "INVITE_NOT_FOUND", "Invitation not found or has expired");
  }

  await SharedMemberModel.findByIdAndUpdate(member._id, {
    inviteStatus: "declined",
    isActive: false,
  });

  // Log decline action
  await AccessLogModel.create({
    documentId: member.documentId,
    documentTitle: "",
    sharedMemberId: member._id,
    userId,
    action: "decline",
  });
};

/**
 * Revoke member access
 */
export const revokeMember = async (memberId: string, userId: string): Promise<void> => {
  const member = await SharedMemberModel.findOne({ _id: memberId });
  if (!member) {
    throw new ApiError(404, "MEMBER_NOT_FOUND", "Member not found");
  }

  // Verify user is the document owner
  const document = await DocumentModel.findOne({ _id: member.documentId, owner: userId });
  if (!document) {
    throw new ApiError(403, "NO_PERMISSION", "You don't have permission to revoke this member");
  }

  await SharedMemberModel.findByIdAndUpdate(memberId, {
    inviteStatus: "revoked",
    isActive: false,
    revokedAt: new Date(),
    revokedBy: userId,
  });

  // Log revoke action
  await AccessLogModel.create({
    documentId: member.documentId,
    documentTitle: document.title,
    sharedMemberId: member._id,
    userId,
    action: "revoke",
    metadata: {
      memberEmail: member.memberEmail,
    },
  });
};

/**
 * Update member permission
 */
export const updateMemberPermission = async (
  memberId: string,
  userId: string,
  permission: Permission
): Promise<ISharedMember> => {
  const member = await SharedMemberModel.findOne({ _id: memberId });
  if (!member) {
    throw new ApiError(404, "MEMBER_NOT_FOUND", "Member not found");
  }

  // Verify user is the document owner
  const document = await DocumentModel.findOne({ _id: member.documentId, owner: userId });
  if (!document) {
    throw new ApiError(403, "NO_PERMISSION", "You don't have permission to update this member");
  }

  const updatedMember = await SharedMemberModel.findByIdAndUpdate(
    memberId,
    { permission },
    { new: true }
  ).lean();

  return updatedMember as unknown as ISharedMember;
};

/**
 * Get all members for a document
 */
export const getDocumentMembers = async (documentId: string, userId: string): Promise<ISharedMember[]> => {
  // Verify user is the document owner
  const document = await DocumentModel.findOne({ _id: documentId, owner: userId });
  if (!document) {
    throw new ApiError(403, "NO_PERMISSION", "You don't have permission to view members");
  }

  const members = await SharedMemberModel.find({ 
    documentId,
    isActive: true 
  })
    .sort({ createdAt: -1 })
    .lean();

  return members as unknown as ISharedMember[];
};

/**
 * Get all invitations for a user
 */
export const getUserInvitations = async (userId: string, userEmail: string): Promise<ISharedMember[]> => {
  const members = await SharedMemberModel.find({
    $or: [
      { memberUserId: userId },
      { memberEmail: userEmail },
    ],
    inviteStatus: "pending",
    isActive: true,
  })
    .sort({ createdAt: -1 })
    .lean();

  return members as unknown as ISharedMember[];
};

/**
 * Get all documents shared with user
 */
export const getSharedWithUser = async (userId: string, page = 1, limit = 20): Promise<{
  members: ISharedMember[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> => {
  const skip = (page - 1) * limit;

  const [members, total] = await Promise.all([
    SharedMemberModel.find({
      memberUserId: userId,
      inviteStatus: "accepted",
      isActive: true,
    })
      .populate("documentId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    SharedMemberModel.countDocuments({
      memberUserId: userId,
      inviteStatus: "accepted",
      isActive: true,
    }),
  ]);

  return {
    members: members as unknown as ISharedMember[],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};
