import { Router } from 'express';
import { z } from 'zod';
import { db, now, recordEvent } from '../db.js';
import { ASSESSMENTS, getAssessment, type AssessmentDef } from '../content/assessments.js';
import { ACTIVITIES, getActivity } from '../content/activities.js';
import { LEVELS, isLevel, type LevelKey } from '../content/levels.js';
import { LESSONS } from '../content/lessons.js';
import { getBadge } from '../content/badges.js';
import {
  HttpError,
  authRequired,
  awardBadge,
  checkSectionBadges,
  completeLesson,
  currentUser,
  earnedBadgeSlugs,
  levelOf,
} from '../lib.js';

export const assessmentRouter = Router();
assessmentRouter.use(authRequired);

interface AttemptRow {
  id: number;
  user_id: number;
  kind: string;
  ref_key: string;
  level: string;
  status: string;
  score: number;
  raw_score: number;
  total: number;
  hints_used: number;
  lives_left: number | null;
  passed: number;
  answers_json: string;
  started_at: string;
  finished_at: string | null;
}

async function loadAttempt(id: number, userId: number): Promise<AttemptRow> {
  const row = (await db.prepare('SELECT * FROM attempts WHERE id = ? AND user_id = ?').get(id, userId)) as
    | AttemptRow
    | null;
  if (!row) throw new HttpError(404, 'That attempt could not be found.');
  return row;
}

function attemptPayload(row: AttemptRow, config: {
  timerSeconds: number | null;
  lives: number | null;
  hintMode: string;
  hintPenalty: number;
}) {
  const deadline = config.timerSeconds
    ? new Date(new Date(row.started_at).getTime() + config.timerSeconds * 1000).toISOString()
    : null;
  return {
    id: row.id,
    kind: row.kind,
    refKey: row.ref_key,
    level: row.level,
    status: row.status,
    startedAt: row.started_at,
    deadline,
    secondsRemaining: deadline ? Math.max(0, Math.floor((new Date(deadline).getTime() - Date.now()) / 1000)) : null,
    timerSeconds: config.timerSeconds,
    lives: config.lives,
    livesLeft: row.lives_left,
    hintMode: config.hintMode,
    hintPenalty: config.hintPenalty,
    hintsUsed: row.hints_used,
  };
}

function questionView(def: AssessmentDef) {
  return def.questions.map((q) => ({
    key: q.key,
    prompt: q.prompt,
    code: q.code ?? null,
    choices: q.choices,
    concept: q.concept,
  }));
}

function isExpired(row: AttemptRow, timerSeconds: number | null): boolean {
  if (!timerSeconds) return false;
  return Date.now() > new Date(row.started_at).getTime() + timerSeconds * 1000 + 2000;
}

async function answersFor(attemptId: number): Promise<Map<string, number | null>> {
  const rows = (await db
    .prepare('SELECT question_key, selected FROM attempt_answers WHERE attempt_id = ?')
    .all(attemptId)) as { question_key: string; selected: number | null }[];
  return new Map(rows.map((r) => [r.question_key, r.selected]));
}

async function finalize(row: AttemptRow, def: AssessmentDef, expired: boolean) {
  const stored = await answersFor(row.id);
  let correct = 0;
  const review = def.questions.map((q) => {
    const selected = stored.get(q.key) ?? null;
    const isCorrect = selected !== null && selected === q.answer;
    if (isCorrect) correct += 1;
    return {
      key: q.key,
      prompt: q.prompt,
      code: q.code ?? null,
      choices: q.choices,
      selected,
      answer: q.answer,
      isCorrect,
      explanation: q.explanation,
      hint: q.hint,
      concept: q.concept,
    };
  });

  const penalty = row.hints_used * def.hintPenalty;
  const score = Math.max(0, correct - penalty);
  const passed = correct >= def.passScore;    await db.prepare(
        `UPDATE attempts SET status = 'completed', score = $1, raw_score = $2, hints_used = $3, passed = $4,
         finished_at = $5, answers_json = $6 WHERE id = $7`,
      ).run(score, correct, row.hints_used, passed ? 1 : 0, now(), JSON.stringify(review.map((r) => r.selected)), row.id);

  const earned: string[] = [];
  const rule = def.awards.find((a) => score >= a.minScore);
  if (rule) {
    for (const slug of rule.badges) {
      if (await awardBadge(row.user_id, slug)) earned.push(slug);
    }
  }

  const levelLabel = LEVELS[def.level].name;
  if (passed && def.kind === 'posttest') {
    completeLesson(row.user_id, 'post-test');
    checkSectionBadges(row.user_id);
    recordEvent(row.user_id, 'assessment', `Passed the ${levelLabel} post-test`, `${score}/${def.questions.length}`, 40);            await db.prepare('INSERT INTO notifications (user_id, type, title, body, link, created_at) VALUES ($1, $2, $3, $4, $5, $6)')
              .run(
                row.user_id,
                'result',
                `Post-test passed at ${levelLabel} level`,
                `You scored ${score}/${def.questions.length}. Check your certificate requirements in Progress.`,
                '/certificate',
                now(),
              );
  } else {
    recordEvent(
      row.user_id,
      'assessment',
      `${passed ? 'Passed' : 'Attempted'} the ${levelLabel} ${def.kind === 'pretest' ? 'pre-test' : 'post-test'}`,
      `${score}/${def.questions.length}${expired ? ' • time expired' : ''}`,
      passed ? 20 : 5,
    );
  }

  return {
    id: row.id,
    kind: def.kind,
    level: def.level,
    title: def.title,
    score,
    rawScore: correct,
    total: def.questions.length,
    passed,
    expired,
    hintsUsed: row.hints_used,
    penalty,
    livesLeft: row.lives_left,
    livesLost: def.lives !== null ? def.lives - (row.lives_left ?? 0) : 0,
    questionsAnswered: review.filter((r) => r.selected !== null).length,
    newBadges: earned.map((slug) => getBadge(slug)).filter(Boolean),
    review,
    finishedAt: now(),
  };
}

