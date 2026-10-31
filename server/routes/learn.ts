import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { LEVELS, LEVEL_ORDER, isLevel, type LevelKey } from '../content/levels.js';
import { LESSONS, SECTIONS, TOTAL_MINUTES, getLesson } from '../content/lessons.js';
import { BADGES, badgesForLevel, CERTIFICATE_BADGES, getBadge } from '../content/badges.js';
import { ACTIVITIES } from '../content/activities.js';
import { ASSESSMENTS } from '../content/assessments.js';
import {
  HttpError,
  authRequired,
  awardBadge,
  checkSectionBadges,
  completeLesson,
  completedLessonSlugs,
  currentUser,
  earnedBadgeSlugs,
  levelLabel,
  levelOf,
  publicUser,
  streakInfo,
} from '../lib.js';
import { recordEvent } from '../db.js';

export const learnRouter = Router();
learnRouter.use(authRequired);

const TOTAL_LESSONS = LESSONS.length;

async function attemptsSummary(userId: number) {
  const rows = (await db
    .prepare(
      `SELECT ref_key, kind, level, MAX(score) AS best, MAX(total) AS total, MAX(passed) AS passed
       FROM attempts WHERE user_id = $1 AND status = 'completed' GROUP BY ref_key, kind, level`,
    )
    .all(userId)) as { ref_key: string; kind: string; level: string; best: number; total: number; passed: number }[];
  return rows;
}

async function activityProgress(userId: number, level: LevelKey) {
  return Promise.all(
    ACTIVITIES.filter((a) => a.level === level).map(async (a) => {
      const best = (await db
        .prepare(
          `SELECT score, total, passed, finished_at FROM attempts
         WHERE user_id = ? AND ref_key = ? AND status = 'completed'
         ORDER BY passed DESC, score DESC, id DESC LIMIT 1`,
        )
        .get(userId, a.key)) as { score: number; total: number; passed: number; finished_at: string } | null;
      const badge = getBadge(a.badge);
      return {
        key: a.key,
        concept: a.concept,
        passed: !!best?.passed,
        score: best?.score ?? null,
        total: best?.total ?? a.answers.length,
        finishedAt: best?.finished_at ?? null,
        badge: badge ? { slug: badge.slug, name: badge.name } : null,
      };
    }),
  );
}

