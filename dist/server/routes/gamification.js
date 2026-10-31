import { Router } from 'express';
import { z } from 'zod';
import PDFDocument from 'pdfkit';
import { db, now, recordEvent } from '../db.js';
import { BADGES, CERTIFICATE_BADGES, badgesForLevel, getBadge } from '../content/badges.js';
import { LESSONS } from '../content/lessons.js';
import { LEVELS, LEVEL_ORDER, isLevel } from '../content/levels.js';
import { HttpError, authRequired, completedLessonSlugs, currentUser, earnedBadgeSlugs, levelOf, } from '../lib.js';
export const gamificationRouter = Router();
gamificationRouter.use(authRequired);
gamificationRouter.get('/badges', async (req, res) => {
    const user = currentUser(req);
    const earned = await earnedBadgeSlugs(user.id);
    const earnedRows = (await db
        .prepare('SELECT badge_slug, earned_at FROM user_badges WHERE user_id = ?')
        .all(user.id));
    const earnedAt = new Map(earnedRows.map((r) => [r.badge_slug, r.earned_at]));
    res.json({
        total: BADGES.length,
        earned: earned.size,
        levels: LEVEL_ORDER.map((level) => {
            const list = badgesForLevel(level).map((b) => ({
                ...b,
                earned: earned.has(b.slug),
                earnedAt: earnedAt.get(b.slug) ?? null,
                certificateRequired: CERTIFICATE_BADGES[level].includes(b.slug),
            }));
            return {
                level,
                label: LEVELS[level].name,
                accent: LEVELS[level].accent,
                earned: list.filter((b) => b.earned).length,
                total: list.length,
                badges: list,
            };
        }),
    });
});
export async function certificateRequirements(userId, level) {
    const completed = await completedLessonSlugs(userId);
    const earned = await earnedBadgeSlugs(userId);
    const lessonsDone = LESSONS.every((l) => completed.has(l.slug));
    const reqs = [
        {
            key: 'lessons',
            label: 'Finish the module',
            detail: `${completed.size} of ${LESSONS.length} lessons complete`,
            done: lessonsDone,
        },
    ];
    const pretestBadge = CERTIFICATE_BADGES[level][0];
    const posttestBadge = CERTIFICATE_BADGES[level][5];
    const activityBadges = CERTIFICATE_BADGES[level].slice(1, 5);
    const def = getBadge(pretestBadge);
    reqs.push({
        key: pretestBadge,
        label: `Earn ${def?.name ?? 'the pre-test badge'}`,
        detail: def?.condition ?? '',
        done: earned.has(pretestBadge),
    });
    for (const slug of activityBadges) {
        const b = getBadge(slug);
        reqs.push({
            key: slug,
            label: `Earn ${b?.name ?? 'the activity badge'}`,
            detail: b?.condition ?? '',
            done: earned.has(slug),
        });
    }
    const post = getBadge(posttestBadge);
    reqs.push({
        key: posttestBadge,
        label: `Earn ${post?.name ?? 'the post-test badge'}`,
        detail: post?.condition ?? '',
        done: earned.has(posttestBadge),
    });
    return reqs;
}
function certificatePayload(row, name) {
    return {
        id: row.id,
        code: row.code,
        level: row.level,
        levelLabel: LEVELS[row.level]?.name ?? row.level,
        issuedAt: row.issued_at,
        recipient: name,
        title: 'Certificate of Completion',
        programme: 'Object-Oriented Programming with C++',
        hours: Math.round(LESSONS.reduce((s, l) => s + l.minutes, 0) / 60),
    };
}
gamificationRouter.get('/certificate', async (req, res) => {
    const user = currentUser(req);
    const level = levelOf(user);
    const requirements = await certificateRequirements(user.id, level);
    const eligible = requirements.every((r) => r.done);
    const existing = (await db
        .prepare('SELECT id, code, level, issued_at FROM certificates WHERE user_id = ? ORDER BY id DESC')
        .all(user.id));
    const name = `${user.first_name} ${user.last_name}`.trim() || user.email;
    const allLevels = await Promise.all(LEVEL_ORDER.map(async (lvl) => ({
        level: lvl,
        label: LEVELS[lvl].name,
        eligible: (await certificateRequirements(user.id, lvl)).every((r) => r.done),
        issued: existing.some((c) => c.level === lvl),
    })));
    res.json({
        level,
        levelLabel: LEVELS[level].name,
        eligible,
        requirements,
        completedRequirements: requirements.filter((r) => r.done).length,
        totalRequirements: requirements.length,
        certificates: existing.map((c) => certificatePayload(c, name)),
        allLevels,
        module: {
            lessons: LESSONS.length,
            estimatedHours: Math.round(LESSONS.reduce((s, l) => s + l.minutes, 0) / 60),
        },
    });
});
gamificationRouter.post('/certificate/issue', async (req, res, next) => {
    try {
        const user = currentUser(req);
        const { level } = z.object({ level: z.string() }).parse(req.body ?? {});
        if (!isLevel(level))
            throw new HttpError(400, 'Choose a difficulty level for the certificate.');
        const requirements = await certificateRequirements(user.id, level);
        const missing = requirements.filter((r) => !r.done);
        if (missing.length > 0) {
            throw new HttpError(400, `Your certificate is not ready yet. ${missing.map((m) => m.label).join(' • ')}`);
        }
        const existing = (await db
            .prepare('SELECT id, code, level, issued_at FROM certificates WHERE user_id = ? AND level = ?')
            .get(user.id, level));
        const name = `${user.first_name} ${user.last_name}`.trim() || user.email;
        if (existing) {
            res.json({ certificate: certificatePayload(existing, name), alreadyIssued: true });
            return;
        }
        const code = `EM-${level.slice(0, 4).toUpperCase()}-${crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
        await db
            .prepare('INSERT INTO certificates (user_id, level, code, issued_at) VALUES ($1, $2, $3, $4)')
            .run(user.id, level, code, now());
        const row = (await db
            .prepare('SELECT id, code, level, issued_at FROM certificates WHERE user_id = $1 AND level = $2')
            .get(user.id, level));
        await db
            .prepare('INSERT INTO notifications (user_id, type, title, body, link, created_at) VALUES ($1, $2, $3, $4, $5, $6)')
            .run(user.id, 'certificate', 'Your certificate is ready', `Certificate ${code} for the ${LEVELS[level].name} track has been issued.`, '/certificate', now());
        await recordEvent(user.id, 'certificate', `Earned the ${LEVELS[level].name} certificate`, code, 100);
        res.status(201).json({ certificate: certificatePayload(row, name), alreadyIssued: false });
    }
    catch (err) {
        next(err);
    }
});
gamificationRouter.get('/certificates/:code', async (req, res, next) => {
    try {
        const user = currentUser(req);
        const row = (await db
            .prepare(`SELECT c.id, c.code, c.level, c.issued_at, u.first_name, u.last_name, u.email
         FROM certificates c JOIN users u ON u.id = c.user_id WHERE c.code = ?`)
            .get(req.params.code));
        if (!row)
            throw new HttpError(404, 'That certificate does not exist.');
        const owner = (await db.prepare('SELECT user_id FROM certificates WHERE code = ?').get(req.params.code));
        if (owner.user_id !== user.id && user.role !== 'instructor') {
            throw new HttpError(403, 'You do not have access to this certificate.');
        }
        res.json({ certificate: certificatePayload(row, `${row.first_name} ${row.last_name}`.trim() || row.email) });
    }
    catch (err) {
        next(err);
    }
});
gamificationRouter.get('/certificates/:code/pdf', async (req, res, next) => {
    try {
        const user = currentUser(req);
        const row = (await db
            .prepare(`SELECT c.id, c.code, c.level, c.issued_at, c.user_id, u.first_name, u.last_name, u.email
         FROM certificates c JOIN users u ON u.id = c.user_id WHERE c.code = ?`)
            .get(req.params.code));
        if (!row)
            throw new HttpError(404, 'That certificate does not exist.');
        if (row.user_id !== user.id && user.role !== 'instructor') {
            throw new HttpError(403, 'You do not have access to this certificate.');
        }
        const name = `${row.first_name} ${row.last_name}`.trim() || row.email;
        const levelName = LEVELS[row.level]?.name ?? row.level;
        const issued = new Date(row.issued_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
        const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="emodulo-certificate-${row.code}.pdf"`);
        doc.pipe(res);
        const W = doc.page.width;
        const H = doc.page.height;
        doc.rect(0, 0, W, H).fill('#0b1220');
        doc.rect(28, 28, W - 56, H - 56).lineWidth(1.5).strokeColor('#2f6bff').stroke();
        doc.rect(38, 38, W - 76, H - 76).lineWidth(0.6).strokeColor('#3b4a63').stroke();
        doc.fillColor('#8ea6c8').font('Helvetica-Bold').fontSize(10)
            .text('eMÓDULO · LEARN OBJECT-ORIENTED PROGRAMMING', 0, 70, { align: 'center', characterSpacing: 2.4 });
        doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(40)
            .text('Certificate of Completion', 0, 100, { align: 'center' });
        doc.fillColor('#8ea6c8').font('Helvetica').fontSize(12)
            .text('This certifies that', 0, 165, { align: 'center' });
        doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(30)
            .text(name, 0, 190, { align: 'center' });
        doc.fillColor('#8ea6c8').font('Helvetica').fontSize(12)
            .text('has successfully completed the eMódulo programme', 0, 235, { align: 'center' });
        doc.fillColor('#9dc0ff').font('Helvetica-Bold').fontSize(17)
            .text('Object-Oriented Programming with C++', 0, 258, { align: 'center' });
        doc.fillColor('#8ea6c8').font('Helvetica').fontSize(11)
            .text(`Encapsulation · Abstraction · Inheritance · Polymorphism  —  ${levelName} track`, 0, 283, { align: 'center' });
        // Institute seal
        doc.save();
        doc.circle(W / 2, H - 125, 34).lineWidth(1).strokeColor('#2f6bff').stroke();
        doc.circle(W / 2, H - 125, 27).lineWidth(0.6).strokeColor('#3b4a63').stroke();
        doc.fillColor('#9dc0ff').font('Helvetica-Bold').fontSize(9)
            .text('eMÓDULO', W / 2 - 40, H - 132, { width: 80, align: 'center' });
        doc.fillColor('#8ea6c8').font('Helvetica').fontSize(7)
            .text('VERIFIED', W / 2 - 40, H - 119, { width: 80, align: 'center' });
        doc.restore();
        doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(10)
            .text('Date issued', 90, H - 115, { width: 180 });
        doc.fillColor('#8ea6c8').font('Helvetica').fontSize(10)
            .text(issued, 90, H - 100, { width: 180 });
        doc.moveTo(90, H - 78).lineTo(270, H - 78).lineWidth(0.6).strokeColor('#3b4a63').stroke();
        doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(10)
            .text('Certificate ID', W - 270, H - 115, { width: 180, align: 'right' });
        doc.fillColor('#8ea6c8').font('Helvetica').fontSize(10)
            .text(row.code, W - 270, H - 100, { width: 180, align: 'right' });
        doc.moveTo(W - 270, H - 78).lineTo(W - 90, H - 78).lineWidth(0.6).strokeColor('#3b4a63').stroke();
        doc.fillColor('#5d7392').font('Helvetica').fontSize(8)
            .text(`Verify this certificate at eModulo using ID ${row.code}. Issued to ${name} for completing all module lessons, activities, and assessments at ${levelName} level.`, 70, H - 58, { width: W - 140, align: 'center' });
        doc.end();
    }
    catch (err) {
        next(err);
    }
});
