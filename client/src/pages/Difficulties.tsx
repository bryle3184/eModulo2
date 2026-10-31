import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  Check,
  CheckCircle2,
  Clock,
  Flag,
  Heart,
  Lightbulb,
  Lock,
  Sparkles,
  Target,
} from 'lucide-react';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';
import { useToast } from '../toast';
import { Spinner } from '../components/ui';
import type { LevelKey } from '../types';
import { cx, formatClock } from '../lib';

interface LevelInfo {
  key: LevelKey;
  name: string;
  tagline: string;
  blurb: string;
  accent: string;
  timerSeconds: number | null;
  perQuestionSeconds: number | null;
  lives: number | null;
  hintMode: string;
  hintPenalty: number;
  systemBehaviour: string[];
  expectedOutcomes: string[];
  selected: boolean;
  assessments: {
    pretest: { score: number; total: number; passed: boolean } | null;
    posttest: { score: number; total: number; passed: boolean } | null;
  };
  badgesEarned: number;
  badgesTotal: number;
  certificateRequires: string[];
  activities: { concept: string; passed: boolean }[];
}

const STARS: Record<LevelKey, number> = { easy: 1, moderate: 2, challenging: 3, tough: 4 };

export function DifficultiesPage() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const [data, setData] = useState<{ selected: LevelKey; levels: LevelInfo[] } | null>(null);
  const [pending, setPending] = useState<LevelKey | null>(null);

  useEffect(() => {
    api.get<{ selected: LevelKey; levels: LevelInfo[] }>('/levels').then(setData);
  }, []);

  const select = async (level: LevelKey) => {
    setPending(level);
    try {
      await api.post('/levels/select', { level });
      setData((prev) =>
        prev ? { selected: level, levels: prev.levels.map((l) => ({ ...l, selected: l.key === level })) } : prev,
      );
      updateUser({ level });
      toast.success(`${level[0].toUpperCase() + level.slice(1)} level selected`, 'Assessment and activity rules updated.');
    } catch (err) {
      toast.error('Could not change level', err instanceof ApiError ? err.message : undefined);
    } finally {
      setPending(null);
    }
  };

  if (!data) return <Spinner label="Loading levels…" />;

  const selectedLevel = data.levels.find((l) => l.selected) ?? data.levels[0];
  const detail = data.levels.find((l) => l.key === (pending ?? data.selected)) ?? selectedLevel;

  return (
    <div className="page-in">
      <div className="page-head">
        <div>
          <div className="eyebrow"><Flag size={13} /> Difficulty</div>
          <h1>Choose your level of difficulty</h1>
          <p>
            Your level changes how the assessments behave — the clock, lives, hints, and the badges you can earn.
            You can switch at any time; earned badges and completed lessons stay on your account.
          </p>
        </div>
      </div>

      <div className="level-grid">
        {data.levels.map((l) => {
          const selected = l.selected;
          return (
            <button
              key={l.key}
              className={cx('level-card', selected && 'selected')}
              onClick={() => select(l.key)}
              disabled={pending !== null}
              aria-pressed={selected}
            >
              {selected && (
                <span className="level-check" aria-label="Selected">
                  <Check size={13} strokeWidth={3} />
                </span>
              )}
              <div className="level-top">
                <div>
                  <div className="level-name">{l.name}</div>
                  <div className="level-tagline">{l.tagline}</div>
                </div>
                <div className="level-stars" aria-label={`${STARS[l.key]} of 4 difficulty`}>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <span key={i} className={i < STARS[l.key] ? 'on' : ''} />
                  ))}
                </div>
              </div>
              <p className="level-blurb">{l.blurb}</p>
              <div className="level-rules">
                <span className="chip"><Clock size={11} /> {l.timerSeconds ? formatClock(l.timerSeconds) : 'No timer'}</span>
                <span className="chip"><Heart size={11} /> {l.lives ?? 'No'} lives</span>
                <span className="chip">
                  <Lightbulb size={11} /> {l.hintMode === 'none' ? 'No hints' : l.hintMode === 'single' ? '1 hint' : 'Hints'}
                  {l.hintPenalty ? ' −1' : ''}
                </span>
              </div>
              <div className="level-badges-count">
                <Award size={13} /> {l.badgesEarned} of {l.badgesTotal} badges earned at this level
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-2 mt-24" style={{ alignItems: 'start' }}>
        <section className="card card-pad">
          <div className="row between gap-10 wrap">
            <h2 style={{ textTransform: 'capitalize' }}>{detail.name} level</h2>
            {detail.selected ? (
              <span className="chip chip-success"><CheckCircle2 size={12} /> Current level</span>
            ) : (
              <button className="btn btn-primary btn-sm" onClick={() => select(detail.key)} disabled={pending !== null}>
                <Sparkles size={14} /> Select {detail.name}
              </button>
            )}
          </div>

          <h3 className="mt-20" style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)' }}>
            System behaviour
          </h3>
          <ul className="intro-list" style={{ marginTop: 10 }}>
            {detail.systemBehaviour.map((line) => (
              <li key={line}><span className="tick"><Check size={12} /></span>{line}</li>
            ))}
          </ul>

          <h3 className="mt-20" style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)' }}>
            Expected outcomes
          </h3>
          <ul className="intro-list" style={{ marginTop: 10 }}>
            {detail.expectedOutcomes.map((line) => (
              <li key={line}><span className="tick"><Target size={12} /></span>{line}</li>
            ))}
          </ul>
        </section>

        <div className="stack gap-18">
          <section className="card card-pad">
            <div className="row between gap-10">
              <h3>Assessment status</h3>
              <span className="chip">{detail.name}</span>
            </div>
            <div className="stack gap-10 mt-12">
              {[
                { label: 'Pre-test', value: detail.assessments.pretest, to: `/assessment/pretest/${detail.key}`, pass: '3/5' },
                { label: 'Post-test', value: detail.assessments.posttest, to: `/assessment/posttest/${detail.key}`, pass: '6/8' },
              ].map((row) => (
                <div key={row.label} className="row between gap-10 panel">
                  <div>
                    <div style={{ fontWeight: 650, fontSize: '0.87rem' }}>{row.label}</div>
                    <div className="tiny muted">
                      Pass mark {row.pass}
                      {row.value ? ` · best ${row.value.score}/${row.value.total}` : ' · not attempted'}
                    </div>
                  </div>
                  {row.value?.passed ? (
                    <span className="chip chip-success"><CheckCircle2 size={12} /> Passed</span>
                  ) : detail.selected ? (
                    <Link to={row.to} className="btn btn-outline btn-sm">Take</Link>
                  ) : (
                    <span className="chip"><Lock size={11} /> Select level</span>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="card card-pad">
            <h3>Certificate requirements at this level</h3>
            <p className="small muted mt-4">
              Earn all six required badges and finish every lesson. Progress stays separate per level.
            </p>
            <div className="stack gap-6 mt-12">
              {detail.certificateRequires.map((name) => (
                <div key={name} className="row gap-8 small">
                  <Check size={13} style={{ color: 'var(--success)' }} /> {name}
                </div>
              ))}
            </div>
            {detail.selected && (
              <Link to="/certificate" className="btn btn-outline btn-sm mt-16">
                View certificate checklist <ArrowRight size={14} />
              </Link>
            )}
          </section>

          {detail.selected && (
            <Link to="/quizzes" className="btn btn-primary btn-lg">
              Proceed to pre-test <ArrowRight size={17} />
            </Link>
          )}
        </div>
      </div>

      {user && user.level !== data.selected && (
        <p className="tiny muted mt-16">Account level is syncing…</p>
      )}
    </div>
  );
}