// ── Assessments ────────────────────────────────────────────────────────────

assessmentRouter.get('/assessments/:key', async (req, res, next) => {
  try {
    const user = currentUser(req);
    const def = getAssessment(req.params.key);
    if (!def) throw new HttpError(404, 'That assessment does not exist.');
    const best = (await db
      .prepare(
        `SELECT id, score, raw_score, total, passed, hints_used, lives_left, finished_at FROM attempts
         WHERE user_id = ? AND ref_key = ? AND status = 'completed'
         ORDER BY passed DESC, score DESC, id DESC LIMIT 1`,
      )
      .get(user.id, def.key)) as
      | { id: number; score: number; total: number; passed: number; finished_at: string }
      | null;
    const active = (await db
      .prepare(
        "SELECT id, started_at FROM attempts WHERE user_id = ? AND ref_key = ? AND status = 'in_progress' ORDER BY id DESC LIMIT 1",
      )
      .get(user.id, def.key)) as { id: number; started_at: string } | null;

    res.json({
      key: def.key,
      kind: def.kind,
      level: def.level,
      title: def.title,
      intro: def.intro,
      questionCount: def.questions.length,
      timerSeconds: def.timerSeconds,
      perQuestionSeconds: def.perQuestionSeconds,
      lives: def.lives,
      hintMode: def.hintMode,
      hintPenalty: def.hintPenalty,
      passScore: def.passScore,
      levelLabel: LEVELS[def.level].name,
      isCurrentLevel: user.level === def.level,
      best: best
        ? { attemptId: best.id, score: best.score, total: best.total, passed: !!best.passed, finishedAt: best.finished_at }
        : null,
      activeAttempt: active ? { id: active.id, startedAt: active.started_at } : null,
    });
  } catch (err) {
    next(err);
  }
});

assessmentRouter.post('/assessments/:key/start', async (req, res, next) => {
  try {
    const user = currentUser(req);
    const def = getAssessment(req.params.key);
    if (!def) throw new HttpError(404, 'That assessment does not exist.');
    if (!isLevel(def.level)) throw new HttpError(400, 'Unknown difficulty level.');
    if (user.level !== def.level) {
      throw new HttpError(
        409,
        `Your selected level is ${user.level}. Choose ${LEVELS[def.level].name} on the difficulty screen first.`,
      );
    }

    const existing = (await db
      .prepare(
        "SELECT * FROM attempts WHERE user_id = ? AND ref_key = ? AND status = 'in_progress' ORDER BY id DESC LIMIT 1",
      )
      .get(user.id, def.key)) as unknown as AttemptRow | undefined;

    if (existing) {
      if (!isExpired(existing, def.timerSeconds)) {
        const answered = (await db
          .prepare('SELECT question_key, selected FROM attempt_answers WHERE attempt_id = ?')
          .all(existing.id)) as { question_key: string; selected: number | null }[];
        res.json({
          attempt: attemptPayload(existing, def),
          questions: questionView(def),
          answered: Object.fromEntries(answered.map((a) => [a.question_key, a.selected])),
          resumed: true,
        });
        return;
      }
      await db.prepare("UPDATE attempts SET status = 'expired', finished_at = ? WHERE id = ?").run(now(), existing.id);
    }

    const result = await db
      .prepare(
        `INSERT INTO attempts (user_id, kind, ref_key, level, status, total, lives_left, started_at)
         VALUES ($1, $2, $3, $4, 'in_progress', $5, $6, $7)`,
      )
      .run(user.id, def.kind, def.key, def.level, def.questions.length, def.lives, now());
    const insertResult = result as { id?: number } | undefined;
    const attemptId =
      insertResult?.id ??
      Number(
        (
          await db
            .prepare(
              "SELECT id FROM attempts WHERE user_id = $1 AND ref_key = $2 AND status = 'in_progress' ORDER BY id DESC LIMIT 1",
            )
            .get(user.id, def.key)
        )?.id,
      );
    const row = await loadAttempt(attemptId, user.id);
    await recordEvent(user.id, 'assessment', `Started the ${def.title}`, LEVELS[def.level].name, 0);

    res.status(201).json({
      attempt: attemptPayload(row, def),
      questions: questionView(def),
      answered: {},
      resumed: false,
    });
  } catch (err) {
    next(err);
  }
});

