import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Code,
  GripVertical,
  Heart,
  Lightbulb,
  Lock,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Timer,
  Trophy,
  X,
  XCircle,
} from 'lucide-react';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';
import { useToast } from '../toast';
import { BadgeTile } from '../components/BadgeTile';
import { ProgressBar, Spinner } from '../components/ui';
import type { ActivityMeta, ActivityResult, AttemptInfo } from '../types';
import { cx, formatClock } from '../lib';

type Phase = 'intro' | 'play' | 'result';

export function ActivityPage() {
  const { level = 'easy', concept = 'inheritance' } = useParams();
  const key = `${level}-${concept}`;
  const { user } = useAuth();
  const toast = useToast();

  const [meta, setMeta] = useState<ActivityMeta | null>(null);
  const [phase, setPhase] = useState<Phase>('intro');
  const [attempt, setAttempt] = useState<AttemptInfo | null>(null);
  const [values, setValues] = useState<string[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [hintsByBlank, setHintsByBlank] = useState<Record<number, string>>({});
  const [hintsUsed, setHintsUsed] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [result, setResult] = useState<ActivityResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitting = useRef(false);
  const valuesRef = useRef<string[]>([]);
  valuesRef.current = values;

  useEffect(() => {
    let alive = true;
    api
      .get<ActivityMeta>(`/activities/${key}`)
      .then((m) => alive && setMeta(m))
      .catch((err) => alive && setError(err instanceof ApiError ? err.message : 'Could not load this activity.'));
    return () => {
      alive = false;
    };
  }, [key]);

  const start = async () => {
    if (!meta) return;
    setBusy(true);
    try {
      const data = await api.post<{ attempt: AttemptInfo }>(`/activities/${key}/start`);
      setAttempt(data.attempt);
      setValues(Array.from({ length: meta.blankCount }, () => ''));
      setHintsByBlank({});
      setHintsUsed(data.attempt.hintsUsed);
      setSecondsLeft(data.attempt.secondsRemaining);
      setResult(null);
      submitting.current = false;
      setPhase('play');
    } catch (err) {
      toast.error('Could not start the activity', err instanceof ApiError ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const submit = useCallback(async () => {
    if (!attempt || submitting.current) return;
    submitting.current = true;
    setBusy(true);
    try {
      const data = await api.post<ActivityResult>(`/attempts/${attempt.id}/submit-activity`, {
        answers: valuesRef.current,
      });
      setResult(data);
      setPhase('result');
      if (data.passed) toast.success('Activity complete', `${data.score}/${data.total} — every blank correct.`);
      else toast.info('Not quite there', 'Check the highlighted blanks and try again.');
    } catch (err) {
      submitting.current = false;
      toast.error('Could not submit the activity', err instanceof ApiError ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  }, [attempt, toast]);

  useEffect(() => {
    if (phase !== 'play' || !attempt?.deadline) return;
    const tick = () => {
      const remaining = Math.max(0, Math.floor((new Date(attempt.deadline as string).getTime() - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0) void submit();
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [phase, attempt, submit]);

  const blockUseCount = useMemo(() => {
    const counts = new Map<string, number>();
    for (const v of values) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
    return counts;
  }, [values]);

  const paletteCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const b of meta?.blocks ?? []) counts.set(b, (counts.get(b) ?? 0) + 1);
    return counts;
  }, [meta?.blocks]);

  const placeBlock = (block: string, index?: number) => {
    if (phase !== 'play') return;
    setValues((prev) => {
      const next = [...prev];
      let target = index ?? active;
      if (target === null || target === undefined || next[target]) {
        target = next.findIndex((v) => !v);
      }
      if (target === -1) return prev;
      next[target] = block;
      return next;
    });
    setActive(null);
  };

  const clearBlank = (index: number) => {
    if (phase !== 'play') return;
    setValues((prev) => {
      const next = [...prev];
      next[index] = '';
      return next;
    });
  };

  const requestHint = async () => {
    if (!attempt) return;
    const index = active ?? values.findIndex((v) => !v);
    const target = index === -1 ? 0 : index;
    try {
      const res = await api.post<{ hint: string; hintsUsed: number; penalty: number }>(`/attempts/${attempt.id}/hint`, {
        index: target,
      });
      setHintsByBlank((prev) => ({ ...prev, [target]: res.hint }));
      setHintsUsed(res.hintsUsed);
      toast.info(`Hint unlocked for blank ${target + 1}${res.penalty ? ` · −${res.penalty} point` : ''}`);
    } catch (err) {
      toast.error('Hint unavailable', err instanceof ApiError ? err.message : undefined);
    }
  };

  if (error) {
    return (
      <div className="empty">
        <ShieldAlert size={26} />
        <div style={{ fontWeight: 700 }}>{error}</div>
        <Link to="/activities" className="btn btn-primary">Back to activities</Link>
      </div>
    );
  }
  if (!meta) return <Spinner label="Loading activity…" />;

  if (user && meta.level !== user.level) {
    return (
      <div className="quiz-intro">
        <div className="intro-card stack gap-16">
          <div className="eyebrow"><ShieldAlert size={13} /> Level mismatch</div>
          <h1 style={{ fontSize: '1.5rem' }}>This activity belongs to the {meta.level} level</h1>
          <p className="muted">
            Switch to the {meta.level} level to attempt it. This keeps your activity badges and certificate
            requirements aligned with one track.
          </p>
          <div className="row gap-10 wrap">
            <Link to="/difficulties" className="btn btn-primary">Change level</Link>
            <Link to="/activities" className="btn btn-outline">Back to activities</Link>
          </div>
        </div>
      </div>
    );
  }

  const filled = values.filter(Boolean).length;
  const lines = meta.code.split('\n');
  const timerTone = secondsLeft === null ? '' : secondsLeft <= 20 ? 'danger' : secondsLeft <= 60 ? 'warn' : '';

  if (phase === 'result' && result) {
    return (
      <div className="quiz-intro page-in" style={{ maxWidth: 900 }}>
        <div className={cx('result-hero', result.passed ? 'pass' : 'fail')}>
          <div className="row center gap-10 wrap">
            <span className={cx('chip', result.passed ? 'chip-success' : 'chip-danger')}>
              {result.passed ? <Trophy size={13} /> : <XCircle size={13} />}
              {result.passed ? 'Activity complete' : 'Not complete yet'}
            </span>
            <span className="chip"><Code size={12} /> {meta.concept}</span>
            {result.expired && <span className="chip chip-warning"><Clock size={12} /> Time expired</span>}
          </div>
          <div className="result-score mt-16">
            {result.score}<small>/{result.total}</small>
          </div>
          <p className="result-sub">
            {result.passed
              ? 'Every blank is correct. This lesson is now checked off in your module.'
              : `${result.rawScore} of ${result.total} blanks were correct. Fix the highlighted lines and try again — retries are part of the learning.`}
          </p>
          {result.penalty > 0 && <div className="chip chip-warning mt-8"><Lightbulb size={12} /> −{result.penalty} from hints</div>}

          {result.passed && meta.badge && (
            <div className="mt-24">
              <div className="small muted" style={{ marginBottom: 12 }}>Badge earned</div>
              <div className="row center gap-20 wrap">
                <div className="badge-unlock">
                  <BadgeTile icon={meta.badge.icon} tone={meta.badge.tone} size={82} />
                  <span className="badge-name">{meta.badge.name}</span>
                </div>
                {result.sectionBadges.map((b) => (
                  <div className="badge-unlock" key={b.slug}>
                    <BadgeTile icon={b.icon} tone={b.tone} size={72} />
                    <span className="badge-name">{b.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="row center gap-10 mt-24 wrap">
            <Link to="/activities" className="btn btn-outline">All activities</Link>
            {meta.lessonSlug && result.passed && (
              <Link to={`/modules/${meta.lessonSlug}`} className="btn btn-primary">Open the lesson <ArrowRight size={15} /></Link>
            )}
            <button className="btn btn-outline" onClick={start} disabled={busy}>
              <RefreshCw size={15} /> {result.passed ? 'Practice again' : 'Retry activity'}
            </button>
          </div>
        </div>

        <div className="card mt-20">
          <div className="card-head"><h3>Blank-by-blank review</h3></div>
          <div className="card-pad activity-results">
            {result.results.map((r) => (
              <div key={r.index} className={cx('act-result', r.correct ? 'ok' : 'no')}>
                {r.correct ? <CheckCircle2 size={16} style={{ color: 'var(--success)', flex: 'none' }} /> : <XCircle size={16} style={{ color: 'var(--danger)', flex: 'none' }} />}
                <div>
                  <div style={{ fontWeight: 650 }}>Blank {r.index + 1}</div>
                  <div className="small muted">
                    Your answer: <code>{r.given || 'empty'}</code>
                    {!r.correct && <> · Correct: <code>{r.expected}</code></>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'intro') {
    return (
      <div className="quiz-intro page-in">
        <div className="intro-card">
          <div className="eyebrow"><Code size={13} /> Activity · {meta.level}</div>
          <h1 style={{ fontSize: '1.6rem' }}>{meta.concept} activity</h1>
          <p className="muted mt-8">{meta.brief}</p>

          <div className="rules-grid">
            <div className="rule-tile">
              <div className="label">Blanks</div>
              <div className="value">{meta.blankCount}</div>
            </div>
            <div className="rule-tile">
              <div className="label">Time limit</div>
              <div className="value">{meta.timerSeconds ? formatClock(meta.timerSeconds) : 'None'}</div>
            </div>
            <div className="rule-tile">
              <div className="label">Lives</div>
              <div className="value">{meta.lives ?? 'No lives'}</div>
            </div>
            <div className="rule-tile">
              <div className="label">Hints</div>
              <div className="value">
                {meta.hintMode === 'none' ? 'None' : meta.hintMode === 'single' ? '1 hint' : 'Unlimited'}
                {meta.hintPenalty ? ` · −${meta.hintPenalty}` : ''}
              </div>
            </div>
          </div>

          <ul className="intro-list">
            {meta.instructions.map((line) => (
              <li key={line}><span className="tick"><Check size={12} /></span>{line}</li>
            ))}
          </ul>

          <div className="alert alert-info small">
            <Lightbulb size={15} />
            Drag a block into a blank, or tap a block to drop it into the next empty blank. Tap a filled blank to remove it.
          </div>

          {meta.best && (
            <div className="chip chip-success mt-12"><Trophy size={12} /> Best result {meta.best.score}/{meta.best.total}</div>
          )}

          <div className="row gap-10 wrap mt-20">
            <button className="btn btn-primary btn-lg" onClick={start} disabled={busy}>
              {busy ? 'Preparing…' : 'Proceed to activity'} <ArrowRight size={17} />
            </button>
            <Link to="/activities" className="btn btn-ghost">Back</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-in">
      <div className="row between gap-12 wrap" style={{ marginBottom: 14 }}>
        <Link to="/activities" className="row gap-6 small" style={{ color: 'var(--muted)', fontWeight: 600 }}>
          <ArrowLeft size={15} /> All activities
        </Link>
        <div className="row gap-8 wrap">
          <span className="chip"><Code size={12} /> {meta.concept}</span>
          <span className="chip"><Sparkles size={12} /> {meta.level}</span>
          {secondsLeft !== null && (
            <span className={cx('quiz-stat time', timerTone)}><Timer size={14} /> {formatClock(secondsLeft)}</span>
          )}
          {meta.lives !== null && (
            <span className="quiz-stat lives">
              {Array.from({ length: meta.lives }).map((_, i) => (
                <Heart key={i} size={13} fill={i < (attempt?.livesLeft ?? meta.lives ?? 0) ? 'currentColor' : 'none'} opacity={i < (attempt?.livesLeft ?? meta.lives ?? 0) ? 1 : 0.35} />
              ))}
            </span>
          )}
          <span className="quiz-stat"><Lightbulb size={13} /> {hintsUsed} used</span>
        </div>
      </div>

      <div className="activity-wrap">
        <div className="editor">
          <div className="editor-head">
            <span className="code-dots" aria-hidden="true"><span /><span /><span /></span>
            <span className="file">main.cpp</span>
            <span style={{ marginLeft: 'auto' }}>{filled}/{meta.blankCount} blanks filled</span>
          </div>
          <div className="editor-body">
            {lines.map((line, li) => (
              <span className="editor-line" key={li}>
                {line.length === 0
                  ? ' '
                  : line.split(/(\{\{\d+\}\})/g).map((part, pi) => {
                      const match = part.match(/^\{\{(\d+)\}\}$/);
                      if (!match) return <span key={pi}>{part}</span>;
                      const idx = Number(match[1]) - 1;
                      const val = values[idx] ?? '';
                      const review = result?.results.find((r) => r.index === idx);
                      return (
                        <button
                          key={pi}
                          type="button"
                          className={cx(
                            'blank',
                            val && 'filled',
                            active === idx && 'active',
                            dragOver === idx && 'drop-over',
                            review && (review.correct ? 'correct' : 'incorrect'),
                          )}
                          onClick={() => {
                            setActive(idx);
                            if (val) clearBlank(idx);
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setDragOver(idx);
                          }}
                          onDragLeave={() => setDragOver((v) => (v === idx ? null : v))}
                          onDrop={(e) => {
                            e.preventDefault();
                            setDragOver(null);
                            const block = e.dataTransfer.getData('text/plain');
                            if (block) placeBlock(block, idx);
                          }}
                          aria-label={`Blank ${idx + 1}${val ? `, contains ${val}` : ', empty'}`}
                        >
                          {val || `blank ${idx + 1}`}
                        </button>
                      );
                    })}
              </span>
            ))}
          </div>
        </div>

        <aside className="blocks-panel">
          <div className="card card-pad">
            <div className="side-title">Syntax blocks</div>
            <div className="blocks">
              {meta.blocks.map((block) => {
                const used = (blockUseCount.get(block) ?? 0) >= (paletteCounts.get(block) ?? 1);
                return (
                  <button
                    key={block}
                    type="button"
                    className={cx('block', used && 'used')}
                    draggable={!used}
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', block)}
                    onClick={() => !used && placeBlock(block)}
                    disabled={used}
                  >
                    {block}
                  </button>
                );
              })}
            </div>
            <p className="tiny muted mt-8">Tap a block to place it in the next empty blank.</p>
            <div className="mt-12">
              <ProgressBar value={(filled / meta.blankCount) * 100} size="sm" />
            </div>
          </div>

          <div className="card card-pad">
            <div className="side-title">Hint</div>
            {Object.keys(hintsByBlank).length === 0 ? (
              <p className="tiny muted">Hints point you at the right concept without giving the answer away.</p>
            ) : (
              <div className="stack gap-8">
                {Object.entries(hintsByBlank).map(([idx, text]) => (
                  <div className="hint-box" key={idx} style={{ padding: '10px 12px' }}>
                    <Lightbulb size={15} style={{ flex: 'none' }} />
                    <div>
                      <strong>Blank {Number(idx) + 1}</strong>
                      {text}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button
              className="btn btn-outline btn-sm btn-block mt-12"
              onClick={requestHint}
              disabled={meta.hintMode === 'none' || (meta.hintMode === 'single' && hintsUsed >= 1) || busy}
            >
              <Lightbulb size={14} />
              {meta.hintMode === 'none'
                ? 'No hints at this level'
                : meta.hintMode === 'single' && hintsUsed >= 1
                  ? 'Hint already used'
                  : `Get a hint${meta.hintPenalty ? ' (−1)' : ''}`}
            </button>
          </div>

          <button className="btn btn-primary btn-lg btn-block" onClick={submit} disabled={busy}>
            {busy ? 'Checking…' : 'Submit activity'} <CheckCircle2 size={16} />
          </button>
          {attempt && meta.lives !== null && (
            <p className="tiny muted text-center">Wrong blanks cost a life. Submitting with every blank correct earns the badge.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
