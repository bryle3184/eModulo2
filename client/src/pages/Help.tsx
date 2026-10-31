import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, LifeBuoy, Mail, MessageSquare, Send } from 'lucide-react';
import { api, ApiError } from '../api';
import { useToast } from '../toast';

const FAQS = [
  {
    q: 'How do I earn badges?',
    a: 'Assessment badges are awarded by score, each activity awards its own badge when every blank is correct, and each module section awards a completion badge once all of its lessons are read. Everything is recorded automatically on your account.',
  },
  {
    q: 'Why did my assessment end early?',
    a: 'At Moderate, Challenging, and Tough levels each wrong answer costs a life. When your lives reach zero the attempt is submitted immediately. You can retry — the best score is kept.',
  },
  {
    q: 'Do hints really cost points?',
    a: 'At Easy level hints are free and unlimited. Moderate hints deduct 1 point each. Challenging and Tough allow a single hint for the whole test, which also deducts 1 point. The HUD always shows how many hints you have used.',
  },
  {
    q: 'What is required for a certificate?',
    a: 'Finish all 27 lessons, earn the pre-test badge, the four activity badges, and the post-test badge at the same level. The certificate page shows a live checklist and will not issue until every item is checked.',
  },
  {
    q: 'Can I change difficulty after starting?',
    a: 'Yes. Lesson progress, badges, and scores stay on your account. Each level keeps its own assessment attempts and certificate checklist.',
  },
  {
    q: 'Is my progress saved if I close the browser?',
    a: 'Yes. Lessons, scores, badges, and messages are stored in the eMódulo database. An in-progress timed test keeps its original deadline, so you cannot pause the clock by leaving.',
  },
];

export function HelpPage() {
  const toast = useToast();
  const [open, setOpen] = useState<number | null>(0);
  const [form, setForm] = useState({ topic: '', message: '' });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.topic.trim().length < 2 || form.message.trim().length < 5) {
      toast.error('Add a topic and a little more detail');
      return;
    }
    setBusy(true);
    try {
      await api.post('/support', form);
      setSent(true);
      setForm({ topic: '', message: '' });
      toast.success('Support request sent', 'Your instructor will reply in Messages.');
    } catch (err) {
      toast.error('Could not send your request', err instanceof ApiError ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-in">
      <div className="page-head">
        <div>
          <div className="eyebrow"><LifeBuoy size={13} /> Support</div>
          <h1>Help &amp; support</h1>
          <p>Answers to the questions learners ask most, plus a direct line to your instructor.</p>
        </div>
        <Link to="/messages" className="btn btn-outline"><MessageSquare size={15} /> Open messages</Link>
      </div>

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <section className="card">
          <div className="card-head"><h3>Frequently asked</h3></div>
          <div>
            {FAQS.map((f, i) => (
              <div key={f.q} style={{ borderBottom: i === FAQS.length - 1 ? 'none' : '1px solid var(--line)' }}>
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  aria-expanded={open === i}
                  style={{
                    display: 'flex',
                    width: '100%',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '15px 18px',
                    background: 'transparent',
                    border: 0,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontWeight: 650,
                    fontSize: '0.88rem',
                  }}
                >
                  {f.q}
                  <ChevronDown size={16} style={{ flex: 'none', transform: open === i ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
                </button>
                {open === i && (
                  <p className="small muted" style={{ padding: '0 18px 16px', lineHeight: 1.65 }}>{f.a}</p>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="card card-pad">
          <h3>Contact your instructor</h3>
          <p className="small muted mt-4">
            Send a support request and it arrives as a conversation in Messages. Replies land in your inbox.
          </p>
          {sent && (
            <div className="alert alert-success small mt-12">
              <Send size={15} /> Your request was sent. Continue the conversation in <Link to="/messages" style={{ fontWeight: 700 }}>Messages</Link>.
            </div>
          )}
          <form className="stack gap-16 mt-16" onSubmit={submit}>
            <div className="field">
              <label className="field-label" htmlFor="topic">Topic</label>
              <input
                id="topic"
                className="input"
                value={form.topic}
                onChange={(e) => setForm({ ...form, topic: e.target.value })}
                placeholder="e.g. Confused about pure virtual functions"
                maxLength={120}
              />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="message">Message</label>
              <textarea
                id="message"
                className="textarea"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Describe what you need help with…"
                maxLength={4000}
              />
            </div>
            <button className="btn btn-primary" disabled={busy}>
              <Send size={15} /> {busy ? 'Sending…' : 'Send request'}
            </button>
          </form>
          <div className="panel mt-20 small muted row gap-10">
            <Mail size={15} /> Prefer email? Write to <strong>instructor@emodulo.edu</strong>.
          </div>
        </section>
      </div>
    </div>
  );
}