assessmentRouter.post('/attempts/:id/answer', async (req, res, next) => {
  try {
    const user = currentUser(req);
    const row = await loadAttempt(Number(req.params.id), user.id);
    if (row.status !== 'in_progress') throw new HttpError(400, 'This attempt has already finished.');
    const def = getAssessment(row.ref_key);
    if (!def) throw new HttpError(404, 'Assessment not found.');

    const body = z
      .object({
        questionKey: z.string(),
        selected: z.number().int().min(0).max(3),
      })
      .parse(req.body);

    const question = def.questions.find((q) => q.key === body.questionKey);
    if (!question) throw new HttpError(400, 'That question does not belong to this test.');
    if (body.selected >= question.choices.length) throw new HttpError(400, 'That answer choice is not valid.');

    const existing = (await db
      .prepare('SELECT selected FROM attempt_answers WHERE attempt_id = ? AND question_key = ?')
      .get(row.id, question.key)) as { selected: number | null } | null;
    if (existing) throw new HttpError(409, 'This question has already been answered and is locked.');

    if (isExpired(row, def.timerSeconds)) {
      const result = await finalize(row, def, true);
      res.json({ ended: true, reason: 'time', result });
      return;
    }

    const isCorrect = body.selected === question.answer;
    await db.prepare(
        'INSERT INTO attempt_answers (attempt_id, question_key, selected, is_correct, explanation) VALUES ($1, $2, $3, $4, $5)',
      ).run(row.id, question.key, body.selected, isCorrect ? 1 : 0, question.explanation);

    let livesLeft = row.lives_left;
    if (!isCorrect && livesLeft !== null) {
      livesLeft = Math.max(0, livesLeft - 1);
      await db.prepare('UPDATE attempts SET lives_left = $1 WHERE id = $2').run(livesLeft, row.id);
    }

    if (livesLeft === 0) {
      const updated = await loadAttempt(row.id, user.id);
      const result = await finalize(updated, def, false);
      res.json({ accepted: true, locked: true, ended: true, reason: 'lives', livesLeft, result });
      return;
    }

    res.json({ accepted: true, locked: true, ended: false, livesLeft });
  } catch (err) {
    next(err);
  }
});

assessmentRouter.post('/attempts/:id/submit', async (req, res, next) => {
  try {
    const user = currentUser(req);
    const row = await loadAttempt(Number(req.params.id), user.id);
    if (row.status !== 'in_progress') throw new HttpError(400, 'This attempt has already been submitted.');
    const def = getAssessment(row.ref_key);
    if (!def) throw new HttpError(404, 'Assessment not found.');
    const result = await finalize(row, def, isExpired(row, def.timerSeconds));
    res.json(result);
  } catch (err) {
    next(err);
  }
});

assessmentRouter.get('/attempts/:id', async (req, res, next) => {
  try {
    const user = currentUser(req);
    const row = await loadAttempt(Number(req.params.id), user.id);
    if (row.status !== 'completed') throw new HttpError(409, 'This attempt is still in progress.');
    const answers = (await db
      .prepare('SELECT question_key, selected, is_correct, explanation FROM attempt_answers WHERE attempt_id = ?')
      .all(row.id)) as { question_key: string; selected: number | null; is_correct: number; explanation: string }[];
    res.json({
      id: row.id,
      kind: row.kind,
      refKey: row.ref_key,
      level: row.level,
      score: row.score,
      rawScore: row.raw_score,
      total: row.total,
      passed: !!row.passed,
      hintsUsed: row.hints_used,
      livesLeft: row.lives_left,
      finishedAt: row.finished_at,
      answers: answers.map((a) => ({
        key: a.question_key,
        selected: a.selected,
        isCorrect: !!a.is_correct,
        explanation: a.explanation,
      })),
    });
  } catch (err) {
    next(err);
  }
});

