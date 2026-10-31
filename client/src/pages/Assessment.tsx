import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  Flame,
  Heart,
  Lightbulb,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Target,
  Timer,
  Trophy,
  X,
  XCircle,
} from 'lucide-react';
import { api, ApiError } from '../api';
import { useToast } from '../toast';
import { CodeBlock } from '../components/CodeBlock';
import { BadgeTile } from '../components/BadgeTile';
import { ProgressBar, Ring, Spinner } from '../components/ui';
import type { AssessmentMeta, AssessmentResult, AttemptInfo, Question } from '../types';
import { cx, formatClock, pluralize } from '../lib';

interface StartResponse {
  attempt: AttemptInfo;
  questions: Question[];
  answered: Record<string, number>;
  resumed: boolean;
}

type Phase = 'intro' | 'playing' | 'result';

function AssessmentPage() {
  const { kind = 'pretest', level = 'easy' } = useParams();
  const key = `${kind}-${level}`;
  const navigate = useNavigate();
  const toast = useToast();

  const [meta, setMeta] = useState<AssessmentMeta | null>(null);
  const [phase, setPhase] = useState<Phase>('intro');
  const [attempt, setAttempt] = useState<AttemptInfo | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hints, setHints] = useState<Record<string, string>>({});
  const [hintsUsed, setHintsUsed] = useState(0);
  const [livesLeft, setLivesLeft] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [questionLeft, setQuestionLeft] = useState<number | null>(null);
  const [leaving, setLeaving] = useState(false);

  const finishing = useRef(false);
  const questionStart = useRef<number>(Date.now());

  useEffect(() => {
    let alive = true;
    setMeta(null);
    api
      .get<AssessmentMeta>(`/assessments/${key}`)
      .then((m) => alive && setMeta(m))
      .catch((err) => alive && setError(err instanceof ApiError ? err.message : 'Could not load this assessment.'));
    return () => {
      alive = false;
    };
  }, [key]);

  const start = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const data = await api.post<StartResponse>(`/assessments/${key}/start`);
      setAttempt(data.attempt);
      setQuestions(data.questions);
      setAnswers(data.answered);
      setHintsUsed(data.attempt.hintsUsed);
      setLivesLeft(data.attempt.livesLeft);
      setHints({});
      setResult(null);
      finishing.current = false;
      const firstUnanswered = data.questions.findIndex((q) => data.answered[q.key] === undefined);
      setIndex(firstUnanswered === -1 ? 0 : firstUnanswered);
      questionStart.current = Date.now();
      setSecondsLeft(data.attempt.secondsRemaining);
      setPhase('playing');
      if (data.resumed) toast.info('Resumed your attempt', 'Your answered questions stay locked.');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not start the assessment.';
      toast.error('Unable to start', message);
    } finally {
      setBusy(false);
    }
  }, [key, toast]);

  const finish = useCallback(async () => {
    if (!attempt || finishing.current) return;
    finishing.current = true;
    setBusy(true);
    try {
      const data = await api.post<AssessmentResult>(`/attempts/${attempt.id}/submit`);
      setResult(data);
      setPhase('result');
    } catch (err) {
      finishing.current = false;
      toast.error('Could not submit your test', err instanceof ApiError ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  }, [attempt, toast]);

  // Total timer
  useEffect(() => {
    if (phase !== 'playing' || !attempt?.deadline) return;
    const tick = () => {
      const remaining = Math.max(0, Math.floor((new Date(attempt.deadline as string).getTime() - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0) void finish();
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [phase, attempt, finish]);

  const goNext = useCallback(() => {
    setIndex((i) => {
      if (!attempt) return i;
      if (i + 1 >= questions.length) {
        void finish();
        return i;
      }
      questionStart.current = Date.now();
      return i + 1;
    });
  }, [attempt, questions.length, finish]);

  // Per-question timer
  useEffect(() => {
    if (phase !== 'playing' || !meta?.perQuestionSeconds) return;
    setQuestionLeft(meta.perQuestionSeconds);
    const started = Date.now();
    const id = window.setInterval(() => {
      const remaining = meta.perQuestionSeconds! - Math.floor((Date.now() - started) / 1000);
      setQuestionLeft(Math.max(0, remaining));
      if (remaining <= 0) {
        window.clearInterval(id);
        if (index + 1 >= questions.length) void finish();
        else {
          setIndex((i) => i + 1);
          questionStart.current = Date.now();
        }
      }
    }, 500);
    return () => window.clearInterval(id);
  }, [phase, index, meta?.perQuestionSeconds, questions.length, finish]);

  const submitAnswer = async () => {
    if (!attempt) return;
    const q = questions[index];
    const selected = answers[q.key];
    if (selected === undefined) {
      toast.info('Pick an answer first', 'Choose one of the four options.');
      return;
    }
    if (busy) return;

    if (q.key in answers && attempt) {
      // Already answered in a previous pass (locked) — just move on.
      if (index + 1 >= questions.length) await finish();
      else goNext();
      return;
    }

    setBusy(true);
    try {
      const res = await api.post<{
        accepted: boolean;
        locked: boolean;
        ended: boolean;
        livesLeft: number | null;
        result?: AssessmentResult;
      }>(`/attempts/${attempt.id}/answer`, { questionKey: q.key, selected });

      if (res.livesLeft !== undefined) setLivesLeft(res.livesLeft);

      if (res.ended && res.result) {
        setResult(res.result);
        setPhase('result');
        return;
      }
      if (index + 1 >= questions.length) await finish();
      else goNext();
    } catch (err) {
      toast.error('Could not save your answer', err instanceof ApiError ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const requestHint = async () => {
    if (!attempt) return;
    const q = questions[index];
    try {
      const res = await api.post<{ hint: string; hintsUsed: number; penalty: number }>(`/attempts/${attempt.id}/hint`, {
        questionKey: q.key,
      });
      setHints((prev) => ({ ...prev, [q.key]: res.hint }));
      setHintsUsed(res.hintsUsed);
      toast.info(`Hint unlocked${res.penalty ? ` · −${res.penalty} point` : ''}`);
    } catch (err) {
      toast.error('Hint unavailable', err instanceof ApiError ? err.message : undefined);
    }
  };

  if (error && !meta) {
    return (
      <div className="empty">
        <ShieldAlert size={26} />
        <div style={{ fontWeight: 700 }}>{error}</div>
        <Link to="/quizzes" className="btn btn-primary">Back to quizzes</Link>
      </div>
    );
  }

  if (!meta) return <Spinner label="Loading assessment…" />;

  if (!meta.isCurrentLevel) {
    return (
      <div className="quiz-intro">
        <div className="intro-card stack gap-16">
          <div className="eyebrow"><ShieldAlert size={13} /> Level mismatch</div>
          <h1 style={{ fontSize: '1.5rem' }}>This {meta.kind === 'pretest' ? 'pre-test' : 'post-test'} belongs to the {meta.levelLabel} level</h1>
          <p className="muted">
            Your account is currently set to a different difficulty. Switch levels first — this keeps your badges and
            certificate requirements tied to the right track.
          </p>
          <div className="row gap-10 wrap">
            <Link to="/difficulties" className="btn btn-primary">Choose a level</Link>
            <Link to="/quizzes" className="btn btn-outline">Back to quizzes</Link>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'intro') {
    return (
      <div className="quiz-intro page-in">
        <div className="intro-card">
          <div className="row between gap-12 wrap">
            <div>
              <div className="eyebrow"><Target size={13} /> {meta.kind === 'pretest' ? 'Pre-test' : 'Post-test'} · {meta.levelLabel}</div>
              <h1 style={{ fontSize: '1.6rem' }}>{meta.title}</h1>
            </div>
            {meta.best && (
              <div className="chip chip-success"><Trophy size={13} /> Best {meta.best.score}/{meta.best.total}</div>
            )}
          </div>

          <div className="rules-grid">
            <div className="rule-tile">
              <div className="label">Questions</div>
              <div className="value">{meta.questionCount} MCQs</div>
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
                {meta.hintPenalty > 0 && meta.hintMode !== 'none' ? ` · −${meta.hintPenalty}` : ''}
              </div>
            </div>
          </div>

          <ul className="intro-list">
            {meta.intro.map((line) => (
              <li key={line}><span className="tick"><Check size={12} /></span>{line}</li>
            ))}
          </ul>

          {meta.perQuestionSeconds && (
            <div className="alert alert-warning small">
              <Timer size={15} /> Each question locks after {meta.perQuestionSeconds} seconds.
            </div>
          )}

          <div className="row gap-10 wrap mt-20">
            <button className="btn btn-primary btn-lg" onClick={start} disabled={busy}>
              {busy ? 'Preparing…' : meta.activeAttempt ? 'Resume the test' : 'Proceed to the test'} <ArrowRight size={17} />
            </button>
            <Link to="/quizzes" className="btn btn-ghost">Not now</Link>
          </div>
          <p className="tiny muted mt-12">
            Answers are evaluated on the server. Correct answers and explanations are only revealed after submission.
          </p>
        </div>
      </div>
    );
  }

  if (phase === 'result' && result) {
    return <ResultView result={result} onRetry={start} busy={busy} levelLabel={meta.levelLabel} />;
  }

  if (!attempt) return <Spinner label="Starting…" />;

  const question = questions[index];
  const selected = answers[question.key];
  const isLocked = question.key in answers;
  const progress = Math.round((Object.keys(answers).length / questions.length) * 100);
  const timeTone = secondsLeft === null ? '' : secondsLeft <= 30 ? 'danger' : secondsLeft <= 90 ? 'warn' : '';
  const hint = hints[question.key];
  const canHint = meta.hintMode !== 'none' && (meta.hintMode !== 'single' || hintsUsed === 0) && !isLocked;

  return (
    <div className="quiz">
      <div className="quiz-bar">
        <Link to="/quizzes" className="icon-btn" aria-label="Leave test" onClick={(e) => {
          if (!window.confirm('Leave the test? Your attempt stays open until the timer runs out.')) e.preventDefault();
        }}>
          <X size={18} />
        </Link>
        <span className="quiz-title">{meta.title}</span>
        <span className="spacer" />
        {secondsLeft !== null && (
          <span className={cx('quiz-stat time', timeTone)}><Clock size={14} /> {formatClock(secondsLeft)}</span>
        )}
        {meta.perQuestionSeconds && questionLeft !== null && !isLocked && (
          <span className={cx('quiz-stat time', questionLeft <= 10 ? 'danger' : '')}><Timer size={14} /> {questionLeft}s</span>
        )}
        {meta.lives !== null && (
          <span className="quiz-stat lives" title={`${livesLeft ?? 0} lives left`}>
            {Array.from({ length: meta.lives }).map((_, i) => (
              <Heart key={i} size={13} fill={i < (livesLeft ?? 0) ? 'currentColor' : 'none'} opacity={i < (livesLeft ?? 0) ? 1 : 0.35} />
            ))}
          </span>
        )}
        <span className="quiz-stat"><Sparkles size={13} /> {meta.hintMode === 'none' ? 'No hints' : `${hintsUsed} hint${hintsUsed === 1 ? '' : 's'}`}</span>
      </div>

      <div className="quiz-progress">
        <div className="row between">
          <span>Question {index + 1} of {questions.length}</span>
          <span>{progress}% answered</span>
        </div>
        <ProgressBar value={progress} />
      </div>

      <div className="question-card" key={question.key}>
        <div className="question-kicker">
          <span className="chip chip-primary">{question.concept}</span>
          {isLocked && <span className="chip"><Check size={12} /> Answer locked</span>}
        </div>
        <div className="question-prompt">{question.prompt}</div>
        {question.code && <CodeBlock code={question.code} maxHeight={330} />}

        <div className="choices" role="radiogroup" aria-label="Answer choices">
          {question.choices.map((choice, i) => (
            <button
              key={i}
              className={cx('choice', selected === i && 'selected')}
              onClick={() => !isLocked && setAnswers((prev) => ({ ...prev, [question.key]: i }))}
              disabled={isLocked}
              role="radio"
              aria-checked={selected === i}
            >
              <span className="key">{String.fromCharCode(65 + i)}</span>
              <span>{choice}</span>
            </button>
          ))}
        </div>

        {hint && (
          <div className="hint-box">
            <Lightbulb size={17} style={{ flex: 'none' }} />
            <div><strong>Hint</strong>{hint}</div>
          </div>
        )}

        <div className="question-foot">
          <button className="btn btn-outline btn-sm" onClick={requestHint} disabled={!canHint || busy}>
            <Lightbulb size={14} /> {meta.hintMode === 'none' ? 'No hints at this level' : 'Use a hint'}
            {meta.hintPenalty > 0 && meta.hintMode !== 'none' ? ' (−1)' : ''}
          </button>
          <span className="spacer" style={{ flex: 1 }} />
          <button className="btn btn-ghost btn-sm" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>
            <ArrowLeft size={15} /> Back
          </button>
          {index + 1 < questions.length ? (
            <button className="btn btn-primary" onClick={submitAnswer} disabled={busy}>
              {busy ? 'Saving…' : isLocked ? 'Next question' : 'Lock answer & next'} <ArrowRight size={15} />
            </button>
          ) : (
            <button className="btn btn-primary" onClick={submitAnswer} disabled={busy}>
              {busy ? 'Scoring…' : 'Finish test'} <CheckCircle2 size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultView({
  result,
  onRetry,
  busy,
  levelLabel,
}: {
  result: AssessmentResult;
  onRetry: () => void;
  busy: boolean;
  levelLabel: string;
}) {
  const [showReview, setShowReview] = useState(false);
  const pct = Math.round((result.score / result.total) * 100);
  const stars = result.total === 8 ? (result.score >= 8 ? 4 : result.score >= 7 ? 3 : result.score >= 6 ? 2 : result.score >= 5 ? 1 : 0) : result.score;

  return (
    <div className="quiz-intro page-in" style={{ maxWidth: 860 }}>
      <div className={cx('result-hero', result.passed ? 'pass' : 'fail')}>
        <div className="row center gap-10 wrap">
          <span className={cx('chip', result.passed ? 'chip-success' : 'chip-danger')}>
            {result.passed ? <Trophy size={13} /> : <XCircle size={13} />}
            {result.passed ? 'Passed' : 'Not passed yet'}
          </span>
          <span className="chip">{levelLabel} level</span>
          {result.expired && <span className="chip chip-warning"><Clock size={12} /> Time expired</span>}
        </div>
        <div className="result-score mt-16">
          {result.score}<small>/{result.total}</small>
        </div>
        <div className="row center gap-8 mt-8 wrap">
          {Array.from({ length: Math.min(result.total, 4) }).map((_, i) => (
            <span key={i} style={{ color: i < Math.ceil(stars) ? 'var(--amber)' : 'var(--line-strong)', fontSize: '1.2rem' }}>★</span>
          ))}
        </div>
        <p className="result-sub">
          {result.passed
            ? result.score === result.total
              ? 'Perfect score. Outstanding command of the concepts.'
              : 'Solid work — the concepts are clicking.'
            : result.score >= result.total - 2
              ? 'Close. Review the explanations below and try again.'
              : 'Don’t worry — review the material and try again. Every attempt builds competence.'}
        </p>
        <div className="row center gap-10 mt-16 wrap">
          <span className="chip"><Target size={12} /> {result.rawScore} correct</span>
          {result.penalty > 0 && <span className="chip chip-warning"><Lightbulb size={12} /> −{result.penalty} from hints</span>}
          {result.livesLost > 0 && <span className="chip chip-danger"><Heart size={12} /> {result.livesLost} live{result.livesLost === 1 ? '' : 's'} lost</span>}
          <span className="chip"><Eye size={12} /> {result.questionsAnswered} answered</span>
        </div>

        {result.newBadges.length > 0 && (
          <div className="mt-24">
            <div className="small muted" style={{ marginBottom: 12 }}>You obtained {result.newBadges.length === 1 ? 'a badge' : `${result.newBadges.length} badges`}</div>
            <div className="row center gap-20 wrap">
              {result.newBadges.map((b) => (
                <div className="badge-unlock" key={b.slug}>
                  <BadgeTile icon={b.icon} tone={b.tone} size={78} />
                  <span className="badge-name">{b.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="row center gap-10 mt-24 wrap">
          <Link to="/quizzes" className="btn btn-outline">Back to quizzes</Link>
          {!result.passed && (
            <button className="btn btn-primary" onClick={onRetry} disabled={busy}>
              <RefreshCw size={15} /> Try again
            </button>
          )}
          {result.passed && result.kind === 'posttest' && (
            <Link to="/certificate" className="btn btn-primary"><Trophy size={15} /> Certificate status</Link>
          )}
          {result.passed && result.kind === 'pretest' && (
            <Link to="/modules" className="btn btn-primary">Continue to the module <ArrowRight size={15} /></Link>
          )}
        </div>
      </div>

      <div className="card mt-20">
        <div className="card-head">
          <h3>Question review</h3>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowReview((v) => !v)}>
            {showReview ? 'Hide' : 'Show'} explanations
          </button>
        </div>
        <div className="card-pad">
          {!showReview ? (
            <p className="small muted">
              {result.rawScore} of {result.total} answers were correct. Open the review to see the correct choice and a
              short explanation for each question.
            </p>
          ) : (
            <div className="review-list">
              {result.review.map((r, i) => (
                <div key={r.key} className={cx('review-item', r.isCorrect ? 'ok' : 'no')}>
                  <div className="review-q">
                    {i + 1}. {r.prompt}
                  </div>
                  <div className="review-meta">
                    Your answer: <b>{r.selected !== null ? r.choices[r.selected] : 'Not answered'}</b>
                    {!r.isCorrect && <> · Correct: <b>{r.choices[r.answer]}</b></>}
                  </div>
                  <div className="review-explain">{r.explanation}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="tiny muted text-center mt-16">
        {pluralize(result.hintsUsed, 'hint')} used · attempt #{result.id}
      </p>
    </div>
  );
}

export { AssessmentPage };
