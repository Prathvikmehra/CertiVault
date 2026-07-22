import { Router } from "express";
import multer from "multer";
import {
  deleteDocument,
  getDocument,
  listDocuments,
  uploadDocument,
  verifyDocument,
} from "./document.controller.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

export const documentRouter = Router();

documentRouter.get("/", listDocuments);
documentRouter.get("/:id", getDocument);
documentRouter.post("/", upload.single("file"), uploadDocument);
documentRouter.patch("/:id/verify", verifyDocument);
documentRouter.delete("/:id", deleteDocument);