assessmentRouter.post('/attempts/:id/hint', async (req, res, next) => {
  try {
    const user = currentUser(req);
    const row = await loadAttempt(Number(req.params.id), user.id);
    if (row.status !== 'in_progress') throw new HttpError(400, 'This attempt has already finished.');

    const body = z
      .object({ questionKey: z.string().optional(), index: z.number().int().min(0).optional() })
      .parse(req.body);

    if (row.kind === 'activity') {
      const def = getActivity(row.ref_key);
      if (!def) throw new HttpError(404, 'Activity not found.');
      if (def.hintMode === 'none') throw new HttpError(403, 'No hints are available at this level.');
      if (def.hintMode === 'single' && row.hints_used >= 1) {
        throw new HttpError(403, 'You have already used your single hint for this activity.');
      }
      const index = body.index ?? 0;
      if (index < 0 || index >= def.hints.length) throw new HttpError(400, 'That blank has no hint.');
      await db.prepare('UPDATE attempts SET hints_used = hints_used + 1 WHERE id = $1').run(row.id);
      res.json({ hint: def.hints[index], hintsUsed: row.hints_used + 1, penalty: def.hintPenalty });
      return;
    }

    const def = getAssessment(row.ref_key);
    if (!def) throw new HttpError(404, 'Assessment not found.');
    if (def.hintMode === 'none') throw new HttpError(403, 'No hints are available at this level. Trust your knowledge.');
    if (def.hintMode === 'single' && row.hints_used >= 1) {
      throw new HttpError(403, 'You have already used your single hint for this test.');
    }
    const question = def.questions.find((q) => q.key === body.questionKey);
    if (!question) throw new HttpError(400, 'That question does not belong to this test.');
    await db.prepare('UPDATE attempts SET hints_used = hints_used + 1 WHERE id = $1').run(row.id);
    res.json({ hint: question.hint, hintsUsed: row.hints_used + 1, penalty: def.hintPenalty });
  } catch (err) {
    next(err);
  }
});

// ── Activities ─────────────────────────────────────────────────────────────

async function activityMeta(userId: number, key: string) {
  const def = getActivity(key);
  if (!def) throw new HttpError(404, 'That activity does not exist.');
  const best = (await db
    .prepare(
      `SELECT score, total, passed, finished_at FROM attempts WHERE user_id = ? AND ref_key = ? AND status = 'completed'
       ORDER BY passed DESC, score DESC, id DESC LIMIT 1`,
    )
    .get(userId, key)) as { score: number; total: number; passed: number; finished_at: string } | null;
  const earned = (await earnedBadgeSlugs(userId)).has(def.badge);
  return {
    key: def.key,
    level: def.level,
    concept: def.concept,
    title: def.title,
    brief: def.brief,
    instructions: def.instructions,
    code: def.code,
    blocks: def.blocks,
    blankCount: def.answers.length,
    hintCount: def.hints.length,
    timerSeconds: def.timerSeconds,
    lives: def.lives,
    hintMode: def.hintMode,
    hintPenalty: def.hintPenalty,
    badge: getBadge(def.badge) ?? null,
    earned,
    best: best ? { score: best.score, total: best.total, passed: !!best.passed, finishedAt: best.finished_at } : null,
    lessonSlug: LESSONS.find((l) => l.activitySlug === def.concept.toLowerCase())?.slug ?? null,
  };
}

assessmentRouter.get('/activities/:key', async (req, res, next) => {
  try {
    const user = currentUser(req);
    res.json(await activityMeta(user.id, req.params.key));
  } catch (err) {
    next(err);
  }
});

assessmentRouter.get('/activities', async (req, res) => {
  const user = currentUser(req);
  const level = levelOf(user);
  const activities = await Promise.all(ACTIVITIES.filter((a) => a.level === level).map((a) => activityMeta(user.id, a.key)));
  res.json({ level, activities });
});

