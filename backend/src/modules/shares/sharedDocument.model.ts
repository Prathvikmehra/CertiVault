/**
 * Shared Document model - MongoDB schema for shared documents
 */

import mongoose, { Document, Schema } from "mongoose";

export interface ISharedDocument extends Document {
  _id: mongoose.Types.ObjectId;
  documentId: mongoose.Types.ObjectId;
  documentTitle: string;
  documentFileName: string;
  owner: mongoose.Types.ObjectId;
  ownerName: string;
  ownerEmail: string;
  shareToken: string;
  shareUrl: string;
  password?: string;
  expiresAt?: Date;
  maxAccessCount?: number;
  currentAccessCount: number;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const sharedDocumentSchema = new Schema<ISharedDocument>(
  {
    documentId: {
      type: Schema.Types.ObjectId,
      ref: "Document",
      required: [true, "Document ID is required"],
      index: true,
    },
    documentTitle: {
      type: String,
      required: [true, "Document title is required"],
    },
    documentFileName: {
      type: String,
      required: [true, "Document file name is required"],
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Owner is required"],
      index: true,
    },
    ownerName: {
      type: String,
      required: [true, "Owner name is required"],
    },
    ownerEmail: {
      type: String,
      required: [true, "Owner email is required"],
    },
    shareToken: {
      type: String,
      required: [true, "Share token is required"],
      unique: true,
      index: true,
    },
    shareUrl: {
      type: String,
      required: [true, "Share URL is required"],
    },
    password: {
      type: String,
      select: false, // Don't return password by default
    },
    expiresAt: {
      type: Date,
    },
    maxAccessCount: {
      type: Number,
      default: null,
    },
    currentAccessCount: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Created by is required"],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
sharedDocumentSchema.index({ owner: 1, isActive: 1 });
sharedDocumentSchema.index({ shareToken: 1, isActive: 1 });
sharedDocumentSchema.index({ expiresAt: 1, isActive: 1 });
sharedDocumentSchema.index({ createdAt: -1 });

// TTL index for expired shares
sharedDocumentSchema.index({ expiresAt: 1 }, { 
  expireAfterSeconds: 0,
  partialFilterExpression: { expiresAt: { $ne: null } }
});

export const SharedDocumentModel = mongoose.model<ISharedDocument>("SharedDocument", sharedDocumentSchema);
