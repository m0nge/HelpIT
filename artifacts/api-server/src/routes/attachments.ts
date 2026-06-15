import { Router } from "express";
import multer from "multer";
import path from "path";
import { mkdirSync } from "fs";
import { db } from "@workspace/db";
import { attachmentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router({ mergeParams: true });

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");
mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/heic", "application/pdf"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Tipo de archivo no permitido. Solo imágenes y PDF."));
    }
  },
});

router.get("/", requireAuth, async (req, res) => {
  const ticketId = Number(req.params.id);
  const attachments = await db.select().from(attachmentsTable).where(eq(attachmentsTable.ticketId, ticketId));
  res.json(attachments);
});

router.post("/", requireAuth, upload.single("file"), async (req, res) => {
  const ticketId = Number(req.params.id);
  if (!req.file) {
    res.status(400).json({ error: "No se proporcionó ningún archivo" });
    return;
  }

  const url = `/api/uploads/${req.file.filename}`;

  const [attachment] = await db.insert(attachmentsTable).values({
    ticketId,
    uploadedById: req.user!.userId,
    filename: req.file.filename,
    originalName: req.file.originalname,
    mimetype: req.file.mimetype,
    url,
  }).returning();

  res.status(201).json(attachment);
});

export default router;
