import { Router } from "express";
import { db } from "@workspace/db";
import { ticketsTable, usersTable, assetsTable, commentsTable, ratingsTable } from "@workspace/db";
import { eq, and, sql, avg, count } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { sendTelegramAlert, sendEmailNotification, buildTicketEmailHtml } from "../lib/notifications";
import { z } from "zod";

const router = Router();

const CRITICAL_KEYWORDS = [
  "caído", "caido", "no enciende", "bloqueado", "error crítico", "error critico",
  "crashed", "critical", "down", "blocked", "no arranca", "no funciona",
  "urgente", "emergencia", "fuera de servicio", "sin acceso",
];

function detectCritical(description: string): boolean {
  const lower = description.toLowerCase();
  return CRITICAL_KEYWORDS.some((kw) => lower.includes(kw));
}

const ticketInputSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  category: z.enum(["hardware", "software", "network", "access"]),
  assetId: z.number().int().nullable().optional(),
});

const ticketUpdateSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  category: z.enum(["hardware", "software", "network", "access"]).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
  assignedToId: z.number().int().nullable().optional(),
  assetId: z.number().int().nullable().optional(),
});

async function getTicketWithRelations(id: number) {
  const [ticket] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, id)).limit(1);
  if (!ticket) return null;

  const [creator] = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role, createdAt: usersTable.createdAt, updatedAt: usersTable.updatedAt })
    .from(usersTable).where(eq(usersTable.id, ticket.createdById)).limit(1);

  let assignedTo = null;
  if (ticket.assignedToId) {
    const [u] = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
      .from(usersTable).where(eq(usersTable.id, ticket.assignedToId)).limit(1);
    assignedTo = u || null;
  }

  let asset = null;
  if (ticket.assetId) {
    const [a] = await db.select({ id: assetsTable.id, name: assetsTable.name, code: assetsTable.code })
      .from(assetsTable).where(eq(assetsTable.id, ticket.assetId)).limit(1);
    asset = a || null;
  }

  const [ratingRow] = await db.select({ stars: ratingsTable.stars })
    .from(ratingsTable).where(eq(ratingsTable.ticketId, id)).limit(1);

  return { ...ticket, createdBy: creator, assignedTo, asset, rating: ratingRow?.stars ?? null };
}

router.get("/stats", requireAuth, async (req, res) => {
  const allTickets = await db.select().from(ticketsTable);
  const total = allTickets.length;
  const open = allTickets.filter(t => t.status === "open").length;
  const inProgress = allTickets.filter(t => t.status === "in_progress").length;
  const resolved = allTickets.filter(t => t.status === "resolved" || t.status === "closed").length;
  const critical = allTickets.filter(t => t.priority === "critical").length;

  const resolvedWithTime = allTickets.filter(t => t.resolvedAt && t.createdAt);
  const avgResolutionHours = resolvedWithTime.length > 0
    ? resolvedWithTime.reduce((sum, t) => {
        const diff = new Date(t.resolvedAt!).getTime() - new Date(t.createdAt).getTime();
        return sum + diff / (1000 * 60 * 60);
      }, 0) / resolvedWithTime.length
    : 0;

  const categories = ["hardware", "software", "network", "access"] as const;
  const byCategory = categories.map(cat => ({
    category: cat,
    count: allTickets.filter(t => t.category === cat).length,
  }));

  const priorities = ["low", "medium", "high", "critical"] as const;
  const byPriority = priorities.map(p => ({
    priority: p,
    count: allTickets.filter(t => t.priority === p).length,
  }));

  res.json({ total, open, inProgress, resolved, critical, avgResolutionHours: Math.round(avgResolutionHours * 10) / 10, byCategory, byPriority });
});

router.get("/", requireAuth, async (req, res) => {
  const { status, priority, category, assignedTo } = req.query;
  let query = db.select().from(ticketsTable);

  const conditions = [];
  if (req.user!.role === "user") {
    conditions.push(eq(ticketsTable.createdById, req.user!.userId));
  }
  if (status) conditions.push(eq(ticketsTable.status, status as any));
  if (priority) conditions.push(eq(ticketsTable.priority, priority as any));
  if (category) conditions.push(eq(ticketsTable.category, category as any));
  if (assignedTo) conditions.push(eq(ticketsTable.assignedToId, Number(assignedTo)));

  const tickets = conditions.length > 0
    ? await db.select().from(ticketsTable).where(and(...conditions))
    : await db.select().from(ticketsTable);

  const withRelations = await Promise.all(tickets.map(t => getTicketWithRelations(t.id)));
  res.json(withRelations.filter(Boolean));
});

