import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Check,
  CheckCircle2,
  Clock,
  Code,
  Info,
  Lightbulb,
  ListChecks,
  Lock,
  Play,
  Target,
  TriangleAlert,
} from 'lucide-react';
import { api, ApiError } from '../api';
import { useToast } from '../toast';
import { CodeBlock, OutputBlock } from '../components/CodeBlock';
import { BadgeTile } from '../components/BadgeTile';
import { ProgressBar, Ring, Spinner, Modal } from '../components/ui';
import type { Block, Badge, LessonDetail, ModulesData } from '../types';
import { cx, pluralize } from '../lib';

function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.type) {
          case 'p':
            return <p key={i}>{b.text}</p>;
          case 'h':
            return <h2 key={i}>{b.text}</h2>;
          case 'list':
            return (
              <ul key={i}>
                {b.items.map((item, j) => (
                  <li key={j}>{item}</li>
                ))}
              </ul>
            );
          case 'code':
            return <CodeBlock key={i} code={b.code} caption={b.caption} />;
          case 'output':
            return <OutputBlock key={i} lines={b.lines} />;
          case 'quote':
            return <div className="quote-block" key={i}>“{b.text}”</div>;
          case 'keypoints':
            return (
              <div className="keypoints" key={i}>
                <div className="kp-title">Key points to remember</div>
                <ul>
                  {b.items.map((item, j) => (
                    <li key={j}>{item}</li>
                  ))}
                </ul>
              </div>
            );
          case 'objectives':
            return (
              <div className="objectives" key={i}>
                <div className="kp-title">Learning objectives</div>
                <ul>
                  {b.items.map((item, j) => (
                    <li key={j}>{item}</li>
                  ))}
                </ul>
              </div>
            );
          case 'callout':
            return (
              <div className={cx('callout', `callout-${b.tone}`)} key={i}>
                <div className="callout-title">
                  {b.tone === 'warn' ? <TriangleAlert size={14} /> : b.tone === 'success' ? <CheckCircle2 size={14} /> : <Info size={14} />}
                  {b.title}
                </div>
                <p>{b.text}</p>
              </div>
            );
          case 'note':
            return (
              <div className="panel" key={i}>
                <div className="row gap-8" style={{ fontWeight: 700, fontSize: '0.86rem', marginBottom: 9 }}>
                  <ListChecks size={15} style={{ color: 'var(--primary)' }} /> {b.title}
                </div>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {b.items.map((item, j) => (
                    <li key={j} className="small" style={{ display: 'flex', gap: 8, color: 'var(--ink-2)', listStyle: 'none' }}>
                      <Check size={14} style={{ color: 'var(--primary)', flex: 'none', marginTop: 3 }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            );
          default:
            return null;
        }
      })}
    </>
  );
}

