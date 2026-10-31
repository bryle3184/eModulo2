import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Award,
  Bell,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Code,
  Flame,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  ScrollText,
  Settings,
  Sun,
  TrendingUp,
  User as UserIcon,
  X,
} from 'lucide-react';
import { useAuth } from '../auth';
import { api } from '../api';
import { useToast } from '../toast';
import { cx, initials } from '../lib';
import { Logo } from './Logo';

const NAV = [
  {
    label: 'Learning',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/modules', label: 'My modules', icon: BookOpen },
      { to: '/activities', label: 'Activities', icon: Code },
      { to: '/quizzes', label: 'Quizzes', icon: ClipboardCheck },
      { to: '/progress', label: 'Progress', icon: TrendingUp },
      { to: '/badges', label: 'Badges', icon: Award },
      { to: '/certificate', label: 'Certificate', icon: ScrollText },
    ],
  },
  {
    label: 'Community',
    items: [
      { to: '/messages', label: 'Messages', icon: MessageSquare },
      { to: '/notifications', label: 'Notifications', icon: Bell },
    ],
  },
  {
    label: 'Account',
    items: [
      { to: '/profile', label: 'Profile', icon: UserIcon },
      { to: '/settings', label: 'Settings', icon: Settings },
      { to: '/help', label: 'Help & support', icon: LifeBuoy },
    ],
  },
];

function crumbFor(pathname: string): { label: string; parent?: string }[] {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return [{ label: 'Dashboard' }];
  const map: Record<string, string> = {
    modules: 'My modules',
    activities: 'Activities',
    quizzes: 'Quizzes',
    progress: 'Progress',
    badges: 'Badges',
    certificate: 'Certificate',
    messages: 'Messages',
    notifications: 'Notifications',
    profile: 'Profile',
    settings: 'Settings',
    help: 'Help & support',
    difficulties: 'Difficulty',
    assessment: 'Quizzes',
  };
  const first = map[parts[0]] ?? parts[0];
  if (parts.length === 1) return [{ label: first }];
  if (parts[0] === 'assessment' && parts[1]) {
    return [{ label: 'Quizzes' }, { label: parts[1] === 'pretest' ? 'Pre-test' : 'Post-test' }];
  }
  return [{ label: first }, { label: parts[parts.length - 1].replace(/-/g, ' ') }];
}

