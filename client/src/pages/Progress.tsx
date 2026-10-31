import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  BookOpen,
  Check,
  Clock,
  Code,
  Flame,
  History,
  Target,
  TrendingUp,
} from 'lucide-react';
import { api } from '../api';
import { BadgeTile } from '../components/BadgeTile';
import { ProgressBar, Ring, Spinner, Tabs } from '../components/ui';
import type { Badge } from '../types';
import { cx, formatDate, pluralize, timeAgo } from '../lib';

interface ProgressData {
  level: string;
  lessons: { slug: string; title: string; section: string; concept: string; minutes: number; completed: boolean }[];
  sections: { slug: string; title: string; accent: string; completed: number; total: number; percent: number }[];
  totals: { lessonsCompleted: number; lessonsTotal: number; percent: number; badges: number; badgesTotal: number; minutes: number };
  streak: { current: number; longest: number; activeToday: boolean };
  attempts: {
    id: number;
    kind: string;
    refKey: string;
    level: string;
    score: number;
    rawScore: number;
    total: number;
    hintsUsed: number;
    livesLeft: number | null;
    passed: boolean;
    finishedAt: string;
  }[];
  activityProgress: { level: string; activities: { key: string; concept: string; passed: boolean; score: number | null; total: number }[] }[];
  badges: Badge[];
  history: { id: number; type: string; title: string; detail: string; points: number; createdAt: string }[];
}

function attemptLabel(refKey: string): string {
  const [kind, level] = refKey.split('-');
  return `${level?.[0]?.toUpperCase() + (level?.slice(1) ?? '')} ${kind === 'pretest' ? 'pre-test' : 'post-test'}`;
}

