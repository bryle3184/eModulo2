import { Router } from 'express';
import { z } from 'zod';
import { db, getUserByEmail, passwordHash, verifyPassword, type UserRow } from '../db.js';
import { HttpError, authRequired, currentUser, levelOf, publicUser } from '../lib.js';
import { BADGES } from '../content/badges.js';
import { LESSONS } from '../content/lessons.js';

export const accountRouter = Router();
accountRouter.use(authRequired);

const AVATARS = ['blue', 'emerald', 'violet', 'amber', 'rose', 'slate'];

accountRouter.get('/profile', async (req, res) => {
  const user = currentUser(req);
  const lessons = (await db
    .prepare('SELECT COUNT(*) AS c FROM lesson_progress WHERE user_id = $1')
    .get(user.id)) as { c: number };
  const badges = (await db.prepare('SELECT COUNT(*) AS c FROM user_badges WHERE user_id = $1').get(user.id)) as { c: number };
  const certs = (await db
    .prepare('SELECT code, level, issued_at FROM certificates WHERE user_id = $1 ORDER BY id DESC')
    .all(user.id)) as { code: string; level: string; issued_at: string }[];
  const events = (await db
    .prepare('SELECT COUNT(*) AS c FROM learning_events WHERE user_id = $1')
    .get(user.id)) as { c: number };

  res.json({
    user: await publicUser(user),
    stats: {
      lessonsCompleted: lessons.c,
      totalLessons: LESSONS.length,
      badges: badges.c,
      totalBadges: BADGES.length,
      activities: events.c,
      certificates: certs.map((c) => ({ code: c.code, level: c.level, issuedAt: c.issued_at })),
      level: levelOf(user),
    },
    avatars: AVATARS,
  });
});

accountRouter.put('/profile', async (req, res, next) => {
  try {
    const user = currentUser(req);
    const body = z
      .object({
        firstName: z.string().trim().min(1, 'First name is required.').max(60),
        lastName: z.string().trim().min(1, 'Last name is required.').max(60),
        occupation: z.string().trim().max(80).default(''),
        bio: z.string().trim().max(600, 'Keep your biography under 600 characters.').default(''),
        avatar: z.enum(['blue', 'emerald', 'violet', 'amber', 'rose', 'slate']).default('blue'),
      })
      .parse(req.body);

    await db.prepare(
      'UPDATE users SET first_name = $1, last_name = $2, occupation = $3, bio = $4, avatar = $5 WHERE id = $6',
    ).run(body.firstName, body.lastName, body.occupation, body.bio, body.avatar, user.id);

    const updated = await db.prepare('SELECT * FROM users WHERE id = $1').get(user.id);
    if (!updated) throw new HttpError(500, 'Could not reload your profile after saving.');
    res.json({ user: await publicUser(updated as unknown as UserRow), message: 'Profile updated.' });
  } catch (err) {
    next(err);
  }
});

accountRouter.put('/preferences', async (req, res, next) => {
  try {
    const user = currentUser(req);
    const body = z
      .object({
        theme: z.enum(['light', 'dark', 'system']).default('system'),
        motivational: z.boolean().default(true),
        pace: z.enum(['relaxed', 'steady', 'intensive']).default('steady'),
        dailyReminders: z.boolean().default(true),
        weeklyReminders: z.boolean().default(true),
        emailAnnouncements: z.boolean().default(true),
        emailProgress: z.boolean().default(false),
        weeklyGoal: z.number().int().min(1).max(21).default(5),
      })
      .parse(req.body);

    await db.prepare(
      `UPDATE preferences SET theme = $1, motivational = $2, pace = $3, daily_reminders = $4, weekly_reminders = $5,
       email_announcements = $6, email_progress = $7, weekly_goal = $8 WHERE user_id = $9`,
    ).run(
      body.theme,
      body.motivational ? 1 : 0,
      body.pace,
      body.dailyReminders ? 1 : 0,
      body.weeklyReminders ? 1 : 0,
      body.emailAnnouncements ? 1 : 0,
      body.emailProgress ? 1 : 0,
      body.weeklyGoal,
      user.id,
    );

    res.json({ preferences: (await publicUser(user)).preferences, message: 'Learning preferences saved.' });
  } catch (err) {
    next(err);
  }
});

accountRouter.put('/account/password', async (req, res, next) => {
  try {
    const user = currentUser(req);
    const body = z
      .object({
        currentPassword: z.string().min(1, 'Enter your current password.'),
        newPassword: z.string().min(8, 'New password must be at least 8 characters.').max(72),
        confirmPassword: z.string(),
      })
      .parse(req.body);

    if (!verifyPassword(body.currentPassword, user.password_hash)) {
      throw new HttpError(400, 'Your current password is incorrect.');
    }
    if (body.newPassword !== body.confirmPassword) throw new HttpError(400, 'New passwords do not match.');
    if (body.newPassword === body.currentPassword) {
      throw new HttpError(400, 'Choose a password that is different from your current one.');
    }

    await db.prepare('UPDATE users SET password_hash = $1 WHERE id = $2').run(passwordHash(body.newPassword), user.id);
    // Keep the current session, drop the others.
    const currentToken = req.cookies?.emodulo_session;
    await db.prepare('DELETE FROM sessions WHERE user_id = $1 AND token != $2').run(user.id, currentToken ?? '');
    res.json({ message: 'Password updated. Other devices have been signed out.' });
  } catch (err) {
    next(err);
  }
});

accountRouter.put('/account/email', async (req, res, next) => {
  try {
    const user = currentUser(req);
    const body = z
      .object({
        email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
        currentPassword: z.string().min(1, 'Confirm your password to change your email.'),
      })
      .parse(req.body);

    if (!verifyPassword(body.currentPassword, user.password_hash)) {
      throw new HttpError(400, 'Your password is incorrect.');
    }
    const existing = await getUserByEmail(body.email);
    if (existing && existing.id !== user.id) throw new HttpError(409, 'That email is already in use.');

    await db.prepare('UPDATE users SET email = $1 WHERE id = $2').run(body.email, user.id);
    const updated = await db.prepare('SELECT * FROM users WHERE id = $1').get(user.id);
    if (!updated) throw new HttpError(500, 'Could not reload your profile after saving.');
    res.json({ user: await publicUser(updated as unknown as UserRow), message: 'Email address updated.' });
  } catch (err) {
    next(err);
  }
});