export function AppShell() {
  const { user, logout, updateUser, setPreferences } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [counts, setCounts] = useState({ notifications: 0, messages: 0 });
  const [streak, setStreak] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const [n, m, d] = await Promise.all([
          api.get<{ unread: number }>('/notifications'),
          api.get<{ unread: number }>('/messages/threads'),
          api.get<{ stats: { streak: number } }>('/dashboard'),
        ]);
        if (alive) {
          setCounts({ notifications: n.unread, messages: m.unread });
          setStreak(d.stats.streak);
        }
      } catch {
        /* nav badges are non-critical */
      }
    };
    void load();
    return () => {
      alive = false;
    };
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  if (!user) return null;

  const theme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  const currentTheme = user.preferences?.theme ?? 'system';

  const toggleTheme = async () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    const prefs = { ...(user.preferences ?? {}), theme: next } as typeof user.preferences;
    setPreferences(prefs);
    try {
      await api.put('/preferences', prefs);
    } catch {
      toast.error('Could not save your theme preference');
    }
  };

  const crumbs = crumbFor(location.pathname);

  const navBadge = (label: string) => {
    if (label === 'Messages' && counts.messages > 0) return counts.messages;
    if (label === 'Notifications' && counts.notifications > 0) return counts.notifications;
    return 0;
  };

  return (
    <div className="app">
      {mobileOpen && <div className="sidebar-scrim" onClick={() => setMobileOpen(false)} />}
      <aside className={cx('sidebar', mobileOpen && 'open')}>
        <div className="row between">
          <Link to="/" aria-label="eMódulo dashboard">
            <Logo />
          </Link>
          <button className="icon-btn menu-btn" onClick={() => setMobileOpen(false)} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <nav className="nav-group" aria-label="Main navigation">
          {NAV.map((group) => (
            <div key={group.label} style={{ display: 'contents' }}>
              <div className="nav-label">{group.label}</div>
              {group.items.map((item) => {
                const Icon = item.icon;
                const count = navBadge(item.label);
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={'end' in item ? item.end : false}
                    className={({ isActive }) => cx('nav-item', isActive && 'active')}
                  >
                    <Icon size={17} strokeWidth={2} />
                    <span>{item.label}</span>
                    {count > 0 && <span className="nav-badge">{count > 9 ? '9+' : count}</span>}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Hidden on the Profile page, which handles its own actions. */}
        {location.pathname !== '/profile' && (
          <div className="sidebar-foot">
            <button
              className="nav-item"
              style={{ border: 0, background: 'transparent', cursor: 'pointer', width: '100%' }}
              onClick={async () => {
                await logout();
                navigate('/login');
              }}
            >
              <LogOut size={17} />
              <span>Log out</span>
            </button>
          </div>
        )}
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu size={19} />
          </button>
          <div className="crumbs">
            {crumbs.map((c, i) => (
              <span key={i} className="row gap-6">
                {i > 0 && <ChevronRight size={13} />}
                {i === crumbs.length - 1 ? <strong style={{ textTransform: 'capitalize' }}>{c.label}</strong> : <span style={{ textTransform: 'capitalize' }}>{c.label}</span>}
              </span>
            ))}
          </div>

          <div className="top-actions">
            <span className="streak-chip" title="Current learning streak">
              <Flame size={14} /> {streak}d streak
            </span>
            <button className="icon-btn" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} title={`Theme: ${currentTheme}`}>
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <Link to="/notifications" className="icon-btn" aria-label={`Notifications${counts.notifications ? `, ${counts.notifications} unread` : ''}`}>
              <Bell size={18} />
              {counts.notifications > 0 && <span className="dot-badge">{counts.notifications > 9 ? '9+' : counts.notifications}</span>}
            </Link>

            <div className="avatar-menu" ref={menuRef}>
              <button className="avatar-trigger" onClick={() => setMenuOpen((v) => !v)} aria-expanded={menuOpen} aria-label="Account menu">
                <span className={cx('avatar', `avatar-${user.avatar}`)}>
                  {initials(user.firstName, user.lastName)}
                </span>
                <ChevronDown size={14} style={{ color: 'var(--muted)' }} />
              </button>
              {menuOpen && (
                <div className="dropdown">
                  <div className="dropdown-head">
                    <div style={{ fontWeight: 700, fontSize: '0.87rem' }}>
                      {user.firstName} {user.lastName}
                    </div>
                    <div className="tiny muted" style={{ wordBreak: 'break-all' }}>{user.email}</div>
                  </div>
                  <Link to="/profile" className="dropdown-item"><UserIcon size={15} /> View profile</Link>
                  <Link to="/badges" className="dropdown-item"><Award size={15} /> My badges</Link>
                  <Link to="/settings" className="dropdown-item"><Settings size={15} /> Account settings</Link>
                  <button
                    className="dropdown-item"
                    onClick={async () => {
                      const prefs = { ...user.preferences, motivational: !user.preferences.motivational };
                      setPreferences(prefs);
                      updateUser({});
                      try {
                        await api.put('/preferences', prefs);
                        toast.success('Motivational prompts updated');
                      } catch {
                        toast.error('Could not update preferences');
                      }
                    }}
                  >
                    <Flame size={15} /> {user.preferences.motivational ? 'Pause' : 'Enable'} motivational prompts
                  </button>
                  <button
                    className="dropdown-item danger"
                    onClick={async () => {
                      await logout();
                      navigate('/login');
                    }}
                  >
                    <LogOut size={15} /> Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main key={location.pathname} className="page-in">
          <Outlet />
        </main>

        <nav className="mobile-nav" aria-label="Mobile navigation">
          {[
            { to: '/', label: 'Home', icon: LayoutDashboard, end: true },
            { to: '/modules', label: 'Learn', icon: BookOpen },
            { to: '/activities', label: 'Practice', icon: Code },
            { to: '/quizzes', label: 'Quizzes', icon: ClipboardCheck },
            { to: '/progress', label: 'Progress', icon: TrendingUp },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => cx(isActive && 'active')}>
                <Icon size={19} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
