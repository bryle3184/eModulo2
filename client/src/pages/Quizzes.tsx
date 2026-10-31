import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Heart,
  Lightbulb,
  Repeat,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react';
import { api } from '../api';
import { Spinner } from '../components/ui';
import type { LevelKey } from '../types';
import { formatClock } from '../lib';

interface LevelInfo {
  key: LevelKey;
  name: string;
  tagline: string;
  accent: string;
  timerSeconds: number | null;
  perQuestionSeconds: number | null;
  lives: number | null;
  hintMode: string;
  hintPenalty: number;
  selected: boolean;
  assessments: {
    pretest: { score: number; total: number; passed: boolean } | null;
    posttest: { score: number; total: number; passed: boolean } | null;
  };
  badgesEarned: number;
  badgesTotal: number;
  activities: { concept: string; passed: boolean }[];
}

export function QuizzesPage() {
  const [data, setData] = useState<{ selected: LevelKey; levels: LevelInfo[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ selected: LevelKey; levels: LevelInfo[] }>('/levels')
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load quizzes.'));
  }, []);

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!data) return <Spinner label="Loading assessments…" />;

  const level = data.levels.find((l) => l.selected) ?? data.levels[0];

  const tests = [
    {
      kind: 'pretest' as const,
      title: 'Pre-test',
      blurb: 'Find out what you already know before working through the module. Completion is required, and your score determines which starter badges you unlock.',
      score: level.assessments.pretest,
      count: 5,
      cta: 'Start pre-test',
    },
    {
      kind: 'posttest' as const,
      title: 'Post-test',
      blurb: 'Eight questions across all four pillars. Passing completes the module and unlocks the final badge tier required for your certificate.',
      score: level.assessments.posttest,
      count: 8,
      cta: 'Start post-test',
    },
  ];

  return (
    <div className="page-in">
      <div className="page-head">
        <div>
          <div className="eyebrow"><ClipboardCheck size={13} /> Assessments</div>
          <h1>Quizzes &amp; tests</h1>
          <p>
            Two assessments per level: a pre-test before the module and a post-test at the end. The rules below
            come from your selected difficulty.
          </p>
        </div>
        <Link to="/difficulties" className="btn btn-outline">
          <Sparkles size={15} /> Change level
        </Link>
      </div>

      <section className="level-hero">
        <div className="row between gap-16 wrap">
          <div>
            <div className="row gap-10 wrap">
              <h2 style={{ textTransform: 'capitalize' }}>{level.name} level</h2>
              <span className="chip chip-primary">{level.tagline}</span>
            </div>
            <div className="row gap-8 wrap mt-12">
              <span className="chip"><Clock size={12} /> {level.timerSeconds ? formatClock(level.timerSeconds) : 'No timer'}</span>
              <span className="chip"><Heart size={12} /> {level.lives ?? 'No'} lives</span>
              <span className="chip"><Lightbulb size={12} /> {level.hintMode === 'none' ? 'No hints' : level.hintMode === 'single' ? '1 hint per test' : 'Unlimited hints'}{level.hintPenalty ? ' · −1' : ''}</span>
              {level.perQuestionSeconds && <span className="chip chip-warning"><Clock size={12} /> {level.perQuestionSeconds}s per question</span>}
            </div>
          </div>
          <div className="row gap-10">
            <div className="tile text-center" style={{ minWidth: 96, padding: '12px 14px' }}>
              <div style={{ fontWeight: 800, fontSize: '1.15rem' }}>{level.badgesEarned}/{level.badgesTotal}</div>
              <div className="tiny muted">Level badges</div>
            </div>
            <div className="tile text-center" style={{ minWidth: 96, padding: '12px 14px' }}>
              <div style={{ fontWeight: 800, fontSize: '1.15rem' }}>{level.activities.filter((a) => a.passed).length}/4</div>
              <div className="tiny muted">Activities</div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-2">
        {tests.map((t) => {
          const to = `/assessment/${t.kind}/${level.key}`;
          return (
            <article className="card card-pad stack gap-16" key={t.kind}>
              <div className="row between gap-12">
                <div className="row gap-12">
                  <span className="empty-icon" style={{ width: 46, height: 46, borderRadius: 14 }}>
                    <Target size={20} />
                  </span>
                  <div>
                    <h3>{t.title}</h3>
                    <div className="tiny muted">{t.count} multiple-choice questions</div>
                  </div>
                </div>
                {t.score ? (
                  <span className={`chip ${t.score.passed ? 'chip-success' : 'chip-warning'}`}>
                    {t.score.passed ? <CheckCircle2 size={12} /> : <Repeat size={12} />}
                    {t.score.score}/{t.score.total}
                  </span>
                ) : (
                  <span className="chip">Not attempted</span>
                )}
              </div>
              <p className="small muted" style={{ lineHeight: 1.6 }}>{t.blurb}</p>
              <div className="row gap-8 wrap">
                <span className="chip chip-primary">+{t.kind === 'pretest' ? 'Starter' : 'Completion'} badges</span>
                {t.score && <span className="chip">{t.score.passed ? 'Passed' : 'Needs retry'}</span>}
              </div>
              <div className="row between gap-10 wrap" style={{ marginTop: 'auto' }}>
                <span className="tiny muted">
                  {t.kind === 'pretest' ? 'Pass mark 3/5' : 'Pass mark 6/8'}
                </span>
                <Link to={to} className="btn btn-primary btn-sm">
                  {t.score ? 'Retake' : t.cta} <ArrowRight size={14} />
                </Link>
              </div>
            </article>
          );
        })}
      </div>

      <section className="card mt-20">
        <div className="card-head">
          <h3>How scoring works</h3>
          <span className="chip"><Trophy size={12} /> Badge thresholds</span>
        </div>
        <div className="card-pad">
          <div className="grid grid-3">
            <div className="tile">
              <div style={{ fontWeight: 700, fontSize: '0.86rem' }}>Answers are graded server-side</div>
              <p className="tiny muted mt-4">Correct answers are never sent to the browser before you submit.</p>
            </div>
            <div className="tile">
              <div style={{ fontWeight: 700, fontSize: '0.86rem' }}>Hints cost points</div>
              <p className="tiny muted mt-4">
                {level.hintPenalty ? 'Each hint used deducts 1 point from your score at this level.' : 'Hints are free at the Easy level.'}
              </p>
            </div>
            <div className="tile">
              <div style={{ fontWeight: 700, fontSize: '0.86rem' }}>Lives end the test</div>
              <p className="tiny muted mt-4">
                {level.lives ? `With ${level.lives} lives, wrong answers cut the attempt short when they run out.` : 'No lives at this level — you can finish every question.'}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
