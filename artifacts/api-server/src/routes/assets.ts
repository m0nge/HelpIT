import { Router } from "express";
import { db } from "@workspace/db";
import { assetsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { z } from "zod";

const router = Router();

const assetInputSchema = z.object({
  name: z.string().min(2),
  type: z.enum(["pc", "laptop", "printer", "server", "monitor", "other"]),
  code: z.string().min(3),
  location: z.string().optional(),
  serialNumber: z.string().optional(),
  notes: z.string().optional(),
});

const assetUpdateSchema = z.object({
  name: z.string().optional(),
  type: z.enum(["pc", "laptop", "printer", "server", "monitor", "other"]).optional(),
  location: z.string().nullable().optional(),
  serialNumber: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

router.get("/by-code/:code", requireAuth, async (req, res) => {
  const { code } = req.params;
  const [asset] = await db.select().from(assetsTable).where(eq(assetsTable.code, code)).limit(1);
  if (!asset) { res.status(404).json({ error: "Asset not found" }); return; }
  res.json(asset);
});

router.get("/", requireAuth, async (req, res) => {
  const { type } = req.query;
  const assets = type
    ? await db.select().from(assetsTable).where(eq(assetsTable.type, type as any))
    : await db.select().from(assetsTable);
  res.json(assets);
});

router.post("/", requireAuth, requireRole("technician", "admin"), async (req, res) => {
  const parsed = assetInputSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input", details: parsed.error.issues }); return; }
  try {
    const [asset] = await db.insert(assetsTable).values(parsed.data).returning();
    res.status(201).json(asset);
  } catch (e: any) {
    if (e.code === "23505") { res.status(400).json({ error: "Asset code already exists" }); return; }
    throw e;
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [asset] = await db.select().from(assetsTable).where(eq(assetsTable.id, id)).limit(1);
  if (!asset) { res.status(404).json({ error: "Asset not found" }); return; }
  res.json(asset);
});

router.patch("/:id", requireAuth, requireRole("technician", "admin"), async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = assetUpdateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const [asset] = await db.update(assetsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(assetsTable.id, id)).returning();
  if (!asset) { res.status(404).json({ error: "Asset not found" }); return; }
  res.json(asset);
});

router.delete("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(assetsTable).where(eq(assetsTable.id, id));
  res.status(204).send();
});

export default router;