export function LessonPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [detail, setDetail] = useState<LessonDetail | null>(null);
  const [modules, setModules] = useState<ModulesData | null>(null);
  const [busy, setBusy] = useState(false);
  const [unlocked, setUnlocked] = useState<Badge[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setDetail(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    Promise.all([api.get<LessonDetail>(`/lessons/${slug}`), api.get<ModulesData>('/modules')])
      .then(([d, m]) => {
        if (!alive) return;
        setDetail(d);
        setModules(m);
      })
      .catch((err) => alive && setError(err instanceof ApiError ? err.message : 'Could not load this lesson.'));
    return () => {
      alive = false;
    };
  }, [slug]);

  useEffect(() => {
    if (error) toast.error('Lesson unavailable', error);
  }, [error, toast]);

  const sectionLessons = useMemo(() => {
    if (!detail || !modules) return [];
    return modules.sections.find((s) => s.slug === detail.lesson.sectionSlug)?.lessons ?? [];
  }, [detail, modules]);

  if (!detail) return <Spinner label="Opening lesson…" />;

  const { lesson } = detail;
  const canComplete = lesson.completion === 'button' || (lesson.completion === 'activity' ? !!detail.activity?.passed : !!detail.posttest?.passed);

  const complete = async (goNext: boolean) => {
    setBusy(true);
    try {
      const res = await api.post<{ ok: boolean; badges: Badge[] }>(`/lessons/${lesson.slug}/complete`);
      setDetail({ ...detail, completed: true });
      toast.success('Lesson complete', 'Your progress has been saved.');
      if (res.badges?.length) setUnlocked(res.badges);
      if (goNext && detail.next) navigate(`/modules/${detail.next.slug}`);
    } catch (err) {
      toast.error('Could not complete the lesson', err instanceof ApiError ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="lesson-layout page-in">
      <article className="reader">
        <header className="reader-head">
          <div className="row gap-8 wrap">
            <span className="chip chip-primary">{lesson.section}</span>
            <span className="chip"><Clock size={12} /> {lesson.minutes} min</span>
            {detail.completed && <span className="chip chip-success"><Check size={12} /> Completed</span>}
          </div>
          <h1>{lesson.title}</h1>
          {lesson.objectives && lesson.objectives.length > 0 && (
            <p className="small muted mt-8">{lesson.objectives.join(' · ')}</p>
          )}
        </header>

        <div className="reader-body">
          <Blocks blocks={lesson.blocks} />

          {lesson.completion === 'activity' && detail.activity && (
            <div className="panel" style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
              <div className={cx('dot', detail.activity.passed ? 'dot-success' : 'dot-warning')} />
              <div className="grow">
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                  {detail.activity.passed ? 'Activity complete' : 'Activity required to finish this lesson'}
                </div>
                <div className="small muted">
                  {detail.activity.passed
                    ? `Best score ${detail.activity.score}/${detail.activity.total}.`
                    : 'Complete every blank in the coding activity, then return here to check off the lesson.'}
                </div>
              </div>
              <Link to={`/activities/${detail.level}/${lesson.slug.replace('-activity', '')}`} className="btn btn-primary btn-sm">
                <Code size={14} /> {detail.activity.passed ? 'Review activity' : 'Open activity'}
              </Link>
            </div>
          )}

          {lesson.completion === 'posttest' && detail.posttest && (
            <div className="panel" style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
              <div className={cx('dot', detail.posttest.passed ? 'dot-success' : 'dot-warning')} />
              <div className="grow">
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                  {detail.posttest.passed ? 'Post-test passed' : 'Pass the post-test to finish the module'}
                </div>
                <div className="small muted">
                  {detail.posttest.passed
                    ? `Best score ${detail.posttest.score}/${detail.posttest.total}.`
                    : `A score of at least ${6} out of ${detail.posttest.total} is required.`}
                </div>
              </div>
              <Link to={`/assessment/posttest/${detail.level}`} className="btn btn-primary btn-sm">
                <Target size={14} /> {detail.posttest.passed ? 'Review test' : 'Take the post-test'}
              </Link>
            </div>
          )}
        </div>

        <footer className="reader-foot">
          {detail.prev ? (
            <Link to={`/modules/${detail.prev.slug}`} className="btn btn-ghost btn-sm">
              <ArrowLeft size={15} /> {detail.prev.title}
            </Link>
          ) : (
            <span />
          )}
          <div className="row gap-8 wrap">
            {detail.completed ? (
              <span className="chip chip-success"><CheckCircle2 size={13} /> Lesson complete</span>
            ) : canComplete ? (
              <button className="btn btn-primary" onClick={() => complete(false)} disabled={busy}>
                <Check size={16} /> {busy ? 'Saving…' : 'Mark as complete'}
              </button>
            ) : (
              <span className="chip"><Lock size={13} /> Finish the linked task to complete</span>
            )}
            {detail.next && (
              <button className="btn btn-outline" onClick={() => (detail.completed || !canComplete ? navigate(`/modules/${detail.next!.slug}`) : complete(true))} disabled={busy}>
                Next lesson <ArrowRight size={15} />
              </button>
            )}
          </div>
        </footer>
      </article>

      <aside className="reader-side">
        <div className="card side-card">
          <div className="side-title">Module progress</div>
          <div className="row gap-12">
            <Ring
              value={modules?.percent ?? 0}
              size={62}
              stroke={6}
              label={<span style={{ fontWeight: 800, fontSize: 13 }}>{modules?.percent ?? 0}%</span>}
            />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.86rem' }}>{modules?.completed ?? 0} / {modules?.lessonCount ?? 27} lessons</div>
              <div className="tiny muted mt-4">{pluralize(sectionLessons.filter((l) => l.completed).length, 'lesson')} in this section</div>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <ProgressBar value={modules?.percent ?? 0} size="sm" />
          </div>
        </div>

        <div className="card side-card">
          <div className="side-title">{lesson.section}</div>
          <div className="toc">
            {sectionLessons.map((l, i) => (
              <Link key={l.slug} to={`/modules/${l.slug}`} className={cx(l.slug === lesson.slug && 'active')}>
                <span className="num">{String(i + 1).padStart(2, '0')}</span>
                <span className="grow">{l.title}</span>
                {l.completed && <Check size={12} style={{ color: 'var(--success)', marginTop: 3 }} />}
              </Link>
            ))}
          </div>
        </div>

        <div className="card side-card">
          <div className="side-title">Quick actions</div>
          <div className="stack gap-6">
            <Link to="/activities" className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start' }}>
              <Code size={14} /> Practice activities
            </Link>
            <Link to="/quizzes" className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start' }}>
              <Target size={14} /> Assessments
            </Link>
            <Link to="/badges" className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start' }}>
              <Award size={14} /> Badge collection
            </Link>
          </div>
        </div>

        {!detail.completed && (
          <div className="panel row gap-10">
            <Lightbulb size={16} style={{ color: 'var(--warning)', flex: 'none' }} />
            <span className="tiny muted">Progress saves when you mark the lesson complete. You can revisit any lesson later.</span>
          </div>
        )}
      </aside>

      <Modal open={!!unlocked} onClose={() => setUnlocked(null)} title="Badge unlocked!">
        <div className="stack center gap-16" style={{ padding: '10px 0 6px' }}>
          <div className="row gap-16 wrap center">
            {(unlocked ?? []).map((b, i) => (
              <div className="badge-unlock" key={i}>
                <BadgeTile icon={b.icon} tone={b.tone} size={84} />
                <span className="badge-name">{b.name}</span>
              </div>
            ))}
          </div>
          <p className="small muted text-center" style={{ maxWidth: '40ch' }}>
            Nice work. Keep going — every section you finish moves your certificate closer.
          </p>
          <button className="btn btn-primary" onClick={() => setUnlocked(null)}>
            <Play size={15} /> Continue
          </button>
        </div>
      </Modal>
    </div>
  );
}
