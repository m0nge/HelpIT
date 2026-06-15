import { logger } from "./logger";

export async function sendTelegramAlert(message: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    logger.warn("Telegram not configured (TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID missing)");
    return;
  }
  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "HTML" }),
    });
    if (!resp.ok) {
      logger.warn({ status: resp.status }, "Telegram send failed");
    }
  } catch (err) {
    logger.error({ err }, "Telegram alert error");
  }
}

export async function sendEmailNotification(
  to: string,
  subject: string,
  html: string
): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY || process.env.EMAIL_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || "noreply@helpit.app";
  if (!apiKey) {
    logger.warn("Email not configured (SENDGRID_API_KEY missing)");
    return;
  }
  try {
    const resp = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: fromEmail, name: "HelpIT" },
        subject,
        content: [{ type: "text/html", value: html }],
      }),
    });
    if (!resp.ok) {
      logger.warn({ status: resp.status }, "Email send failed");
    }
  } catch (err) {
    logger.error({ err }, "Email send error");
  }
}

export function buildTicketEmailHtml(ticket: {
  id: number;
  title: string;
  category: string;
  priority: string;
  status: string;
  description: string;
  createdBy: string;
}): string {
  const priorityColor = ticket.priority === "critical" ? "#ef4444" : ticket.priority === "high" ? "#f97316" : ticket.priority === "medium" ? "#3b82f6" : "#6b7280";
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family:Inter,sans-serif;background:#f9fafb;padding:32px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">
    <div style="background:#0B0F19;padding:24px 32px;">
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;letter-spacing:-0.5px;">HelpIT</h1>
      <p style="color:#6b7280;margin:4px 0 0;">Notificación de Ticket</p>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#111827;margin:0 0 8px;font-size:18px;">${ticket.title}</h2>
      <p style="color:#6b7280;margin:0 0 24px;font-size:14px;">Ticket #${ticket.id} · Creado por ${ticket.createdBy}</p>
      <div style="display:flex;gap:8px;margin-bottom:24px;flex-wrap:wrap;">
        <span style="background:#f3f4f6;color:#374151;padding:4px 12px;border-radius:20px;font-size:13px;">${ticket.category}</span>
        <span style="background:${priorityColor}20;color:${priorityColor};padding:4px 12px;border-radius:20px;font-size:13px;font-weight:600;">${ticket.priority.toUpperCase()}</span>
        <span style="background:#f3f4f6;color:#374151;padding:4px 12px;border-radius:20px;font-size:13px;">${ticket.status}</span>
      </div>
      <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:24px;">
        <p style="color:#374151;margin:0;font-size:14px;line-height:1.6;">${ticket.description}</p>
      </div>
      <a href="#" style="background:#3b82f6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">Ver Ticket</a>
    </div>
    <div style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
      <p style="color:#9ca3af;margin:0;font-size:12px;">HelpIT — Sistema de Mesa de Ayuda de TI</p>
    </div>
  </div>
</body>
</html>`;
}
