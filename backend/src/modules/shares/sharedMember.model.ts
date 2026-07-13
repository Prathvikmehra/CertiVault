/**
 * Shared Member model - MongoDB schema for document sharing members
 */

import mongoose, { Document, Schema } from "mongoose";

export type Permission = "viewer" | "editor" | "admin";

export interface ISharedMember extends Document {
  _id: mongoose.Types.ObjectId;
  documentId: mongoose.Types.ObjectId;
  sharedDocumentId?: mongoose.Types.ObjectId;
  memberEmail: string;
  memberName?: string;
  memberUserId?: mongoose.Types.ObjectId;
  permission: Permission;
  invitedBy: mongoose.Types.ObjectId;
  invitedByName: string;
  invitedByEmail: string;
  inviteToken?: string;
  inviteStatus: "pending" | "accepted" | "declined" | "revoked";
  acceptedAt?: Date;
  revokedAt?: Date;
  revokedBy?: mongoose.Types.ObjectId;
  expiresAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const sharedMemberSchema = new Schema<ISharedMember>(
  {
    documentId: {
      type: Schema.Types.ObjectId,
      ref: "Document",
      required: [true, "Document ID is required"],
      index: true,
    },
    sharedDocumentId: {
      type: Schema.Types.ObjectId,
      ref: "SharedDocument",
      index: true,
    },
    memberEmail: {
      type: String,
      required: [true, "Member email is required"],
      trim: true,
      lowercase: true,
      index: true,
    },
    memberName: {
      type: String,
      trim: true,
    },
    memberUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    permission: {
      type: String,
      enum: ["viewer", "editor", "admin"],
      required: [true, "Permission is required"],
      default: "viewer",
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Invited by is required"],
      index: true,
    },
    invitedByName: {
      type: String,
      required: [true, "Invited by name is required"],
    },
    invitedByEmail: {
      type: String,
      required: [true, "Invited by email is required"],
    },
    inviteToken: {
      type: String,
      unique: true,
      sparse: true,
    },
    inviteStatus: {
      type: String,
      enum: ["pending", "accepted", "declined", "revoked"],
      default: "pending",
      index: true,
    },
    acceptedAt: {
      type: Date,
    },
    revokedAt: {
      type: Date,
    },
    revokedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    expiresAt: {
      type: Date,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
sharedMemberSchema.index({ documentId: 1, isActive: 1 });
sharedMemberSchema.index({ memberEmail: 1, documentId: 1 });
sharedMemberSchema.index({ memberUserId: 1, documentId: 1 });
sharedMemberSchema.index({ invitedBy: 1, isActive: 1 });
sharedMemberSchema.index({ inviteStatus: 1, isActive: 1 });
sharedMemberSchema.index({ expiresAt: 1, isActive: 1 });
sharedMemberSchema.index({ createdAt: -1 });

// TTL index for expired invitations
sharedMemberSchema.index({ expiresAt: 1 }, { 
  expireAfterSeconds: 0,
  partialFilterExpression: { expiresAt: { $ne: null }, inviteStatus: "pending" }
});

export const SharedMemberModel = mongoose.model<ISharedMember>("SharedMember", sharedMemberSchema);
