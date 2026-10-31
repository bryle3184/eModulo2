import { db, addNotification, ensurePreferences, getUserById, now, recordEvent } from './db.js';
import { BADGES, getBadge } from './content/badges.js';
import { LESSONS, SECTIONS } from './content/lessons.js';
export const SESSION_COOKIE = 'emodulo_session';
export const SESSION_DAYS = 30;
export const INSTRUCTOR_EMAIL = 'instructor@emodulo.edu';
export async function publicUser(user) {
    const prefs = (await db.prepare('SELECT * FROM preferences WHERE user_id = $1').get(user.id));
    return {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        fullName: `${user.first_name} ${user.last_name}`.trim() || user.email,
        occupation: user.occupation,
        bio: user.bio,
        avatar: user.avatar,
        role: user.role,
        level: user.level,
        createdAt: user.created_at,
        preferences: prefs
            ? {
                theme: prefs.theme,
                motivational: !!prefs.motivational,
                pace: prefs.pace,
                dailyReminders: !!prefs.daily_reminders,
                weeklyReminders: !!prefs.weekly_reminders,
                emailAnnouncements: !!prefs.email_announcements,
                emailProgress: !!prefs.email_progress,
                weeklyGoal: prefs.weekly_goal,
            }
            : null,
    };
}
export function currentUser(req) {
    if (!req.user)
        throw new HttpError(401, 'You need to sign in to continue.');
    return req.user;
}
export class HttpError extends Error {
    status;
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}
/** Resolves the signed-in user from the session cookie without throwing. */
export async function loadSessionUser(req) {
    const token = req.cookies?.[SESSION_COOKIE];
    if (!token)
        return undefined;
    const row = (await db
        .prepare('SELECT user_id, expires_at FROM sessions WHERE token = $1')
        .get(token));
    if (!row)
        return undefined;
    if (row.expires_at < now()) {
        await db.prepare('DELETE FROM sessions WHERE token = $1').run(token);
        return undefined;
    }
    const user = await getUserById(row.user_id);
    if (!user)
        return undefined;
    await ensurePreferences(user.id);
    return user;
}
export async function authRequired(req, res, next) {
    if (!req.cookies?.[SESSION_COOKIE]) {
        next(new HttpError(401, 'You need to sign in to continue.'));
        return;
    }
    const user = await loadSessionUser(req);
    if (!user) {
        res.clearCookie(SESSION_COOKIE);
        next(new HttpError(401, 'Your session has expired. Please sign in again.'));
        return;
    }
    req.user = user;
    next();
}
export async function createSession(userId) {
    const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
    const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
    await db
        .prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES ($1, $2, $3, $4)')
        .run(token, userId, now(), expires.toISOString());
    return { token, expiresAt: expires };
}
export async function completedLessonSlugs(userId) {
    const rows = (await db.prepare('SELECT lesson_slug FROM lesson_progress WHERE user_id = $1').all(userId));
    return new Set(rows.map((r) => r.lesson_slug));
}
export async function earnedBadgeSlugs(userId) {
    const rows = (await db.prepare('SELECT badge_slug FROM user_badges WHERE user_id = $1').all(userId));
    return new Set(rows.map((r) => r.badge_slug));
}
/** Awards a badge once. Returns true when it was newly earned. */
export async function awardBadge(userId, slug) {
    const badge = getBadge(slug);
    if (!badge)
        return false;
    const result = await db
        .prepare('INSERT INTO user_badges (user_id, badge_slug, earned_at) VALUES ($1, $2, $3) ON CONFLICT (user_id, badge_slug) DO NOTHING')
        .run(userId, slug, now());
    const r = result;
    if (!r || r.rowsAffected === 0)
        return false;
    addNotification(userId, 'badge', `New badge unlocked: ${badge.name}`, badge.description, '/badges');
    recordEvent(userId, 'badge', `Earned the ${badge.name} badge`, badge.condition, 25);
    return true;
}
/** After a section is fully read, award its completion badge. */
export async function checkSectionBadges(userId) {
    const completed = await completedLessonSlugs(userId);
    const awarded = [];
    for (const section of SECTIONS) {
        if (!section.badge)
            continue;
        const lessons = LESSONS.filter((l) => l.sectionSlug === section.slug);
        const done = lessons.every((l) => completed.has(l.slug));
        if (done && (await awardBadge(userId, section.badge)))
            awarded.push(section.badge);
    }
    return awarded;
}
export async function completeLesson(userId, slug) {
    await db
        .prepare('INSERT INTO lesson_progress (user_id, lesson_slug, completed_at) VALUES ($1, $2, $3) ON CONFLICT (user_id, lesson_slug) DO NOTHING')
        .run(userId, slug, now());
}
export function levelOf(user) {
    return user.level ?? 'easy';
}
export async function streakInfo(userId) {
    const rows = (await db
        .prepare("SELECT DISTINCT substr(created_at, 1, 10) AS day FROM learning_events WHERE user_id = $1 ORDER BY day DESC")
        .all(userId));
    const days = rows.map((r) => r.day);
    if (days.length === 0)
        return { current: 0, longest: 0, activeToday: false };
    const dayMs = 24 * 60 * 60 * 1000;
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - dayMs).toISOString().slice(0, 10);
    const activeToday = days.includes(today);
    let current = 0;
    let cursor = activeToday ? today : days.includes(yesterday) ? yesterday : null;
    while (cursor && days.includes(cursor)) {
        current += 1;
        cursor = new Date(new Date(`${cursor}T00:00:00Z`).getTime() - dayMs).toISOString().slice(0, 10);
    }
    let longest = 1;
    let run = 1;
    const ascending = [...days].sort();
    for (let i = 1; i < ascending.length; i += 1) {
        const prev = new Date(`${ascending[i - 1]}T00:00:00Z`).getTime();
        const cur = new Date(`${ascending[i]}T00:00:00Z`).getTime();
        if (cur - prev === dayMs)
            run += 1;
        else
            run = 1;
        longest = Math.max(longest, run);
    }
    return { current, longest, activeToday };
}
export function levelLabel(level) {
    return level.charAt(0).toUpperCase() + level.slice(1);
}
export function badgeCatalog() {
    return BADGES;
}
export function parseJson(value, fallback) {
    if (typeof value !== 'string' || !value)
        return fallback;
    try {
        return JSON.parse(value);
    }
    catch {
        return fallback;
    }
}