learnRouter.get('/dashboard', async (req, res) => {
  const user = currentUser(req);
  const level = levelOf(user);
  const completed = await completedLessonSlugs(user.id);
  const earned = await earnedBadgeSlugs(user.id);
  const streak = await streakInfo(user.id);
  const prefs = (await db.prepare('SELECT weekly_goal FROM preferences WHERE user_id = $1').get(user.id)) as
    | { weekly_goal: number }
    | undefined;

  const concepts = SECTIONS.filter((s) => s.slug !== 'overview').map((section) => {
    const lessons = LESSONS.filter((l) => l.sectionSlug === section.slug);
    const done = lessons.filter((l) => completed.has(l.slug)).length;
    return {
      slug: section.slug,
      title: section.title,
      accent: section.accent,
      completed: done,
      total: lessons.length,
      percent: Math.round((done / lessons.length) * 100),
    };
  });

  const nextLesson = LESSONS.find((l) => !completed.has(l.slug)) ?? null;
  const attempts = await attemptsSummary(user.id);
  const scoreFor = (kind: string) => {
    const row = attempts.find((a) => a.ref_key === `${kind}-${level}`);
    return row ? { best: row.best, total: row.total, passed: !!row.passed } : null;
  };

  const weekStart = new Date();
  const day = weekStart.getUTCDay();
  const diff = (day + 6) % 7;
  weekStart.setUTCDate(weekStart.getUTCDate() - diff);
  weekStart.setUTCHours(0, 0, 0, 0);
  const weeklyRow = (await db
    .prepare("SELECT COUNT(*) AS c FROM learning_events WHERE user_id = $1 AND type = 'lesson' AND created_at >= $2")
    .get(user.id, weekStart.toISOString())) as { c: number };

  const recent = (await db
    .prepare('SELECT * FROM learning_events WHERE user_id = $1 ORDER BY id DESC LIMIT 6')
    .all(user.id)) as { id: number; type: string; title: string; detail: string; points: number; created_at: string }[];
  const recentEvents = recent.map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    detail: r.detail,
    points: r.points,
    createdAt: r.created_at,
  }));

  const announcements = (await db
    .prepare('SELECT * FROM announcements ORDER BY id DESC LIMIT 4')
    .all()) as { id: number; title: string; body: string; author: string; created_at: string }[];

  const recentBadges = (
    (await db
      .prepare('SELECT badge_slug, earned_at FROM user_badges WHERE user_id = $1 ORDER BY earned_at DESC LIMIT 4')
      .all(user.id)) as { badge_slug: string; earned_at: string }[]
  )
    .map((b) => {
      const def = getBadge(b.badge_slug);
      return def ? { ...def, earnedAt: b.earned_at } : null;
    })
    .filter(Boolean);

  const unread = (await db
    .prepare('SELECT COUNT(*) AS c FROM notifications WHERE user_id = $1 AND read_at IS NULL')
    .get(user.id)) as { c: number };

  res.json({
    user: await publicUser(user),
    level,
    levelConfig: LEVELS[level],
    stats: {
      lessonsCompleted: completed.size,
      totalLessons: TOTAL_LESSONS,
      percent: Math.round((completed.size / TOTAL_LESSONS) * 100),
      badges: earned.size,
      totalBadges: BADGES.length,
      levelBadges: badgesForLevel(level).filter((b) => earned.has(b.slug)).length,
      levelBadgeTotal: badgesForLevel(level).length,
      streak: streak.current,
      longestStreak: streak.longest,
      weeklyGoal: prefs?.weekly_goal ?? 5,
      weeklyProgress: weeklyRow.c,
      minutesLearned: LESSONS.filter((l) => completed.has(l.slug)).reduce((s, l) => s + l.minutes, 0),
      totalMinutes: TOTAL_MINUTES,
      unreadNotifications: unread.c,
    },
    concepts,
    nextLesson: nextLesson
      ? { slug: nextLesson.slug, title: nextLesson.title, section: nextLesson.section, minutes: nextLesson.minutes }
      : null,
    scores: { pretest: scoreFor('pretest'), posttest: scoreFor('posttest') },
    recentEvents,
    recentBadges,
    announcements: announcements.map((a) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      author: a.author,
      createdAt: a.created_at,
    })),
  });
});

learnRouter.get('/modules', async (req, res) => {
  const user = currentUser(req);
  const completed = await completedLessonSlugs(user.id);
  const sections = SECTIONS.map((section) => {
    const lessons = LESSONS.filter((l) => l.sectionSlug === section.slug).map((l) => ({
      slug: l.slug,
      title: l.title,
      minutes: l.minutes,
      concept: l.concept,
      completion: l.completion,
      completed: completed.has(l.slug),
    }));
    const done = lessons.filter((l) => l.completed).length;
    return {
      slug: section.slug,
      title: section.title,
      accent: section.accent,
      badge: section.badge ? getBadge(section.badge) ?? null : null,
      lessons,
      completed: done,
      total: lessons.length,
      percent: Math.round((done / lessons.length) * 100),
    };
  });
  res.json({
    lessonCount: LESSONS.length,
    minutes: TOTAL_MINUTES,
    completed: completed.size,
    percent: Math.round((completed.size / LESSONS.length) * 100),
    sections,
  });
});

