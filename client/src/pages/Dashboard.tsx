import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  BookOpen,
  Brain,
  CalendarDays,
  CheckCircle2,
  Clock,
  Flame,
  Layers,
  Lock,
  Play,
  Shapes,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../auth';
import { useToast } from '../toast';
import { Ring, ProgressBar, Spinner } from '../components/ui';
import { BadgeTile } from '../components/BadgeTile';
import type { DashboardData } from '../types';
import { QUOTES, formatDate, pluralize, timeAgo } from '../lib';

const CONCEPT_ICONS: Record<string, typeof Brain> = {
  inheritance: Layers,
  encapsulation: Lock,
  abstraction: Brain,
  polymorphism: Shapes,
};

export function DashboardPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .get<DashboardData>('/dashboard')
      .then((d) => alive && setData(d))
      .catch((err) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : 'Could not load your dashboard.');
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (error) toast.error('Dashboard unavailable', error);
  }, [error, toast]);

  if (!data) return <Spinner label="Preparing your dashboard…" />;

  const { stats, concepts, scores } = data;
  const quote = QUOTES[new Date().getDate() % QUOTES.length];
  const motivational = user?.preferences?.motivational ?? true;
  const weeklyPct = Math.min(100, Math.round((stats.weeklyProgress / Math.max(stats.weeklyGoal, 1)) * 100));

  return (
    <div className="stagger">
      <section className="hero">
        <div className="hero-body">
          <div className="row gap-8 wrap" style={{ marginBottom: 10 }}>
            <span className="chip" style={{ background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.16)', color: '#cfe0ff' }}>
              {data.levelConfig.name} track
            </span>
            <span className="chip" style={{ background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.16)', color: '#cfe0ff' }}>
              {stats.percent}% of the module complete
            </span>
          </div>
          <h1>Welcome back, {user?.firstName || 'learner'}.</h1>
          <p>
            {data.nextLesson
              ? `Next up: ${data.nextLesson.title} · ${data.nextLesson.section}. Keep the momentum going.`
              : 'You have completed every lesson. Take the post-test to finish the module and claim your certificate.'}
          </p>
          <div className="hero-actions">
            {data.nextLesson ? (
              <Link className="btn btn-primary btn-lg" to={`/modules/${data.nextLesson.slug}`}>
                <Play size={16} /> {stats.lessonsCompleted === 0 ? 'Start the module' : 'Continue learning'}
              </Link>
            ) : (
              <Link className="btn btn-primary btn-lg" to="/quizzes">
                <Target size={16} /> Go to the post-test
              </Link>
            )}
            <Link className="btn btn-outline btn-lg" to="/progress">
              <TrendingUp size={16} /> View progress
            </Link>
          </div>
          {motivational && (
            <div className="hero-quote">
              <Sparkles size={15} style={{ marginTop: 3, color: '#9dc0ff', flex: 'none' }} />
              <span>{quote}</span>
            </div>
          )}
        </div>
        <div className="hero-side">
          <div className="hero-stat">
            <div className="value">{stats.streak}</div>
            <div className="label">Day streak</div>
          </div>
          <div className="hero-stat">
            <div className="value">{stats.badges}</div>
            <div className="label">Badges earned</div>
          </div>
          <div className="hero-stat">
            <div className="value">{stats.percent}%</div>
            <div className="label">Completed</div>
          </div>
        </div>
      </section>

      <div className="dash-grid">
        <div className="dash-col">
          <section className="card card-pad">
            <div className="section-head">
              <h2>Your OOP pillars</h2>
              <Link to="/modules">Open modules <ArrowRight size={14} /></Link>
            </div>
            <div className="concept-grid">
              {concepts.map((c) => {
                const Icon = CONCEPT_ICONS[c.slug] ?? BookOpen;
                return (
                  <Link to="/modules" key={c.slug} className={`concept-card accent-${c.accent}`}>
                    <div className="icon-wrap">
                      <Icon size={17} />
                    </div>
                    <div className="concept-name">{c.title}</div>
                    <div className="concept-pct">{c.percent}%</div>
                    <div className="tiny muted">{c.completed} of {c.total} lessons</div>
                    <ProgressBar value={c.percent} tone={c.accent} size="sm" />
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="card card-pad">
            <div className="section-head">
              <h2>Recent activity</h2>
              <Link to="/progress">Full history <ArrowRight size={14} /></Link>
            </div>
            {data.recentEvents.length === 0 ? (
              <div className="panel text-center" style={{ padding: '26px 18px' }}>
                <Clock size={20} style={{ color: 'var(--muted)' }} />
                <div style={{ fontWeight: 650, marginTop: 8 }}>No learning activity yet</div>
                <div className="small muted">Open your first lesson and this timeline will fill up.</div>
                <Link to="/modules" className="btn btn-primary btn-sm mt-12">Start learning</Link>
              </div>
            ) : (
              <div className="event-list">
                {data.recentEvents.map((e) => (
                  <div className="event" key={e.id}>
                    <div className="event-icon">
                      {e.type === 'badge' ? <Award size={15} /> : e.type === 'assessment' ? <Target size={15} /> : e.type === 'activity' ? <CheckCircle2 size={15} /> : <BookOpen size={15} />}
                    </div>
                    <div className="grow">
                      <div className="event-title">{e.title}</div>
                      <div className="event-detail">
                        {e.detail} {e.detail && '·'} {timeAgo(e.createdAt)}
                      </div>
                    </div>
                    {e.points > 0 && <span className="chip chip-primary">+{e.points}</span>}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="dash-col">
          <section className="card card-pad">
            <div className="section-head">
              <h2>Weekly goal</h2>
              <Link to="/settings">Adjust</Link>
            </div>
            <div className="goal-ring">
              <Ring
                value={weeklyPct}
                size={78}
                stroke={7}
                label={
                  <span style={{ fontWeight: 800, fontSize: 14 }}>
                    {stats.weeklyProgress}/{stats.weeklyGoal}
                  </span>
                }
              />
              <div>
                <div className="strong" style={{ fontSize: '0.94rem' }}>
                  {stats.weeklyProgress >= stats.weeklyGoal ? 'Goal reached this week' : 'Lessons this week'}
                </div>
                <div className="small muted mt-4">
                  {stats.weeklyProgress >= stats.weeklyGoal
                    ? 'Excellent consistency. Set a higher target if you want a challenge.'
                    : `${Math.max(stats.weeklyGoal - stats.weeklyProgress, 0)} more ${stats.weeklyGoal - stats.weeklyProgress === 1 ? 'lesson' : 'lessons'} to hit your target.`}
                </div>
              </div>
            </div>
            <div className="goal-meta mt-12">
              <span className="row gap-6"><Flame size={13} /> {pluralize(stats.streak, 'day')} streak</span>
              <span className="row gap-6"><Clock size={13} /> {stats.minutesLearned} min studied</span>
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <h3>Assessment scores</h3>
              <span className="chip chip-primary" style={{ textTransform: 'capitalize' }}>{data.level}</span>
            </div>
            <div className="card-pad stack gap-12">
              {[
                { label: 'Pre-test', value: scores.pretest },
                { label: 'Post-test', value: scores.posttest },
              ].map((s) => (
                <div key={s.label} className="row between gap-10">
                  <div>
                    <div style={{ fontWeight: 650, fontSize: '0.88rem' }}>{s.label}</div>
                    <div className="tiny muted">
                      {s.value ? (s.value.passed ? 'Passed' : 'Needs another attempt') : 'Not attempted yet'}
                    </div>
                  </div>
                  {s.value ? (
                    <span className={`chip ${s.value.passed ? 'chip-success' : 'chip-warning'}`}>
                      {s.value.best}/{s.value.total}
                    </span>
                  ) : (
                    <Link to="/quizzes" className="btn btn-outline btn-sm">Start</Link>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <h3>Announcements</h3>
              <Link to="/notifications" className="tiny" style={{ color: 'var(--primary)', fontWeight: 650 }}>All</Link>
            </div>
            <div className="card-pad">
              {data.announcements.map((a) => (
                <div className="announcement" key={a.id}>
                  <div className="grow">
                    <h4>{a.title}</h4>
                    <p>{a.body}</p>
                    <div className="tiny muted mt-4 row gap-6">
                      <CalendarDays size={12} /> {formatDate(a.createdAt)} · {a.author}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="card card-pad">
            <div className="section-head">
              <h2>Latest badges</h2>
              <Link to="/badges">Collection <ArrowRight size={14} /></Link>
            </div>
            {data.recentBadges.length === 0 ? (
              <div className="row gap-12">
                <BadgeTile icon="lock" tone="slate" earned={false} size={54} />
                <div className="small muted">
                  No badges yet. Complete an assessment or activity to unlock your first one.
                </div>
              </div>
            ) : (
              <div className="row gap-10 wrap">
                {data.recentBadges.map((b) => (
                  <div key={b.slug} className="stack center gap-6" style={{ width: 76 }}>
                    <BadgeTile icon={b.icon} tone={b.tone} size={62} title={b.name} />
                    <span className="tiny text-center" style={{ fontWeight: 650, lineHeight: 1.25 }}>{b.name}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
