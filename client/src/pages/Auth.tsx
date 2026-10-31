import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  CheckCircle2,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { useAuth } from '../auth';
import { api, ApiError } from '../api';
import { PasswordInput } from '../components/ui';
import { Logo } from '../components/Logo';
import { PILLARS } from '../lib';

function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth">
      <section className="auth-art">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <Logo light />
        </div>
        <div className="auth-art-inner">
          <h1>Master object-oriented programming, one level at a time.</h1>
          <p>
            Gamified lessons, drag-and-drop coding activities, and timed assessments across four
            difficulty tiers — built for C++ learners who want proof of progress.
          </p>
          <div className="auth-features">
            {[
              { icon: <Brain size={15} />, text: '27 lessons across encapsulation, abstraction, inheritance, and polymorphism' },
              { icon: <Sparkles size={15} />, text: 'Interactive fill-in-the-blank coding activities with hints and lives' },
              { icon: <Trophy size={15} />, text: '45 badges and a verifiable certificate when you finish the module' },
              { icon: <ShieldCheck size={15} />, text: 'Progress, scores, and achievements saved to your account' },
            ].map((f) => (
              <div className="auth-feature" key={f.text}>
                <span className="auth-feature-icon">{f.icon}</span>
                <span>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="auth-pillars">
          {PILLARS.map((p) => (
            <span className="auth-pillar" key={p}>{p}</span>
          ))}
        </div>
      </section>
      <section className="auth-form-wrap">
        <div className="auth-form">
          <div className="auth-brand-mobile">
            <Logo />
          </div>
          {children}
          <p className="tiny muted text-center">
            © {new Date().getFullYear()} eMódulo · An educational OOP learning platform
          </p>
        </div>
      </section>
    </div>
  );
}

function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return <div className="alert alert-danger small">{message}</div>;
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setBusy(true);
    try {
      await login(email.trim(), password);
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not sign in. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout>
      <div>
        <h2>Welcome back</h2>
        <p className="sub">Sign in to continue your OOP journey.</p>
      </div>
      <form className="stack gap-16" onSubmit={submit} noValidate>
        <div className="field">
          <label className="field-label" htmlFor="email">Email</label>
          <input
            id="email"
            className="input"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="field">
          <div className="row between">
            <label className="field-label" htmlFor="password">Password</label>
            <Link to="/forgot-password" className="tiny" style={{ color: 'var(--primary)', fontWeight: 650 }}>
              Forgot password?
            </Link>
          </div>
          <PasswordInput id="password" value={password} onChange={setPassword} placeholder="Enter your password" autoComplete="current-password" />
        </div>
        <ErrorNote message={error} />
        <button className="btn btn-primary btn-lg btn-block" disabled={busy}>
          {busy ? 'Signing in…' : 'Log in'}
          {!busy && <ArrowRight size={17} />}
        </button>
      </form>

      <div className="demo-box">
        <div className="row between gap-8" style={{ marginBottom: 6 }}>
          <strong style={{ color: 'var(--ink-2)' }}>Demo account</strong>
          <button
            type="button"
            onClick={() => {
              setEmail('student@emodulo.edu');
              setPassword('Emodulo2025!');
            }}
          >
            Fill credentials
          </button>
        </div>
        <div><code>student@emodulo.edu</code> · <code>Emodulo2025!</code></div>
        <div style={{ marginTop: 4 }}>Instructor: <code>instructor@emodulo.edu</code> (same password)</div>
      </div>

      <p className="small muted text-center">
        New to eMódulo? <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 700 }}>Create an account</Link>
      </p>
    </AuthLayout>
  );
}

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await register(email.trim().toLowerCase(), password, confirm);
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create your account.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout>
      <div>
        <h2>Create your account</h2>
        <p className="sub">Start the module and track every badge you earn.</p>
      </div>
      <form className="stack gap-16" onSubmit={submit} noValidate>
        <div className="field">
          <label className="field-label" htmlFor="email">Email</label>
          <input id="email" className="input" type="email" autoComplete="email" placeholder="Enter email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <span className="field-hint">You will use this email to sign in.</span>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="password">Create password</label>
          <PasswordInput id="password" value={password} onChange={setPassword} placeholder="At least 8 characters" autoComplete="new-password" />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="confirm">Confirm password</label>
          <PasswordInput id="confirm" value={confirm} onChange={setConfirm} placeholder="Re-enter password" autoComplete="new-password" invalid={!!confirm && confirm !== password} />
          {confirm && confirm !== password && <span className="field-error">Passwords do not match.</span>}
        </div>
        <ErrorNote message={error} />
        <button className="btn btn-primary btn-lg btn-block" disabled={busy}>
          {busy ? 'Creating account…' : 'Sign up'}
          {!busy && <ArrowRight size={17} />}
        </button>
      </form>
      <div className="alert alert-info small">
        <Lock size={15} />
        Passwords are hashed with bcrypt and never stored in plain text.
      </div>
      <p className="small muted text-center">
        Already have an account? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 700 }}>Log in</Link>
      </p>
    </AuthLayout>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError('Enter the email on your account.');
      return;
    }
    setBusy(true);
    try {
      const data = await api.post<{ message: string; devToken?: string }>('/auth/forgot-password', { email: email.trim() });
      setSent(true);
      setToken(data.devToken ?? null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not start the reset.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout>
      <Link to="/login" className="row gap-6 small" style={{ color: 'var(--muted)', fontWeight: 600 }}>
        <ArrowLeft size={15} /> Back to log in
      </Link>
      <div>
        <h2>Reset your password</h2>
        <p className="sub">We will prepare a single-use reset link for your account.</p>
      </div>
      {!sent ? (
        <form className="stack gap-16" onSubmit={submit} noValidate>
          <div className="field">
            <label className="field-label" htmlFor="email">Email</label>
            <input id="email" className="input" type="email" autoComplete="email" placeholder="Enter email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <ErrorNote message={error} />
          <button className="btn btn-primary btn-lg btn-block" disabled={busy}>
            {busy ? 'Preparing…' : 'Send reset link'}
          </button>
        </form>
      ) : (
        <div className="stack gap-16">
          <div className="alert alert-success">
            <CheckCircle2 size={17} />
            <div>
              <strong>Reset link prepared.</strong>
              <div className="small">If the email is registered, a link is now valid for one hour.</div>
            </div>
          </div>
          {token ? (
            <div className="panel stack gap-10">
              <div className="tiny muted">
                This deployment has no mail service configured, so the single-use link is shown here and logged on the server.
              </div>
              <button className="btn btn-primary" onClick={() => navigate(`/reset-password?token=${token}`)}>
                Continue to reset password <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <p className="small muted">Check your inbox for the reset link, then return to this page.</p>
          )}
          <Link to="/login" className="small" style={{ color: 'var(--primary)', fontWeight: 650 }}>Return to log in</Link>
        </div>
      )}
    </AuthLayout>
  );
}

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError('This reset link is missing its token. Request a new link.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reset your password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout>
      <div>
        <h2>Choose a new password</h2>
        <p className="sub">Make it at least 8 characters and different from your old one.</p>
      </div>
      {done ? (
        <div className="stack gap-16">
          <div className="alert alert-success">
            <CheckCircle2 size={17} />
            <div>
              <strong>Password updated.</strong>
              <div className="small">All other sessions were signed out.</div>
            </div>
          </div>
          <button className="btn btn-primary btn-block" onClick={() => navigate('/login')}>
            Go to log in
          </button>
        </div>
      ) : (
        <form className="stack gap-16" onSubmit={submit} noValidate>
          <div className="field">
            <label className="field-label" htmlFor="new">New password</label>
            <PasswordInput id="new" value={password} onChange={setPassword} placeholder="At least 8 characters" autoComplete="new-password" />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="confirm">Confirm new password</label>
            <PasswordInput id="confirm" value={confirm} onChange={setConfirm} placeholder="Re-enter password" autoComplete="new-password" />
          </div>
          <ErrorNote message={error} />
          <button className="btn btn-primary btn-lg btn-block" disabled={busy}>
            {busy ? 'Updating…' : 'Set new password'}
          </button>
        </form>
      )}
      <div className="alert alert-info small">
        <Mail size={15} /> Need a new link? <Link to="/forgot-password" style={{ fontWeight: 700 }}>Request another</Link>
      </div>
    </AuthLayout>
  );
}