learnRouter.get('/lessons/:slug', async (req, res, next) => {
  try {
    const user = currentUser(req);
    const lesson = getLesson(req.params.slug);
    if (!lesson) throw new HttpError(404, 'That lesson does not exist.');
    const completed = await completedLessonSlugs(user.id);
    const index = LESSONS.findIndex((l) => l.slug === lesson.slug);
    const prev = index > 0 ? LESSONS[index - 1] : null;
    const next = index < LESSONS.length - 1 ? LESSONS[index + 1] : null;
    const level = levelOf(user);

    let activity = null;
    if (lesson.activitySlug) {
      const def = ACTIVITIES.find((a) => a.level === level && a.concept.toLowerCase() === lesson.activitySlug);
      if (def) {
        const best = (await db
          .prepare(
            `SELECT passed, score, total FROM attempts WHERE user_id = ? AND ref_key = ? AND status = 'completed'
             ORDER BY passed DESC, score DESC, id DESC LIMIT 1`,
          )
          .get(user.id, def.key)) as { passed: number; score: number; total: number } | null;
        activity = { key: def.key, passed: !!best?.passed, score: best?.score ?? null, total: def.answers.length };
      }
    }

    let posttest = null;
    if (lesson.completion === 'posttest') {
      const key = `posttest-${level}`;
      const best = (await db
        .prepare(
          `SELECT passed, score, total FROM attempts WHERE user_id = ? AND ref_key = ? AND status = 'completed'
           ORDER BY passed DESC, score DESC, id DESC LIMIT 1`,
        )
        .get(user.id, key)) as { passed: number; score: number; total: number } | null;
      posttest = { key, passed: !!best?.passed, score: best?.score ?? null, total: ASSESSMENTS.find((a) => a.key === key)?.questions.length ?? 8 };
    }

    res.json({
      lesson,
      completed: completed.has(lesson.slug),
      activity,
      posttest,
      prev: prev ? { slug: prev.slug, title: prev.title } : null,
      next: next ? { slug: next.slug, title: next.title } : null,
      section: SECTIONS.find((s) => s.slug === lesson.sectionSlug) ?? null,
      level,
    });
  } catch (err) {
    next(err);
  }
});

learnRouter.post('/lessons/:slug/complete', async (req, res, next) => {
  try {
    const user = currentUser(req);
    const lesson = getLesson(req.params.slug);
    if (!lesson) throw new HttpError(404, 'That lesson does not exist.');
    const level = levelOf(user);

    if (lesson.completion === 'activity') {
      const def = ACTIVITIES.find((a) => a.level === level && a.concept.toLowerCase() === lesson.activitySlug);
      const passed = def
        ? (await db
            .prepare("SELECT 1 FROM attempts WHERE user_id = ? AND ref_key = ? AND status = 'completed' AND passed = 1 LIMIT 1")
            .get(user.id, def.key))
        : undefined;
      if (!passed) {
        throw new HttpError(400, 'Complete this section activity first, then the lesson will be checked off.');
      }
      if (def) await awardBadge(user.id, def.badge);
    }

    if (lesson.completion === 'posttest') {
      const passed = await db
        .prepare(
          "SELECT 1 FROM attempts WHERE user_id = ? AND ref_key = ? AND status = 'completed' AND passed = 1 LIMIT 1",
        )
        .get(user.id, `posttest-${level}`);
      if (!passed) throw new HttpError(400, 'Pass the post-test to complete the module.');
    }

    const already = (await completedLessonSlugs(user.id)).has(lesson.slug);
    await completeLesson(user.id, lesson.slug);
    const badges = await checkSectionBadges(user.id);
    if (!already) {
      await recordEvent(user.id, 'lesson', `Completed “${lesson.title}”`, `${lesson.section} • ${lesson.minutes} min`, 10);
    }
    res.json({ ok: true, completed: true, badges: badges.map((slug) => getBadge(slug)).filter(Boolean) });
  } catch (err) {
    next(err);
  }
});

learnRouter.get('/levels', async (req, res) => {
  const user = currentUser(req);
  const level = levelOf(user);
  const earned = await earnedBadgeSlugs(user.id);
  const levels = await Promise.all(
    LEVEL_ORDER.map(async (key) => {
      const config = LEVELS[key];
      const pre = (await db
        .prepare(
          'SELECT score, total, passed FROM attempts WHERE user_id = $1 AND ref_key = $2 AND status = $3 ORDER BY score DESC LIMIT 1',
        )
        .get(user.id, `pretest-${key}`, 'completed')) as { score: number; total: number; passed: number } | null;
      const post = (await db
        .prepare(
          'SELECT score, total, passed FROM attempts WHERE user_id = $1 AND ref_key = $2 AND status = $3 ORDER BY score DESC LIMIT 1',
        )
        .get(user.id, `posttest-${key}`, 'completed')) as { score: number; total: number; passed: number } | null;
      const activities = await activityProgress(user.id, key);
      return {
        ...config,
        selected: key === level,
        assessments: {
          pretest: pre ? { score: pre.score, total: pre.total, passed: !!pre.passed } : null,
          posttest: post ? { score: post.score, total: post.total, passed: !!post.passed } : null,
        },
        badgesEarned: badgesForLevel(key).filter((b) => earned.has(b.slug)).length,
        badgesTotal: badgesForLevel(key).length,
        certificateRequires: CERTIFICATE_BADGES[key].map((slug) => getBadge(slug)?.name).filter(Boolean),
        activities,
      };
    }),
  );
  res.json({ selected: level, levels });
});