router.post("/", requireAuth, async (req, res) => {
  const parsed = ticketInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }
  const { title, description, category, assetId } = parsed.data;
  const priority = detectCritical(description) ? "critical" : "medium";

  const [ticket] = await db.insert(ticketsTable).values({
    title,
    description,
    category,
    priority,
    status: "open",
    createdById: req.user!.userId,
    assetId: assetId ?? null,
  }).returning();

  const full = await getTicketWithRelations(ticket.id);

  if (priority === "critical") {
    await sendTelegramAlert(
      `🚨 <b>TICKET CRÍTICO #${ticket.id}</b>\n<b>${title}</b>\nCategoría: ${category}\n${description.slice(0, 200)}`
    );
  }

  const [creator] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);
  await sendEmailNotification(
    creator.email,
    `Ticket #${ticket.id} creado - ${title}`,
    buildTicketEmailHtml({ id: ticket.id, title, category, priority, status: "open", description, createdBy: creator.name })
  );

  res.status(201).json(full);
});

router.get("/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const ticket = await getTicketWithRelations(id);
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
  if (req.user!.role === "user" && ticket.createdById !== req.user!.userId) {
    res.status(403).json({ error: "Forbidden" }); return;
  }
  res.json(ticket);
});

router.patch("/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = ticketUpdateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

  const updates: Record<string, any> = { ...parsed.data, updatedAt: new Date() };

  if (parsed.data.status === "resolved") {
    updates.resolvedAt = new Date();

    const [creator] = await db.select().from(usersTable).where(
      eq(usersTable.id, (await db.select({ createdById: ticketsTable.createdById }).from(ticketsTable).where(eq(ticketsTable.id, id)).limit(1))[0]?.createdById)
    ).limit(1);
    if (creator) {
      const [ticket] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, id)).limit(1);
      if (ticket) {
        await sendEmailNotification(
          creator.email,
          `Ticket #${id} resuelto - ${ticket.title}`,
          buildTicketEmailHtml({ id, title: ticket.title, category: ticket.category, priority: ticket.priority, status: "resolved", description: ticket.description, createdBy: creator.name })
        );
      }
    }
  }

  await db.update(ticketsTable).set(updates).where(eq(ticketsTable.id, id));
  const full = await getTicketWithRelations(id);
  if (!full) { res.status(404).json({ error: "Ticket not found" }); return; }
  res.json(full);
});

router.delete("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(ticketsTable).where(eq(ticketsTable.id, id));
  res.status(204).send();
});

router.get("/:id/comments", requireAuth, async (req, res) => {
  const ticketId = Number(req.params.id);
  const comments = await db.select().from(commentsTable).where(eq(commentsTable.ticketId, ticketId));
  const withUsers = await Promise.all(comments.map(async (c) => {
    const [u] = await db.select({ id: usersTable.id, name: usersTable.name, role: usersTable.role })
      .from(usersTable).where(eq(usersTable.id, c.userId)).limit(1);
    return { ...c, user: u || null };
  }));
  res.json(withUsers);
});

router.post("/:id/comments", requireAuth, async (req, res) => {
  const ticketId = Number(req.params.id);
  const { content } = req.body;
  if (!content || typeof content !== "string") {
    res.status(400).json({ error: "Content required" }); return;
  }
  const [comment] = await db.insert(commentsTable).values({
    ticketId,
    userId: req.user!.userId,
    content,
  }).returning();
  const [u] = await db.select({ id: usersTable.id, name: usersTable.name, role: usersTable.role })
    .from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);
  res.status(201).json({ ...comment, user: u || null });
});

router.post("/:id/rating", requireAuth, async (req, res) => {
  const ticketId = Number(req.params.id);
  const { stars } = req.body;
  if (!stars || stars < 1 || stars > 5) {
    res.status(400).json({ error: "Stars must be 1-5" }); return;
  }
  const [ticket] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, ticketId)).limit(1);
  if (!ticket || ticket.status !== "resolved") {
    res.status(400).json({ error: "Ticket must be resolved to rate" }); return;
  }
  if (ticket.createdById !== req.user!.userId) {
    res.status(403).json({ error: "Only ticket creator can rate" }); return;
  }
  const [rating] = await db.insert(ratingsTable).values({
    ticketId,
    userId: req.user!.userId,
    stars,
  }).returning();
  res.status(201).json(rating);
});

export default router;
