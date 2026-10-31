import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, Check, Lock, Sparkles, Trophy } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../auth';
import { BadgeTile } from '../components/BadgeTile';
import { ProgressBar, Ring, Spinner, Tabs } from '../components/ui';
import type { Badge, LevelKey } from '../types';
import { cx, formatDate } from '../lib';

interface BadgeLevel {
  level: LevelKey;
  label: string;
  accent: string;
  earned: number;
  total: number;
  badges: Badge[];
}

type Filter = 'all' | LevelKey;

export function BadgesPage() {
  const { user } = useAuth();
  const [data, setData] = useState<{ total: number; earned: number; levels: BadgeLevel[] } | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    api.get<{ total: number; earned: number; levels: BadgeLevel[] }>('/badges').then(setData);
  }, []);

  const visible = useMemo(() => {
    if (!data) return [];
    return filter === 'all' ? data.levels : data.levels.filter((l) => l.level === filter);
  }, [data, filter]);

  if (!data) return <Spinner label="Loading your badge collection…" />;

  const percent = Math.round((data.earned / data.total) * 100);

  return (
    <div className="page-in">
      <div className="page-head">
        <div>
          <div className="eyebrow"><Award size={13} /> Achievements</div>
          <h1>Badge collection</h1>
          <p>
            Badges are earned, never given. Assessments award badges by score, activities award their own badge,
            and each section unlocks a completion badge when every lesson is finished.
          </p>
        </div>
      </div>

      <section className="badge-hero">
        <Ring
          value={percent}
          size={104}
          label={
            <div>
              <div style={{ fontWeight: 800, fontSize: 24, lineHeight: 1 }}>{data.earned}</div>
              <div className="tiny muted">of {data.total}</div>
            </div>
          }
        />
        <div className="grow">
          <div className="badge-progress-big">{percent}% collected</div>
          <p className="small muted mt-4">
            {data.total - data.earned} badges still locked. Each difficulty tier has its own collection, and the
            six certificate badges per level are marked with a trophy.
          </p>
          <div className="row gap-8 mt-12 wrap">
            <span className="chip chip-primary"><Trophy size={12} /> Certificate badges</span>
            <span className="chip"><Sparkles size={12} /> Current level: {user?.level}</span>
          </div>
        </div>
        <Link to="/certificate" className="btn btn-outline">
          Certificate checklist
        </Link>
      </section>

      <div className="row gap-10 wrap mt-20" style={{ marginBottom: 16 }}>
        <Tabs<Filter>
          value={filter}
          onChange={setFilter}
          tabs={[
            { value: 'all', label: `All (${data.earned}/${data.total})` },
            ...data.levels.map((l) => ({ value: l.level as Filter, label: `${l.label} (${l.earned}/${l.total})` })),
          ]}
        />
      </div>

      <div className="stack gap-24">
        {visible.map((group) => (
          <section key={group.level}>
            <div className="row between gap-12 wrap" style={{ marginBottom: 12 }}>
              <div className="row gap-10">
                <span className="dot dot-primary" />
                <h2 style={{ fontSize: '1.05rem' }}>{group.label} level</h2>
                <span className="chip">{group.earned}/{group.total}</span>
              </div>
              <div style={{ width: 160 }}>
                <ProgressBar value={(group.earned / group.total) * 100} tone={group.accent === 'emerald' ? 'emerald' : group.accent === 'amber' ? 'amber' : group.accent === 'rose' ? 'rose' : 'blue'} size="sm" />
              </div>
            </div>
            <div className="badge-grid">
              {group.badges.map((b) => (
                <article key={b.slug} className={cx('badge-card', b.earned && 'earned')}>
                  <BadgeTile icon={b.icon} tone={b.tone} earned={b.earned} size={72} title={b.name} />
                  <div>
                    <div className="badge-name">{b.name}</div>
                    <div className="badge-desc mt-4">{b.earned ? b.description : b.condition}</div>
                  </div>
                  <div style={{ marginTop: 'auto' }}>
                    {b.earned ? (
                      <span className="badge-date row gap-4"><Check size={11} /> {formatDate(b.earnedAt)}</span>
                    ) : (
                      <span className="badge-req"><Lock size={10} /> Locked</span>
                    )}
                  </div>
                  {b.certificateRequired && (
                    <span className="chip" style={{ position: 'absolute', top: 8, right: 8, padding: '2px 6px', fontSize: '0.58rem' }}>
                      <Trophy size={9} />
                    </span>
                  )}
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