export function ProgressPage() {
  const [data, setData] = useState<ProgressData | null>(null);
  const [tab, setTab] = useState<'lessons' | 'assessments' | 'activity' | 'history'>('lessons');

  useEffect(() => {
    api.get<ProgressData>('/progress').then(setData);
  }, []);

  if (!data) return <Spinner label="Collecting your progress…" />;

  const earned = data.badges.filter((b) => b.earned);

  return (
    <div className="page-in">
      <div className="page-head">
        <div>
          <div className="eyebrow"><TrendingUp size={13} /> Learning record</div>
          <h1>Your progress</h1>
          <p>Every lesson, attempt, and badge on your account. Progress is saved server-side, so it follows you across sessions.</p>
        </div>
        <Link to="/modules" className="btn btn-primary">Continue learning <ArrowRight size={15} /></Link>
      </div>

      <div className="grid grid-4">
        <div className="card card-pad row gap-12">
          <Ring value={data.totals.percent} size={54} stroke={5} label={<span style={{ fontWeight: 800, fontSize: 11 }}>{data.totals.percent}%</span>} />
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{data.totals.lessonsCompleted}/{data.totals.lessonsTotal}</div>
            <div className="tiny muted">Lessons complete</div>
          </div>
        </div>
        <div className="card card-pad row gap-12">
          <div className="event-icon" style={{ width: 44, height: 44, borderRadius: 13 }}><Flame size={19} style={{ color: 'var(--warning)' }} /></div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{data.streak.current} days</div>
            <div className="tiny muted">Current streak · best {data.streak.longest}</div>
          </div>
        </div>
        <div className="card card-pad row gap-12">
          <div className="event-icon" style={{ width: 44, height: 44, borderRadius: 13 }}><Award size={19} style={{ color: 'var(--violet)' }} /></div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{data.totals.badges}/{data.totals.badgesTotal}</div>
            <div className="tiny muted">Badges earned</div>
          </div>
        </div>
        <div className="card card-pad row gap-12">
          <div className="event-icon" style={{ width: 44, height: 44, borderRadius: 13 }}><Clock size={19} style={{ color: 'var(--primary)' }} /></div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{data.totals.minutes} min</div>
            <div className="tiny muted">Estimated study time</div>
          </div>
        </div>
      </div>

      <div className="grid grid-2 mt-20" style={{ alignItems: 'start' }}>
        <section className="card card-pad">
          <h3>Per-concept mastery</h3>
          <div className="stack gap-14 mt-16">
            {data.sections.map((s) => (
              <div key={s.slug}>
                <div className="row between small" style={{ marginBottom: 6 }}>
                  <span style={{ fontWeight: 650 }}>{s.title}</span>
                  <span className="muted">{s.completed}/{s.total}</span>
                </div>
                <ProgressBar value={s.percent} tone={s.accent} size="sm" />
              </div>
            ))}
          </div>
        </section>

        <section className="card card-pad">
          <div className="row between gap-10">
            <h3>Badges collected</h3>
            <Link to="/badges" className="tiny" style={{ color: 'var(--primary)', fontWeight: 650 }}>Collection</Link>
          </div>
          {earned.length === 0 ? (
            <p className="small muted mt-12">No badges yet — your first assessment will change that.</p>
          ) : (
            <div className="row gap-10 wrap mt-16">
              {earned.slice(0, 10).map((b) => (
                <div key={b.slug} className="stack center gap-4" style={{ width: 62 }}>
                  <BadgeTile icon={b.icon} tone={b.tone} size={52} title={b.name} />
                  <span className="tiny text-center" style={{ lineHeight: 1.2, fontWeight: 600 }}>{b.name}</span>
                </div>
              ))}
            </div>
          )}
          <div className="row between gap-10 mt-16 small">
            <span className="muted">Level badges</span>
            <span className="chip">{data.level}</span>
          </div>
        </section>
      </div>

      <div className="mt-24">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'lessons', label: 'Lessons' },
            { value: 'assessments', label: `Assessments (${data.attempts.length})` },
            { value: 'activity', label: 'Activities' },
            { value: 'history', label: 'History' },
          ]}
        />
      </div>

      <section className="card mt-12">
        {tab === 'lessons' && (
          <div>
            {data.sections.map((section) => (
              <div key={section.slug}>
                <div className="row between gap-10" style={{ padding: '14px 18px', background: 'var(--surface-2)', borderBottom: '1px solid var(--line)' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.86rem' }}>{section.title}</span>
                  <span className="tiny muted">{section.completed}/{section.total} complete</span>
                </div>
                {data.lessons.filter((l) => l.section === section.title).map((l) => (
                  <div className="rowline" key={l.slug}>
                    <span className={cx('lesson-check', l.completed && 'done')}><Check size={12} strokeWidth={3} /></span>
                    <Link to={`/modules/${l.slug}`} className="grow" style={{ fontWeight: 550, fontSize: '0.87rem' }}>{l.title}</Link>
                    <span className="tiny muted nowrap">{l.minutes} min</span>
                    <span className={`chip ${l.completed ? 'chip-success' : ''}`}>{l.completed ? 'Done' : 'Open'}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {tab === 'assessments' && (
          <div style={{ overflowX: 'auto' }}>
            {data.attempts.length === 0 ? (
              <div className="empty">
                <Target size={22} />
                <div style={{ fontWeight: 650 }}>No assessment attempts yet</div>
                <Link to="/quizzes" className="btn btn-primary btn-sm">Take a quiz</Link>
              </div>
            ) : (
              <table className="progress-table">
                <thead>
                  <tr>
                    <th>Assessment</th>
                    <th>Score</th>
                    <th>Raw</th>
                    <th>Hints</th>
                    <th>Lives left</th>
                    <th>Result</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.attempts.map((a) => (
                    <tr key={a.id}>
                      <td style={{ fontWeight: 600 }}>{attemptLabel(a.refKey)}</td>
                      <td>{a.score}/{a.total}</td>
                      <td className="muted">{a.rawScore}/{a.total}</td>
                      <td className="muted">{a.hintsUsed}</td>
                      <td className="muted">{a.livesLeft ?? '—'}</td>
                      <td>
                        <span className={`chip ${a.passed ? 'chip-success' : 'chip-warning'}`}>{a.passed ? 'Passed' : 'Attempted'}</span>
                      </td>
                      <td className="muted tiny">{formatDate(a.finishedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === 'activity' && (
          <div>
            {data.activityProgress.map((group) => (
              <div key={group.level} style={{ borderBottom: '1px solid var(--line)' }}>
                <div className="row between gap-10" style={{ padding: '12px 18px', background: 'var(--surface-2)' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.86rem', textTransform: 'capitalize' }}>{group.level} level</span>
                  <span className="tiny muted">{group.activities.filter((a) => a.passed).length}/4 passed</span>
                </div>
                {group.activities.map((a) => (
                  <div className="rowline" key={a.key}>
                    <Code size={15} style={{ color: 'var(--muted)' }} />
                    <span className="grow" style={{ fontWeight: 550, fontSize: '0.87rem' }}>{a.concept}</span>
                    {a.score !== null && <span className="tiny muted">{a.score}/{a.total}</span>}
                    <span className={`chip ${a.passed ? 'chip-success' : ''}`}>{a.passed ? 'Passed' : 'Not passed'}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {tab === 'history' && (
          <div>
            {data.history.length === 0 ? (
              <div className="empty">
                <History size={22} />
                <div style={{ fontWeight: 650 }}>Nothing logged yet</div>
                <div className="small">Complete a lesson or assessment to start your history.</div>
              </div>
            ) : (
              data.history.map((h) => (
                <div className="rowline" key={h.id}>
                  <div className="event-icon">
                    {h.type === 'badge' ? <Award size={15} /> : h.type === 'lesson' ? <BookOpen size={15} /> : h.type === 'activity' ? <Code size={15} /> : <Target size={15} />}
                  </div>
                  <div className="grow">
                    <div style={{ fontWeight: 600, fontSize: '0.86rem' }}>{h.title}</div>
                    <div className="tiny muted">{h.detail} · {timeAgo(h.createdAt)}</div>
                  </div>
                  {h.points > 0 && <span className="chip chip-primary">+{h.points}</span>}
                </div>
              ))
            )}
          </div>
        )}
      </section>

      <p className="tiny muted mt-16">{pluralize(data.history.length, 'event')} recorded on this account.</p>
    </div>
  );
}
