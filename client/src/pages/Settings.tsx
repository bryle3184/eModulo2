import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  Check,
  KeyRound,
  Mail,
  Moon,
  Palette,
  Save,
  ShieldCheck,
  Sun,
  UserRound,
} from 'lucide-react';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';
import { useToast } from '../toast';
import { PasswordInput } from '../components/ui';
import type { Preferences, User } from '../types';
import { cx } from '../lib';

type Tab = 'profile' | 'preferences' | 'security';

function Switch({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="settings-row" style={{ cursor: 'pointer' }}>
      <span>
        <span className="label" style={{ display: 'block' }}>{label}</span>
        {hint && <span className="hint" style={{ display: 'block' }}>{hint}</span>}
      </span>
      <span className="switch">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="switch-track"><span className="switch-thumb" /></span>
      </span>
    </label>
  );
}

const AVATARS = ['blue', 'emerald', 'violet', 'amber', 'rose', 'slate'];

export function SettingsPage() {
  const { user, updateUser, setPreferences, refresh } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('profile');
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    occupation: user?.occupation ?? '',
    bio: user?.bio ?? '',
    avatar: user?.avatar ?? 'blue',
  });
  const [prefs, setPrefs] = useState<Preferences>(
    user?.preferences ?? {
      theme: 'system',
      motivational: true,
      pace: 'steady',
      dailyReminders: true,
      weeklyReminders: true,
      emailAnnouncements: true,
      emailProgress: false,
      weeklyGoal: 5,
    },
  );
  const [emailForm, setEmailForm] = useState({ email: user?.email ?? '', currentPassword: '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwError, setPwError] = useState<string | null>(null);

  if (!user) return null;

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile.firstName.trim() || !profile.lastName.trim()) {
      toast.error('First and last name are required');
      return;
    }
    setBusy(true);
    try {
      const res = await api.put<{ user: User; message: string }>('/profile', profile);
      updateUser(res.user);
      toast.success('Profile saved');
    } catch (err) {
      toast.error('Could not save profile', err instanceof ApiError ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const savePrefs = async (next: Preferences) => {
    setPrefs(next);
    setPreferences(next);
    try {
      await api.put('/preferences', next);
      toast.success('Preferences saved');
    } catch (err) {
      toast.error('Could not save preferences', err instanceof ApiError ? err.message : undefined);
    }
  };

  const quickPref = (patch: Partial<Preferences>) => void savePrefs({ ...prefs, ...patch });

  const changeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.put<{ user: User; message: string }>('/account/email', emailForm);
      updateUser(res.user);
      setEmailForm({ email: res.user.email, currentPassword: '' });
      toast.success('Email updated');
    } catch (err) {
      toast.error('Could not update email', err instanceof ApiError ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    if (pwForm.newPassword.length < 8) {
      setPwError('New password must be at least 8 characters.');
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError('New passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const res = await api.put<{ message: string }>('/account/password', pwForm);
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password changed', res.message);
    } catch (err) {
      setPwError(err instanceof ApiError ? err.message : 'Could not change your password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-in">
      <div className="page-head">
        <div>
          <div className="eyebrow"><Palette size={13} /> Account</div>
          <h1>Settings</h1>
          <p>Manage your profile, how the platform feels, and the security of your account.</p>
        </div>
      </div>

      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Settings sections">
          {[
            { key: 'profile' as Tab, label: 'Profile', icon: UserRound },
            { key: 'preferences' as Tab, label: 'Learning preferences', icon: Palette },
            { key: 'security' as Tab, label: 'Account security', icon: ShieldCheck },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.key} className={cx(tab === item.key && 'active')} onClick={() => setTab(item.key)}>
                <Icon size={16} /> {item.label}
              </button>
            );
          })}
          <Link to="/profile" className="row gap-10 small muted" style={{ padding: '10px 12px' }}>
            View public profile
          </Link>
        </nav>

        <div className="card">
          {tab === 'profile' && (
            <form onSubmit={saveProfile}>
              <div className="settings-section">
                <h2 style={{ fontSize: '1.1rem' }}>Profile</h2>
                <p className="small muted mt-4">Add information about yourself. This appears on your learner profile.</p>

                <div className="row gap-16 wrap mt-20">
                  <span className={cx('avatar', 'avatar-xl', `avatar-${profile.avatar}`)}>
                    {(profile.firstName[0] ?? '') + (profile.lastName[0] ?? '')}
                  </span>
                  <div>
                    <div className="field-label" style={{ marginBottom: 8 }}>Avatar colour</div>
                    <div className="row gap-8 wrap">
                      {AVATARS.map((a) => (
                        <button
                          key={a}
                          type="button"
                          onClick={() => setProfile({ ...profile, avatar: a })}
                          className={cx('avatar', `avatar-${a}`)}
                          style={{ width: 32, height: 32, cursor: 'pointer', border: profile.avatar === a ? '2px solid var(--ink)' : '2px solid transparent' }}
                          aria-label={`Use ${a} avatar`}
                          aria-pressed={profile.avatar === a}
                        >
                          {profile.avatar === a && <Check size={13} />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-2 mt-20">
                  <div className="field">
                    <label className="field-label" htmlFor="first">First name</label>
                    <input id="first" className="input" value={profile.firstName} onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} maxLength={60} />
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="last">Last name</label>
                    <input id="last" className="input" value={profile.lastName} onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} maxLength={60} />
                  </div>
                </div>
                <div className="field mt-16">
                  <label className="field-label" htmlFor="occupation">Occupation</label>
                  <input id="occupation" className="input" value={profile.occupation} onChange={(e) => setProfile({ ...profile, occupation: e.target.value })} placeholder="e.g. BS Computer Science student" maxLength={80} />
                </div>
                <div className="field mt-16">
                  <label className="field-label" htmlFor="bio">Biography</label>
                  <textarea id="bio" className="textarea" value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} placeholder="A short introduction…" maxLength={600} />
                  <span className="field-hint">{profile.bio.length}/600 characters</span>
                </div>

                <button className="btn btn-primary mt-16" disabled={busy}>
                  <Save size={15} /> {busy ? 'Saving…' : 'Save profile'}
                </button>
              </div>
            </form>
          )}

          {tab === 'preferences' && (
            <>
              <div className="settings-section">
                <h2 style={{ fontSize: '1.1rem' }}>Appearance</h2>
                <p className="small muted mt-4">Choose how eMódulo looks. The system option follows your device.</p>
                <div className="row gap-10 wrap mt-16">
                  {[
                    { key: 'light' as const, label: 'Light', icon: Sun },
                    { key: 'dark' as const, label: 'Dark', icon: Moon },
                    { key: 'system' as const, label: 'System', icon: Palette },
                  ].map((t) => {
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.key}
                        className={cx('btn', prefs.theme === t.key ? 'btn-primary' : 'btn-outline')}
                        onClick={() => quickPref({ theme: t.key })}
                      >
                        <Icon size={15} /> {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="settings-section">
                <h2 style={{ fontSize: '1.1rem' }}>Learning experience</h2>
                <Switch
                  checked={prefs.motivational}
                  onChange={(v) => quickPref({ motivational: v })}
                  label="Motivational prompts"
                  hint="Show a short motivational quote on your dashboard and lesson pages."
                />
                <div className="settings-row">
                  <div>
                    <div className="label">Pace setting</div>
                    <div className="hint">How much material you aim to cover each week.</div>
                  </div>
                  <div className="seg">
                    {(['relaxed', 'steady', 'intensive'] as const).map((p) => (
                      <button key={p} className={cx(prefs.pace === p && 'active')} onClick={() => quickPref({ pace: p })} style={{ textTransform: 'capitalize' }}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="settings-row">
                  <div>
                    <div className="label">Weekly lesson goal</div>
                    <div className="hint">Used for the weekly goal ring on your dashboard.</div>
                  </div>
                  <select
                    className="select"
                    style={{ width: 90 }}
                    value={prefs.weeklyGoal}
                    onChange={(e) => quickPref({ weeklyGoal: Number(e.target.value) })}
                    aria-label="Weekly lesson goal"
                  >
                    {[3, 5, 7, 10, 14].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="settings-section">
                <h2 style={{ fontSize: '1.1rem' }}>Reminders &amp; email</h2>
                <div className="alert alert-info small mt-12">
                  <Bell size={15} />
                  Reminder preferences are stored on your account. Outbound email is not enabled on this deployment —
                  announcements appear in your notification inbox.
                </div>
                <Switch checked={prefs.dailyReminders} onChange={(v) => quickPref({ dailyReminders: v })} label="Daily reminders" hint="A nudge to keep your learning streak alive." />
                <Switch checked={prefs.weeklyReminders} onChange={(v) => quickPref({ weeklyReminders: v })} label="Weekly reminders" hint="A weekly summary of your progress and goal." />
                <Switch checked={prefs.emailAnnouncements} onChange={(v) => quickPref({ emailAnnouncements: v })} label="Announcements by email" hint="Course announcements and schedule updates." />
                <Switch checked={prefs.emailProgress} onChange={(v) => quickPref({ emailProgress: v })} label="Progress reports by email" hint="Scores and badge unlocks sent to your inbox." />
              </div>
            </>
          )}

          {tab === 'security' && (
            <>
              <form className="settings-section" onSubmit={changeEmail}>
                <h2 style={{ fontSize: '1.1rem' }}>Email address</h2>
                <p className="small muted mt-4">Used to sign in and to identify your account.</p>
                <div className="field mt-16">
                  <label className="field-label" htmlFor="account-email">Email</label>
                  <input
                    id="account-email"
                    className="input"
                    type="email"
                    value={emailForm.email}
                    onChange={(e) => setEmailForm({ ...emailForm, email: e.target.value })}
                    autoComplete="email"
                  />
                </div>
                <div className="field mt-12">
                  <label className="field-label" htmlFor="email-password">Confirm with your password</label>
                  <PasswordInput id="email-password" value={emailForm.currentPassword} onChange={(v) => setEmailForm({ ...emailForm, currentPassword: v })} placeholder="Current password" autoComplete="current-password" />
                </div>
                <button className="btn btn-primary mt-16" disabled={busy || !emailForm.currentPassword}>
                  <Mail size={15} /> Save email
                </button>
              </form>

              <form className="settings-section" onSubmit={changePassword}>
                <h2 style={{ fontSize: '1.1rem' }}>Password</h2>
                <p className="small muted mt-4">Use at least 8 characters. Changing it signs out your other devices.</p>
                <div className="field mt-16">
                  <label className="field-label" htmlFor="current-pw">Current password</label>
                  <PasswordInput id="current-pw" value={pwForm.currentPassword} onChange={(v) => setPwForm({ ...pwForm, currentPassword: v })} autoComplete="current-password" placeholder="Current password" />
                </div>
                <div className="grid grid-2 mt-12">
                  <div className="field">
                    <label className="field-label" htmlFor="new-pw">New password</label>
                    <PasswordInput id="new-pw" value={pwForm.newPassword} onChange={(v) => setPwForm({ ...pwForm, newPassword: v })} autoComplete="new-password" placeholder="At least 8 characters" />
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="confirm-pw">Confirm new password</label>
                    <PasswordInput id="confirm-pw" value={pwForm.confirmPassword} onChange={(v) => setPwForm({ ...pwForm, confirmPassword: v })} autoComplete="new-password" placeholder="Re-enter password" />
                  </div>
                </div>
                {pwError && <div className="field-error mt-8">{pwError}</div>}
                <button className="btn btn-primary mt-16" disabled={busy}>
                  <KeyRound size={15} /> Update password
                </button>
              </form>

              <div className="settings-section">
                <h2 style={{ fontSize: '1.1rem' }}>Session</h2>
                <p className="small muted mt-4">
                  You are signed in with a secure, httpOnly session cookie that expires after 30 days. Passwords are
                  hashed with bcrypt and never exposed by the API.
                </p>
                <div className="row gap-10 mt-12 wrap">
                  <button className="btn btn-outline btn-sm" onClick={() => void refresh()}>Refresh session</button>
                  <Link to="/forgot-password" className="btn btn-ghost btn-sm">Reset via email link</Link>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
