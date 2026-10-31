import { Router } from 'express';
import { z } from 'zod';
import { db, now } from '../db.js';
import { HttpError, authRequired, currentUser, INSTRUCTOR_EMAIL } from '../lib.js';

export const socialRouter = Router();
socialRouter.use(authRequired);

// ── Notifications ──────────────────────────────────────────────────────────

socialRouter.get('/notifications', async (req, res) => {
  const user = currentUser(req);
  const rows = (await db
    .prepare('SELECT * FROM notifications WHERE user_id = $1 ORDER BY id DESC LIMIT 60')
    .all(user.id)) as {
    id: number;
    type: string;
    title: string;
    body: string;
    link: string | null;
    read_at: string | null;
    created_at: string;
  }[];
  res.json({
    unread: rows.filter((r) => !r.read_at).length,
    notifications: rows.map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      body: r.body,
      link: r.link,
      read: !!r.read_at,
      createdAt: r.created_at,
    })),
  });
});

socialRouter.post('/notifications/:id/read', async (req, res, next) => {
  try {
    const user = currentUser(req);
    const result = await db
      .prepare('UPDATE notifications SET read_at = $1 WHERE id = $2 AND user_id = $3 AND read_at IS NULL')
      .run(now(), Number(req.params.id), user.id);
    if ((result as { rowsAffected?: number }).rowsAffected === 0) {
      const exists = await db
        .prepare('SELECT 1 FROM notifications WHERE id = $1 AND user_id = $2')
        .get(Number(req.params.id), user.id);
      if (!exists) throw new HttpError(404, 'Notification not found.');
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

socialRouter.post('/notifications/read-all', async (req, res) => {
  const user = currentUser(req);
  await db.prepare('UPDATE notifications SET read_at = $1 WHERE user_id = $2 AND read_at IS NULL').run(now(), user.id);
  res.json({ ok: true });
});

socialRouter.get('/announcements', async (_req, res) => {
  const rows = (await db.prepare('SELECT * FROM announcements ORDER BY id DESC').all()) as {
    id: number;
    title: string;
    body: string;
    author: string;
    created_at: string;
  }[];
  res.json({
    announcements: rows.map((r) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      author: r.author,
      createdAt: r.created_at,
    })),
  });
});

// ── Messaging ──────────────────────────────────────────────────────────────

async function instructorId(): Promise<number> {
  const row = (await db.prepare('SELECT id FROM users WHERE email = $1').get(INSTRUCTOR_EMAIL)) as { id: number } | undefined;
  if (!row) throw new HttpError(500, 'The instructor account is not configured.');
  return row.id;
}

async function threadSummaries(userId: number, search?: string) {
  const rows = (await db
    .prepare(
      `SELECT t.*,
        CASE WHEN t.student_id = $2 THEN i.first_name || ' ' || i.last_name ELSE s.first_name || ' ' || s.last_name END AS other_name,
        CASE WHEN t.student_id = $3 THEN i.avatar ELSE s.avatar END AS other_avatar,
        (SELECT body FROM messages m WHERE m.thread_id = t.id ORDER BY m.id DESC LIMIT 1) AS last_body,
        (SELECT created_at FROM messages m WHERE m.thread_id = t.id ORDER BY m.id DESC LIMIT 1) AS last_at,
        (SELECT COUNT(*) FROM messages m WHERE m.thread_id = t.id AND m.sender_id != $4 AND m.read_at IS NULL) AS unread
       FROM threads t
       JOIN users s ON s.id = t.student_id
       JOIN users i ON i.id = t.instructor_id
       WHERE t.student_id = $1 OR t.instructor_id = $1
       ORDER BY t.updated_at DESC`,
    )
    .all(userId, userId, userId, userId)) as Record<string, unknown>[];

  const terms = (search ?? '').trim().toLowerCase();
  const matches: Record<string, unknown>[] = [];
  for (const r of rows) {
    if (
      !terms ||
      String(r.subject).toLowerCase().includes(terms) ||
      String(r.last_body ?? '').toLowerCase().includes(terms) ||
      !!(await db
        .prepare('SELECT 1 FROM messages WHERE thread_id = $1 AND lower(body) LIKE $2 LIMIT 1')
        .get(r.id as number, `%${terms}%`))
    ) {
      matches.push(r);
    }
  }
  return matches.map((r) => ({
    id: r.id as number,
    subject: r.subject as string,
    otherName: (r.other_name as string).trim(),
    otherAvatar: r.other_avatar as string,
    lastMessage: (r.last_body as string) ?? '',
    lastAt: (r.last_at as string) ?? (r.created_at as string),
    unread: r.unread as number,
    updatedAt: r.updated_at as string,
  }));
}

socialRouter.get('/messages/threads', async (req, res) => {
  const user = currentUser(req);
  const q = typeof req.query.q === 'string' ? req.query.q : '';
  const threads = await threadSummaries(user.id, q);
  const unread = threads.reduce((sum, t) => sum + t.unread, 0);
  res.json({ threads, unread });
});

socialRouter.get('/messages/threads/:id', async (req, res, next) => {
  try {
    const user = currentUser(req);
    const thread = (await db
      .prepare('SELECT * FROM threads WHERE id = $1 AND (student_id = $2 OR instructor_id = $3)')
      .get(Number(req.params.id), user.id, user.id)) as
      | { id: number; subject: string; student_id: number; instructor_id: number; created_at: string }
      | undefined;
    if (!thread) throw new HttpError(404, 'That conversation could not be found.');

    await db.prepare('UPDATE messages SET read_at = $1 WHERE thread_id = $2 AND sender_id != $3 AND read_at IS NULL')
      .run(now(), thread.id, user.id);

    const rows = (await db
      .prepare(
        `SELECT m.*, u.first_name, u.last_name, u.avatar, u.role FROM messages m
         JOIN users u ON u.id = m.sender_id WHERE m.thread_id = $1 ORDER BY m.id ASC`,
      )
      .all(thread.id)) as {
      id: number;
      sender_id: number;
      body: string;
      created_at: string;
      first_name: string;
      last_name: string;
      avatar: string;
      role: string;
    }[];

    const otherId = thread.student_id === user.id ? thread.instructor_id : thread.student_id;
    const other = (await db.prepare('SELECT first_name, last_name, avatar, role, occupation FROM users WHERE id = $1').get(otherId)) as {
      first_name: string;
      last_name: string;
      avatar: string;
      role: string;
      occupation: string;
    };

    res.json({
      thread: {
        id: thread.id,
        subject: thread.subject,
        createdAt: thread.created_at,
        other: {
          id: otherId,
          name: `${other.first_name} ${other.last_name}`.trim(),
          avatar: other.avatar,
          role: other.role,
          occupation: other.occupation,
        },
      },
      messages: rows.map((m) => ({
        id: m.id,
        body: m.body,
        createdAt: m.created_at,
        mine: m.sender_id === user.id,
        senderName: `${m.first_name} ${m.last_name}`.trim(),
        senderAvatar: m.avatar,
        senderRole: m.role,
      })),
    });
  } catch (err) {
    next(err);
  }
});

socialRouter.post('/messages/threads', async (req, res, next) => {
  try {
    const user = currentUser(req);
    const body = z
      .object({
        subject: z.string().trim().min(3, 'Add a subject.').max(120),
        body: z.string().trim().min(2, 'Write a message.').max(4000),
      })
      .parse(req.body);

    if (user.role === 'instructor') throw new HttpError(400, 'Instructors reply to existing conversations.');
    const instructor = await instructorId();
    const stamp = now();
    // `run()` only reports the affected row count, so `RETURNING id` has to be
    // read through `get()` to get the generated id back.
    const threadRow = (await db
      .prepare('INSERT INTO threads (subject, student_id, instructor_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5) RETURNING id')
      .get(body.subject, user.id, instructor, stamp, stamp)) as { id: number } | null;
    const threadId = threadRow?.id as number;
    await db.prepare('INSERT INTO messages (thread_id, sender_id, body, created_at) VALUES ($1, $2, $3, $4)')
      .run(threadId, user.id, body.body, stamp);
    const senderName = `${user.first_name} ${user.last_name}`.trim();
    await db.prepare('INSERT INTO notifications (user_id, type, title, body, link, created_at) VALUES ($1, $2, $3, $4, $5, $6)')
      .run(instructor, 'message', `New message from ${senderName}`, body.subject, '/messages', stamp);

    res.status(201).json({ threadId });
  } catch (err) {
    next(err);
  }
});

socialRouter.post('/messages/threads/:id/messages', async (req, res, next) => {
  try {
    const user = currentUser(req);
    const parsed = z.object({ body: z.string().trim().min(1, 'Write a message.').max(4000) }).parse(req.body);
    const messageBody = parsed.body;
    const thread = (await db
      .prepare('SELECT * FROM threads WHERE id = $1 AND (student_id = $2 OR instructor_id = $3)')
      .get(Number(req.params.id), user.id, user.id)) as
      | { id: number; student_id: number; instructor_id: number; subject: string }
      | undefined;
    if (!thread) throw new HttpError(404, 'That conversation could not be found.');

    const stamp = now();
    const msgRow = (await db
      .prepare('INSERT INTO messages (thread_id, sender_id, body, created_at) VALUES ($1, $2, $3, $4) RETURNING id')
      .get(thread.id, user.id, messageBody, stamp)) as { id: number } | null;
    const messageId = msgRow?.id as number;
    const otherId = thread.student_id === user.id ? thread.instructor_id : thread.student_id;
    const otherName = thread.student_id === user.id ? 'Instructor' : 'Student';
    const senderName = `${user.first_name} ${user.last_name}`.trim();
    await db.prepare('INSERT INTO notifications (user_id, type, title, body, link, created_at) VALUES ($1, $2, $3, $4, $5, $6)')
      .run(otherId, 'message', `New message from ${senderName}`, thread.subject, `/messages/${thread.id}`, stamp);
    if (thread.student_id !== user.id) {
      await db.prepare('INSERT INTO notifications (user_id, type, title, body, link, created_at) VALUES ($1, $2, $3, $4, $5, $6)')
        .run(thread.student_id, 'message', `New reply from ${otherName}`, thread.subject, `/messages/${thread.id}`, stamp);
    }

    res.status(201).json({
      message: {
        id: messageId,
        body: messageBody,
        createdAt: stamp,
        mine: true,
        senderName: `${user.first_name} ${user.last_name}`.trim(),
        senderAvatar: user.avatar,
        senderRole: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
});

socialRouter.get('/messages/search', async (req, res) => {
  const user = currentUser(req);
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (!q) {
    res.json({ threads: await threadSummaries(user.id), unread: 0 });
    return;
  }
  res.json({ threads: await threadSummaries(user.id, q) });
});

socialRouter.post('/support', async (req, res, next) => {
  try {
    const user = currentUser(req);
    const body = z
      .object({
        topic: z.string().trim().min(2, 'Choose a topic.').max(120),
        message: z.string().trim().min(5, 'Tell us a little more.').max(4000),
      })
      .parse(req.body);

    const instructor = await instructorId();
    const stamp = now();
    const threadRow = (await db
      .prepare('INSERT INTO threads (subject, student_id, instructor_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5) RETURNING id')
      .get(`Support: ${body.topic}`, user.id, instructor, stamp, stamp)) as { id: number } | null;
    const threadId = threadRow?.id as number;
    await db.prepare('INSERT INTO messages (thread_id, sender_id, body, created_at) VALUES ($1, $2, $3, $4)')
      .run(threadId, user.id, body.message, stamp);
    res.status(201).json({ ok: true, message: 'Your request has been sent to your instructor.' });
  } catch (err) {
    next(err);
  }
});
