/**
 * Document model - MongoDB schema for document metadata
 */

import mongoose, { Document, Schema } from "mongoose";

export interface IDocument extends Document {
  id: string;
  name: string;
  type: string;
  size: number;
  status: "verified" | "pending";
  owner: string;
  createdAt: Date;
  checksum: string;
  verifiedAt?: Date;
}

const documentSchema = new Schema<IDocument>(
  {
    id: {
      type: String,
      required: [true, "ID is required"],
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Name is required"],
    },
    type: {
      type: String,
      required: [true, "Type is required"],
    },
    size: {
      type: Number,
      required: [true, "Size is required"],
    },
    status: {
      type: String,
      enum: ["pending", "verified"],
      default: "pending",
    },
    owner: {
      type: String,
      required: [true, "Owner is required"],
    },
    checksum: {
      type: String,
      required: [true, "Checksum is required"],
    },
    verifiedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const DocumentModel = mongoose.model<IDocument>("Document", documentSchema);