import { Router } from "express";
import multer from "multer";
import path from "path";
import { mkdirSync } from "fs";
import { db } from "@workspace/db";
import { attachmentsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router({ mergeParams: true });

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");
mkdirSync(UPLOADS_DIR, { recursive: true });

const ALLOWED_MIMETYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/heic",
  "application/pdf",
  "audio/webm", "audio/ogg", "audio/mp4", "audio/wav", "audio/mpeg",
  "audio/x-m4a",
];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const ext = path.extname(file.originalname) || (file.mimetype.includes("webm") ? ".webm" : ".bin");
    cb(null, `${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Tipo de archivo no permitido."));
    }
  },
});

async function withUploader(attachment: typeof attachmentsTable.$inferSelect) {
  const [u] = await db.select({ id: usersTable.id, name: usersTable.name, role: usersTable.role })
    .from(usersTable).where(eq(usersTable.id, attachment.uploadedById)).limit(1);
  return { ...attachment, uploadedBy: u || null };
}

router.get("/", requireAuth, async (req, res) => {
  const ticketId = Number(req.params.id);
  const attachments = await db.select().from(attachmentsTable).where(eq(attachmentsTable.ticketId, ticketId));
  const withUsers = await Promise.all(attachments.map(withUploader));
  res.json(withUsers);
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

  res.status(201).json(await withUploader(attachment));
});

export default router;
