import { NextResponse } from 'next/server';

// export const runtime = 'nodejs';

const LIMITS = { name: 80, email: 120, message: 3000 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Best-effort abuse guard (per server instance): 5 messages per IP per 10 minutes
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function tooMany(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 500) {
    for (const [key, times] of hits) {
      if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(key);
    }
  }
  return recent.length > MAX_PER_WINDOW;
}

const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string
  );

const oneLine = (s: string) => s.replace(/[\r\n]+/g, ' ').trim();

const fail = (error: string, status: number) =>
  NextResponse.json({ ok: false, error }, { status });

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return fail('Invalid request.', 400);
  }

  // Honeypot: bots fill hidden fields. Pretend success, send nothing.
  if (typeof body.website === 'string' && body.website.trim()) {
    return NextResponse.json({ ok: true });
  }

  const name = typeof body.name === 'string' ? oneLine(body.name) : '';
  const email = typeof body.email === 'string' ? oneLine(body.email) : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';

  if (!name || !message) return fail('Name and message are required.', 400);
  if (!EMAIL_RE.test(email)) return fail('A valid email is required.', 400);
  if (name.length > LIMITS.name || email.length > LIMITS.email || message.length > LIMITS.message) {
    return fail('Message is too long.', 400);
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (tooMany(ip)) return fail('Too many messages. Please try again later.', 429);

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL || 'Portfolio <onboarding@resend.dev>';
  if (!apiKey || !to) {
    console.error('[contact] RESEND_API_KEY or CONTACT_TO_EMAIL is not set');
    return fail('Contact service is not configured.', 500);
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email, // hitting "Reply" in your inbox answers the visitor
        subject: `Portfolio message from ${name}`,
        text: `From: ${name} <${email}>\n\n${message}`,
        html: `<p><strong>${escapeHtml(name)}</strong> &lt;${escapeHtml(email)}&gt;</p><p style="white-space:pre-wrap">${escapeHtml(message)}</p>`,
      }),
    });

    if (!res.ok) {
      console.error('[contact] Resend error', res.status, await res.text());
      return fail('Could not send the message.', 502);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[contact] network error', err);
    return fail('Could not send the message.', 502);
  }
}