assessmentRouter.post('/activities/:key/start', async (req, res, next) => {
  try {
    const user = currentUser(req);
    const def = getActivity(req.params.key);
    if (!def) throw new HttpError(404, 'That activity does not exist.');
    if (user.level !== def.level) {
      throw new HttpError(
        409,
        `Your selected level is ${user.level}. Choose ${LEVELS[def.level].name} on the difficulty screen first.`,
      );
    }

    const existing = (await db
      .prepare(
        "SELECT * FROM attempts WHERE user_id = ? AND ref_key = ? AND status = 'in_progress' ORDER BY id DESC LIMIT 1",
      )
      .get(user.id, def.key)) as unknown as AttemptRow | undefined;

    if (existing) {
      if (!isExpired(existing, def.timerSeconds)) {
        res.json({ attempt: attemptPayload(existing, def) });
        return;
      }
      await db.prepare("UPDATE attempts SET status = 'expired', finished_at = ? WHERE id = ?").run(now(), existing.id);
    }

    const result = await db
      .prepare(
        `INSERT INTO attempts (user_id, kind, ref_key, level, status, total, lives_left, started_at)
         VALUES ($1, 'activity', $2, $3, 'in_progress', $4, $5, $6)`,
      )
      .run(user.id, def.key, def.level, def.answers.length, def.lives, now());
    const insertResult = result as { id?: number } | undefined;
    const attemptId =
      insertResult?.id ??
      Number(
        (
          await db
            .prepare(
              "SELECT id FROM attempts WHERE user_id = $1 AND ref_key = $2 AND status = 'in_progress' ORDER BY id DESC LIMIT 1",
            )
            .get(user.id, def.key)
        )?.id,
      );
    const row = await loadAttempt(attemptId, user.id);
    res.status(201).json({ attempt: attemptPayload(row, def) });
  } catch (err) {
    next(err);
  }
});

assessmentRouter.post('/attempts/:id/submit-activity', async (req, res, next) => {
  try {
    const user = currentUser(req);
    const row = await loadAttempt(Number(req.params.id), user.id);
    if (row.status !== 'in_progress') throw new HttpError(400, 'This activity attempt has already been submitted.');
    if (row.kind !== 'activity') throw new HttpError(400, 'This attempt is not an activity.');
    const def = getActivity(row.ref_key);
    if (!def) throw new HttpError(404, 'Activity not found.');

    const { answers } = z.object({ answers: z.array(z.string()) }).parse(req.body);
    const expired = isExpired(row, def.timerSeconds);

    const results = def.answers.map((expected, i) => {
      const given = expired ? '' : (answers[i] ?? '').trim();
      return { index: i, expected, given, correct: given === expected };
    });
    const correctCount = results.filter((r) => r.correct).length;
    const allCorrect = correctCount === def.answers.length;
    const wrong = def.answers.length - correctCount;
    const livesLeft = def.lives !== null ? Math.max(0, def.lives - wrong) : null;
    const passed = allCorrect;
    const penalty = row.hints_used * def.hintPenalty;
    const score = Math.max(0, correctCount - penalty);
    await db.prepare(
        `UPDATE attempts SET status = 'completed', score = $1, raw_score = $2, hints_used = $3, lives_left = $4,
         passed = $5, answers_json = $6, finished_at = $7 WHERE id = $8`,
      ).run(score, correctCount, row.hints_used, livesLeft, passed ? 1 : 0, JSON.stringify(answers), now(), row.id);

    let newBadges: string[] = [];
    let sectionBadges: string[] = [];
    if (passed) {
      if (await awardBadge(user.id, def.badge)) newBadges = [def.badge];
      const lesson = LESSONS.find((l) => l.activitySlug === def.concept.toLowerCase());
      if (lesson) {
        await completeLesson(user.id, lesson.slug);
        sectionBadges = await checkSectionBadges(user.id);
      }
      await recordEvent(user.id, 'activity', `Completed the ${LEVELS[def.level].name} ${def.concept} activity`, `${score}/${def.answers.length}`, 25);
    } else {
      await recordEvent(user.id, 'activity', `Attempted the ${LEVELS[def.level].name} ${def.concept} activity`, `${correctCount}/${def.answers.length}`, 5);
    }

    res.json({
      id: row.id,
      passed,
      score,
      rawScore: correctCount,
      total: def.answers.length,
      expired,
      hintsUsed: row.hints_used,
      penalty,
      livesLeft,
      results: results.map((r) => ({ index: r.index, correct: r.correct, expected: r.expected, given: r.given })),
      newBadges: newBadges.map((slug) => getBadge(slug)).filter(Boolean),
      sectionBadges: sectionBadges.map((slug) => getBadge(slug)).filter(Boolean),
      badge: getBadge(def.badge) ?? null,
      lessonSlug: LESSONS.find((l) => l.activitySlug === def.concept.toLowerCase())?.slug ?? null,
      finishedAt: now(),
    });
  } catch (err) {
    next(err);
  }
});
