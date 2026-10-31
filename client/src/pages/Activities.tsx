import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  Clock,
  Code,
  FlaskConical,
  Heart,
  Layers,
  Lightbulb,
  Lock,
  Shapes,
  Sparkles,
} from 'lucide-react';
import { api } from '../api';
import { BadgeTile } from '../components/BadgeTile';
import { Spinner } from '../components/ui';
import type { ActivityMeta, LevelKey } from '../types';
import { formatClock } from '../lib';

const ICONS: Record<string, typeof Layers> = {
  Inheritance: Layers,
  Encapsulation: Lock,
  Abstraction: Brain,
  Polymorphism: Shapes,
};

export function ActivitiesPage() {
  const [data, setData] = useState<{ level: LevelKey; activities: ActivityMeta[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ level: LevelKey; activities: ActivityMeta[] }>('/activities')
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load activities.'));
  }, []);

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!data) return <Spinner label="Loading activities…" />;

  const done = data.activities.filter((a) => a.best?.passed).length;

  return (
    <div className="page-in">
      <div className="page-head">
        <div>
          <div className="eyebrow"><Code size={13} /> Coding practice</div>
          <h1>Interactive activities</h1>
          <p>
            Drag the correct syntax into each blank to build a working C++ program. Every blank must be
            correct, and the rules change with your difficulty level.
          </p>
        </div>
        <Link to="/difficulties" className="btn btn-outline">
          <Sparkles size={15} /> Level: {data.level}
        </Link>
      </div>

      <section className="card card-pad" style={{ marginBottom: 18 }}>
        <div className="row between gap-16 wrap">
          <div className="row gap-12">
            <div className="empty-icon" style={{ width: 46, height: 46, borderRadius: 14 }}>
              <FlaskConical size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 750 }}>{done} of {data.activities.length} activities complete</div>
              <div className="small muted">One activity per OOP pillar. Passing one also checks off its lesson.</div>
            </div>
          </div>
          <div className="row gap-8 wrap">
            <span className="chip"><Clock size={12} /> {formatClock(data.activities[0]?.timerSeconds ?? 0)} {data.activities[0]?.timerSeconds ? 'limit' : '· untimed'}</span>
            <span className="chip"><Heart size={12} /> {data.activities[0]?.lives ?? 'No'} lives</span>
            <span className="chip">
              <Lightbulb size={12} />{' '}
              {data.activities[0]?.hintMode === 'none' ? 'No hints' : data.activities[0]?.hintMode === 'single' ? '1 hint' : 'Unlimited hints'}
              {data.activities[0]?.hintPenalty ? ' · −1' : ''}
            </span>
          </div>
        </div>
      </section>

      <div className="grid grid-2">
        {data.activities.map((a) => {
          const Icon = ICONS[a.concept] ?? Code;
          const passed = !!a.best?.passed;
          return (
            <article className="card card-pad stack gap-16" key={a.key}>
              <div className="row between gap-12">
                <span className={`icon-wrap accent-${a.concept === 'Inheritance' ? 'blue' : a.concept === 'Encapsulation' ? 'emerald' : a.concept === 'Abstraction' ? 'violet' : 'amber'}`} style={{ width: 46, height: 46, borderRadius: 14, display: 'grid', placeItems: 'center' }}>
                  <Icon size={20} />
                </span>
                {a.badge && <BadgeTile icon={a.badge.icon} tone={a.badge.tone} size={46} earned={passed} title={a.badge.name} />}
              </div>
              <div>
                <div className="row gap-8 wrap">
                  <h3>{a.concept} activity</h3>
                  {passed && <span className="chip chip-success"><CheckCircle2 size={12} /> Passed</span>}
                </div>
                <p className="small muted mt-4">{a.brief}</p>
              </div>
              <div className="row between gap-10 wrap">
                <div className="tiny muted">
                  {a.blankCount} {a.blankCount === 1 ? 'blank' : 'blanks'}
                  {a.best ? ` · best ${a.best.score}/${a.best.total}` : ''}
                  {a.badge ? ` · ${a.badge.name}` : ''}
                </div>
                <Link to={`/activities/${a.level}/${a.concept.toLowerCase()}`} className="btn btn-primary btn-sm">
                  {passed ? 'Review activity' : 'Start activity'} <ArrowRight size={14} />
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
