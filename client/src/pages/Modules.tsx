import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Award,
  BookOpen,
  ChevronDown,
  Check,
  Clock,
  Code,
  FileText,
  Layers,
  Lock,
  Sparkles,
  Target,
} from 'lucide-react';
import { api } from '../api';
import { Ring, Spinner, ProgressBar } from '../components/ui';
import { BadgeTile } from '../components/BadgeTile';
import { useAuth } from '../auth';
import type { ModulesData } from '../types';
import { cx, pluralize } from '../lib';

export function ModulesPage() {
  const { user } = useAuth();
  const [data, setData] = useState<ModulesData | null>(null);
  const [open, setOpen] = useState<string[]>([]);
  const [params] = useSearchParams();

  useEffect(() => {
    api.get<ModulesData>('/modules').then((d) => {
      setData(d);
      const requested = params.get('section');
      const firstIncomplete = d.sections.find((s) => s.percent < 100);
      setOpen(requested ? [requested] : firstIncomplete ? [firstIncomplete.slug] : [d.sections[0]?.slug].filter(Boolean));
    });
  }, [params]);

  if (!data) return <Spinner label="Loading your course…" />;

  const toggle = (slug: string) =>
    setOpen((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));

  return (
    <div className="page-in">
      <div className="page-head">
        <div>
          <div className="eyebrow"><BookOpen size={13} /> Course module</div>
          <h1>Introduction &amp; concepts of Object-Oriented Programming</h1>
          <p>
            A complete C++ module covering the four OOP pillars. Read each lesson, try the activities,
            then prove it in the assessments. Your progress is saved automatically.
          </p>
        </div>
      </div>

      <section className="course-head">
        <Ring
          value={data.percent}
          size={96}
          label={
            <div>
              <div style={{ fontWeight: 800, fontSize: 22, lineHeight: 1 }}>{data.percent}%</div>
              <div className="tiny muted">complete</div>
            </div>
          }
        />
        <div className="grow">
          <div className="row gap-10 wrap">
            <span className="chip chip-primary">{user?.level ? user.level[0].toUpperCase() + user.level.slice(1) : 'Easy'} level</span>
            <span className="chip">{pluralize(data.lessonCount, 'lesson')}</span>
            <span className="chip">~{Math.round(data.minutes / 60 * 10) / 10} hours</span>
            <span className="chip"><BadgeTile icon="trophy" tone="gold" size={14} earned /> 45 badges available</span>
          </div>
          <div className="course-meta">
            <span><Check size={14} /> {data.completed} lessons completed</span>
            <span><Target size={14} /> 4 section activities</span>
            <span><Award size={14} /> Certificate on completion</span>
          </div>
          <div style={{ marginTop: 14, maxWidth: 480 }}>
            <ProgressBar value={data.percent} size="lg" />
          </div>
        </div>
        <Link to="/difficulties" className="btn btn-outline">
          <Sparkles size={15} /> Change level
        </Link>
      </section>

      <div className="module-list">
        {data.sections.map((section, index) => {
          const isOpen = open.includes(section.slug);
          return (
            <section key={section.slug} className={cx('module', isOpen && 'open')}>
              <button className="module-head" onClick={() => toggle(section.slug)} aria-expanded={isOpen}>
                <span className={`module-num accent-${section.accent}`} style={{ background: `color-mix(in srgb, var(--${section.accent}) 13%, transparent)`, color: `var(--${section.accent})` }}>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="grow">
                  <span className="module-title row gap-8 wrap">
                    {section.title}
                    {section.badge && section.percent === 100 && (
                      <span className="chip chip-success"><Check size={12} /> Badge earned</span>
                    )}
                  </span>
                  <span className="module-sub">
                    {section.completed} of {section.total} lessons · {section.percent}% complete
                  </span>
                  <span style={{ display: 'block', marginTop: 8, maxWidth: 380 }}>
                    <ProgressBar value={section.percent} tone={section.accent} size="sm" />
                  </span>
                </span>
                {section.badge && (
                  <span className="row gap-8" style={{ display: 'none' }}>
                    {section.badge.name}
                  </span>
                )}
                {section.badge && (
                  <span className="nowrap" style={{ marginLeft: 8 }}>
                    <BadgeTile icon={section.badge.icon} tone={section.badge.tone} size={34} earned={section.percent === 100} title={section.badge.name} />
                  </span>
                )}
                <ChevronDown size={18} className="module-chevron" />
              </button>

              {isOpen && (
                <div className="lesson-list">
                  {section.lessons.map((lesson) => (
                    <Link to={`/modules/${lesson.slug}`} key={lesson.slug} className="lesson-row">
                      <span className={cx('lesson-check', lesson.completed && 'done')}>
                        <Check size={13} strokeWidth={3} />
                      </span>
                      <span className="grow">
                        <span className="lesson-name">{lesson.title}</span>
                      </span>
                      {lesson.completion === 'activity' && <span className="chip"><Code size={11} /> Activity</span>}
                      {lesson.completion === 'posttest' && <span className="chip"><Target size={11} /> Test</span>}
                      <span className="lesson-time"><Clock size={12} /> {lesson.minutes} min</span>
                    </Link>
                  ))}
                  {section.badge && (
                    <div className="row gap-10" style={{ padding: '12px 12px 4px', borderTop: '1px dashed var(--line)', marginTop: 6 }}>
                      <BadgeTile icon={section.badge.icon} tone={section.badge.tone} size={38} earned={section.percent === 100} />
                      <div className="grow">
                        <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                          {section.percent === 100 ? 'Section badge unlocked' : `Section badge: ${section.badge.name}`}
                        </div>
                        <div className="tiny muted">{section.badge.condition}</div>
                      </div>
                      {section.percent < 100 && <Lock size={14} style={{ color: 'var(--muted)' }} />}
                    </div>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
