import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { z } from "zod";
import bcrypt from "bcryptjs";

const router = Router();

const userUpdateSchema = z.object({
  name: z.string().optional(),
  role: z.enum(["user", "technician", "admin"]).optional(),
});

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["user", "technician", "admin"]).default("user"),
});

const SELECT_FIELDS = {
  id: usersTable.id,
  name: usersTable.name,
  email: usersTable.email,
  role: usersTable.role,
  createdAt: usersTable.createdAt,
  updatedAt: usersTable.updatedAt,
};

router.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Datos inválidos", details: parsed.error.issues });
    return;
  }
  const { name, email, password, role } = parsed.data;

  const [existing] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing) {
    res.status(400).json({ error: "Ya existe un usuario con ese correo electrónico" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db.insert(usersTable).values({ name, email, passwordHash, role }).returning(SELECT_FIELDS);
  res.status(201).json(user);
});

router.get("/", requireAuth, requireRole("admin"), async (req, res) => {
  const users = await db.select(SELECT_FIELDS).from(usersTable);
  res.json(users);
});

router.patch("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = userUpdateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const [user] = await db.update(usersTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(usersTable.id, id))
    .returning(SELECT_FIELDS);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(user);
});

export default router;