learnRouter.post('/levels/select', async (req, res, next) => {
  try {
    const user = currentUser(req);
    const { level } = z.object({ level: z.string() }).parse(req.body);
    if (!isLevel(level)) throw new HttpError(400, 'Choose one of the four difficulty levels.');
    if (user.level !== level) {
      await db.prepare('UPDATE users SET level = $1 WHERE id = $2').run(level, user.id);
      await recordEvent(
        user.id,
        'level',
        `Switched to ${levelLabel(level)} level`,
        'Assessment rules updated for your level.',
        0,
      );
    }
    res.json({ level });
  } catch (err) {
    next(err);
  }
});

learnRouter.get('/progress', async (req, res) => {
  const user = currentUser(req);
  const level = levelOf(user);
  const completed = await completedLessonSlugs(user.id);
  const earned = await earnedBadgeSlugs(user.id);
  const streak = await streakInfo(user.id);

  const lessons = LESSONS.map((l) => ({
    slug: l.slug,
    title: l.title,
    section: l.section,
    concept: l.concept,
    minutes: l.minutes,
    completed: completed.has(l.slug),
  }));

  const attempts = (await db
    .prepare(
      `SELECT id, kind, ref_key, level, score, raw_score, total, hints_used, lives_left, passed, started_at, finished_at
       FROM attempts WHERE user_id = ? AND status = 'completed' ORDER BY id DESC`,
    )
    .all(user.id)) as Record<string, unknown>[];

  const history = (await db
    .prepare('SELECT id, type, title, detail, points, created_at FROM learning_events WHERE user_id = ? ORDER BY id DESC LIMIT 40')
    .all(user.id)) as Record<string, unknown>[];

  const sectionProgress = await Promise.all(
    LEVEL_ORDER.map(async (lvl) => ({
      level: lvl,
      activities: await activityProgress(user.id, lvl),
    })),
  );

  const badgesList = await Promise.all(
    BADGES.map(async (b) => {
      const earnedAt = (await db
        .prepare('SELECT earned_at FROM user_badges WHERE user_id = ? AND badge_slug = ?')
        .get(user.id, b.slug)) as { earned_at: string } | null;
      return {
        ...b,
        earned: earned.has(b.slug),
        earnedAt: earnedAt?.earned_at ?? null,
      };
    }),
  );

  res.json({
    level,
    lessons,
    sections: SECTIONS.map((s) => {
      const items = lessons.filter((l) => l.section === s.title);
      const done = items.filter((l) => l.completed).length;
      return { slug: s.slug, title: s.title, accent: s.accent, completed: done, total: items.length, percent: Math.round((done / Math.max(items.length, 1)) * 100) };
    }),
    totals: {
      lessonsCompleted: completed.size,
      lessonsTotal: LESSONS.length,
      percent: Math.round((completed.size / LESSONS.length) * 100),
      badges: earned.size,
      badgesTotal: BADGES.length,
      minutes: LESSONS.filter((l) => completed.has(l.slug)).reduce((s, l) => s + l.minutes, 0),
    },
    streak,
    attempts: attempts.map((a) => ({
      id: a.id,
      kind: a.kind,
      refKey: a.ref_key,
      level: a.level,
      score: a.score,
      rawScore: a.raw_score,
      total: a.total,
      hintsUsed: a.hints_used,
      livesLeft: a.lives_left,
      passed: !!a.passed,
      startedAt: a.started_at,
      finishedAt: a.finished_at,
    })),
    activityProgress: sectionProgress,
    badges: badgesList,
    history: history.map((h) => ({
      id: h.id,
      type: h.type,
      title: h.title,
      detail: h.detail,
      points: h.points,
      createdAt: h.created_at,
    })),
  });
});
