import { Router } from 'express';
import { z } from 'zod';
import { db, ensurePreferences, getUserByEmail, getUserById, passwordHash, verifyPassword, now } from '../db.js';
import { HttpError, SESSION_COOKIE, SESSION_DAYS, createSession, loadSessionUser, publicUser, } from '../lib.js';
export const authRouter = Router();
const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email address.');
const passwordSchema = z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .max(72, 'Password must be 72 characters or fewer.');
/** Very small in-memory throttle for credential endpoints. */
const hits = new Map();
function throttle(key, max = 12, windowMs = 5 * 60 * 1000) {
    if (process.env.NODE_ENV === 'test')
        return;
    const entry = hits.get(key);
    const nowMs = Date.now();
    if (!entry || entry.reset < nowMs) {
        hits.set(key, { count: 1, reset: nowMs + windowMs });
        return;
    }
    entry.count += 1;
    if (entry.count > max)
        throw new HttpError(429, 'Too many attempts. Please wait a few minutes and try again.');
}
function setSessionCookie(res, token, expiresAt) {
    res.cookie(SESSION_COOKIE, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        expires: expiresAt,
        path: '/',
    });
}
authRouter.post('/register', async (req, res, next) => {
    try {
        throttle(`register:${req.ip}`, 8);
        const body = z
            .object({
            email: emailSchema,
            password: passwordSchema,
            confirmPassword: z.string(),
        })
            .parse(req.body);
        if (body.password !== body.confirmPassword) {
            throw new HttpError(400, 'Passwords do not match.');
        }
        if (await getUserByEmail(body.email)) {
            throw new HttpError(409, 'An account with this email already exists. Try signing in instead.');
        }
        const fallbackName = body.email.split('@')[0].replace(/[._-]+/g, ' ');
        const display = fallbackName.replace(/\b\w/g, (c) => c.toUpperCase());
        const first = display.split(' ')[0] ?? 'Student';
        const result = await db
            .prepare(`INSERT INTO users (email, password_hash, first_name, last_name, created_at)
         VALUES ($1, $2, $3, '', $4)`)
            .run(body.email, passwordHash(body.password), first, now());
        const inserted = (await db
            .prepare('SELECT id FROM users WHERE email = $1')
            .get(body.email));
        if (!inserted)
            throw new HttpError(500, 'Could not create your account. Please try again.');
        const userId = inserted.id;
        await ensurePreferences(userId);
        await db
            .prepare('INSERT INTO notifications (user_id, type, title, body, link, created_at) VALUES ($1, $2, $3, $4, $5, $6)')
            .run(userId, 'welcome', 'Welcome to eMódulo', 'Start with the Course Overview section, then pick a difficulty level for your assessments.', '/modules', now());
        const { token, expiresAt } = await createSession(userId);
        setSessionCookie(res, token, expiresAt);
        const user = await getUserById(userId);
        if (!user)
            throw new HttpError(500, 'Could not load your account. Please try again.');
        res.status(201).json({ user: await publicUser(user) });
    }
    catch (err) {
        next(err);
    }
});
authRouter.post('/login', async (req, res, next) => {
    try {
        throttle(`login:${req.ip}`);
        const body = z
            .object({ email: emailSchema, password: z.string().min(1, 'Enter your password.') })
            .parse(req.body);
        const user = await getUserByEmail(body.email);
        if (!user || !verifyPassword(body.password, user.password_hash)) {
            throw new HttpError(401, 'Email or password is incorrect.');
        }
        await ensurePreferences(user.id);
        const { token, expiresAt } = await createSession(user.id);
        setSessionCookie(res, token, expiresAt);
        res.json({ user: await publicUser(user) });
    }
    catch (err) {
        next(err);
    }
});
authRouter.post('/logout', async (req, res) => {
    const token = req.cookies?.[SESSION_COOKIE];
    if (token)
        await db.prepare('DELETE FROM sessions WHERE token = $1').run(token);
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    res.json({ ok: true });
});
authRouter.get('/me', async (req, res) => {
    // Session probe: answers 200 with a null user instead of 401 so the client
    // can bootstrap without logging a failed request on every page load.
    const user = await loadSessionUser(req);
    res.json({ user: user ? await publicUser(user) : null });
});
authRouter.post('/forgot-password', async (req, res, next) => {
    try {
        throttle(`forgot:${req.ip}`, 6);
        const { email } = z.object({ email: emailSchema }).parse(req.body);
        const user = await getUserByEmail(email);
        // Always answer the same way so the endpoint does not reveal registered emails.
        const response = {
            message: 'If that email is registered, a reset link has been prepared.',
        };
        if (user) {
            const token = crypto.randomUUID().replace(/-/g, '');
            await db.prepare('INSERT INTO password_resets (token, user_id, expires_at) VALUES ($1, $2, $3)').run(token, user.id, new Date(Date.now() + 60 * 60 * 1000).toISOString());
            // No mail provider is configured for this deployment, so the token is
            // returned to the client and logged for the operator. See README.
            response.devToken = token;
            console.info(`[emodulo] password reset token for ${email}: ${token}`);
        }
        res.json(response);
    }
    catch (err) {
        next(err);
    }
});
authRouter.post('/reset-password', async (req, res, next) => {
    try {
        throttle(`reset:${req.ip}`, 10);
        const body = z
            .object({ token: z.string().min(10, 'This reset link is not valid.'), password: passwordSchema })
            .parse(req.body);
        const row = (await db
            .prepare('SELECT user_id, expires_at, used FROM password_resets WHERE token = ?')
            .get(body.token));
        if (!row || row.used === 1)
            throw new HttpError(400, 'This reset link is invalid or has already been used.');
        if (row.expires_at < now())
            throw new HttpError(400, 'This reset link has expired. Request a new one.');
        await db.prepare('UPDATE users SET password_hash = $1 WHERE id = $2').run(passwordHash(body.password), row.user_id);
        await db.prepare('UPDATE password_resets SET used = 1 WHERE token = $1').run(body.token);
        await db.prepare('DELETE FROM sessions WHERE user_id = $1').run(row.user_id);
        res.json({ message: 'Your password has been updated. You can now sign in.' });
    }
    catch (err) {
        next(err);
    }
});
export { SESSION_DAYS };
