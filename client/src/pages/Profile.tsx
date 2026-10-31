import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, BookOpen, CalendarDays, Pencil, ScrollText, Settings, Trophy } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../auth';
import { BadgeTile } from '../components/BadgeTile';
import { ProgressBar, Spinner } from '../components/ui';
import { cx, formatDate, initials } from '../lib';

interface ProfileData {
  user: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    occupation: string;
    bio: string;
    avatar: string;
    level: string;
    createdAt: string;
  };
  stats: {
    lessonsCompleted: number;
    totalLessons: number;
    badges: number;
    totalBadges: number;
    activities: number;
    certificates: { code: string; level: string; issuedAt: string }[];
    level: string;
  };
  avatars: string[];
}

export function ProfilePage() {
  const { user } = useAuth();
  const [data, setData] = useState<ProfileData | null>(null);
  const [badges, setBadges] = useState<{ slug: string; name: string; icon: string; tone: string; earned?: boolean }[]>([]);

  useEffect(() => {
    api.get<ProfileData>('/profile').then(setData);
    api.get<{ levels: { badges: { slug: string; name: string; icon: string; tone: string; earned?: boolean }[] }[] }>('/badges')
      .then((res) => setBadges(res.levels.flatMap((l) => l.badges).filter((b) => b.earned).slice(0, 8)));
  }, []);

  if (!data) return <Spinner label="Loading profile…" />;
  const { stats } = data;
  const name = `${data.user.firstName} ${data.user.lastName}`.trim() || data.user.email;
  const pct = Math.round((stats.lessonsCompleted / stats.totalLessons) * 100);

  return (
    <div className="page-in">
      <div className="page-head">
        <div>
          <div className="eyebrow"><Award size={13} /> Learner</div>
          <h1>Profile</h1>
        </div>
        <div className="row gap-8 wrap">
          <Link to="/settings" className="btn btn-outline"><Pencil size={15} /> Edit profile</Link>
          <Link to="/settings" className="btn btn-ghost"><Settings size={15} /> Settings</Link>
        </div>
      </div>

      <section className="profile-hero">
        <div className="profile-body">
          <div className="row between gap-16 wrap" style={{ alignItems: 'flex-end' }}>
            <div className="row gap-16 wrap">
              <span className={cx('avatar', 'avatar-xl', 'profile-avatar', `avatar-${data.user.avatar}`)}>
                {initials(data.user.firstName, data.user.lastName)}
              </span>
              <div style={{ paddingTop: 44 }}>
                <h2 className="profile-name">{name}</h2>
                <div className="row gap-8 wrap mt-4">
                  <span className="chip chip-primary" style={{ textTransform: 'capitalize' }}>{stats.level} level</span>
                  {data.user.occupation && <span className="chip">{data.user.occupation}</span>}
                  <span className="chip"><CalendarDays size={11} /> Joined {formatDate(data.user.createdAt)}</span>
                </div>
              </div>
            </div>
            <div className="row gap-20">
              <div className="text-center">
                <div style={{ fontWeight: 800, fontSize: '1.2rem' }}>{stats.lessonsCompleted}</div>
                <div className="tiny muted">Lessons</div>
              </div>
              <div className="text-center">
                <div style={{ fontWeight: 800, fontSize: '1.2rem' }}>{stats.badges}</div>
                <div className="tiny muted">Badges</div>
              </div>
              <div className="text-center">
                <div style={{ fontWeight: 800, fontSize: '1.2rem' }}>{stats.certificates.length}</div>
                <div className="tiny muted">Certificates</div>
              </div>
            </div>
          </div>

          <p className={cx('mt-20', !data.user.bio && 'muted')} style={{ maxWidth: '68ch' }}>
            {data.user.bio || 'No biography yet — add one from Settings so your instructor knows a little about you.'}
          </p>
        </div>
      </section>

      <div className="grid grid-2 mt-20" style={{ alignItems: 'start' }}>
        <section className="card card-pad">
          <div className="row between gap-10">
            <h3>Module progress</h3>
            <span className="chip">{pct}%</span>
          </div>
          <p className="small muted mt-4">{stats.lessonsCompleted} of {stats.totalLessons} lessons completed.</p>
          <div className="mt-12"><ProgressBar value={pct} size="lg" /></div>
          <div className="row gap-10 mt-16 wrap">
            <Link to="/modules" className="btn btn-primary btn-sm"><BookOpen size={14} /> Open modules</Link>
            <Link to="/progress" className="btn btn-outline btn-sm">Full progress</Link>
          </div>
        </section>

        <section className="card card-pad">
          <div className="row between gap-10">
            <h3>Badges</h3>
            <Link to="/badges" className="tiny" style={{ color: 'var(--primary)', fontWeight: 650 }}>Collection</Link>
          </div>
          {badges.length === 0 ? (
            <p className="small muted mt-12">Your earned badges will be shown here.</p>
          ) : (
            <div className="row gap-10 wrap mt-16">
              {badges.map((b) => (
                <div key={b.slug} className="stack center gap-4" style={{ width: 62 }}>
                  <BadgeTile icon={b.icon} tone={b.tone} size={52} title={b.name} />
                  <span className="tiny text-center" style={{ lineHeight: 1.2, fontWeight: 600 }}>{b.name}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card card-pad">
          <div className="row between gap-10">
            <h3>Certificates</h3>
            <Link to="/certificate" className="tiny" style={{ color: 'var(--primary)', fontWeight: 650 }}>Certificate page</Link>
          </div>
          {stats.certificates.length === 0 ? (
            <p className="small muted mt-12">No certificate issued yet. Finish the module requirements to unlock one.</p>
          ) : (
            <div className="stack gap-10 mt-12">
              {stats.certificates.map((c) => (
                <div className="row gap-10 panel" key={c.code}>
                  <ScrollText size={16} style={{ color: 'var(--primary)' }} />
                  <div className="grow">
                    <div style={{ fontWeight: 650, fontSize: '0.85rem', textTransform: 'capitalize' }}>{c.level} certificate</div>
                    <div className="tiny muted">{c.code}</div>
                  </div>
                  <a className="btn btn-outline btn-sm" href={`/api/certificates/${c.code}/pdf`}>PDF</a>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card card-pad">
          <h3>Account</h3>
          <div className="meta-list mt-12">
            <div className="meta-row"><span className="muted small">Name</span><span className="small strong">{name}</span></div>
            <div className="meta-row"><span className="muted small">Email</span><span className="small">{data.user.email}</span></div>
            <div className="meta-row"><span className="muted small">Member since</span><span className="small">{formatDate(data.user.createdAt)}</span></div>
            <div className="meta-row"><span className="muted small">Learning events</span><span className="small">{stats.activities}</span></div>
            <div className="meta-row"><span className="muted small">Current level</span><span className="small" style={{ textTransform: 'capitalize' }}>{stats.level}</span></div>
          </div>
          <Link to="/settings" className="btn btn-outline btn-sm mt-16"><Settings size={14} /> Account settings</Link>
        </section>
      </div>

      {user?.role === 'instructor' && (
        <div className="alert alert-info small mt-20">
          <Trophy size={15} />
          You are signed in as an instructor. Students see this page as your public profile; message replies appear in
          the shared inbox.
        </div>
      )}
    </div>
  );
}
