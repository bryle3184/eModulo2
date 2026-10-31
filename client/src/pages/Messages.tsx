import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  MessageSquare,
  PenSquare,
  Search,
  Send,
  UserRound,
} from 'lucide-react';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';
import { useToast } from '../toast';
import { EmptyState, Modal, Spinner } from '../components/ui';
import { cx, formatDate, initials } from '../lib';

interface ThreadSummary {
  id: number;
  subject: string;
  otherName: string;
  otherAvatar: string;
  lastMessage: string;
  lastAt: string;
  unread: number;
  updatedAt: string;
}

interface ThreadDetail {
  thread: {
    id: number;
    subject: string;
    createdAt: string;
    other: { id: number; name: string; avatar: string; role: string; occupation: string };
  };
  messages: {
    id: number;
    body: string;
    createdAt: string;
    mine: boolean;
    senderName: string;
    senderAvatar: string;
    senderRole: string;
  }[];
}

export function MessagesPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [detail, setDetail] = useState<ThreadDetail | null>(null);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [compose, setCompose] = useState({ subject: '', body: '' });
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const bodyRef = useRef<HTMLDivElement>(null);

  const loadThreads = async (query = '') => {
    const res = await api.get<{ threads: ThreadSummary[] }>(
      `/messages/threads${query ? `?q=${encodeURIComponent(query)}` : ''}`,
    );
    setThreads(res.threads);
    setLoading(false);
  };

  useEffect(() => {
    const id = window.setTimeout(() => void loadThreads(q), q ? 280 : 0);
    return () => window.clearTimeout(id);
  }, [q]);

  useEffect(() => {
    if (!selected) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    api
      .get<ThreadDetail>(`/messages/threads/${selected}`)
      .then((d) => {
        setDetail(d);
        setThreads((prev) => prev.map((t) => (t.id === selected ? { ...t, unread: 0 } : t)));
        window.setTimeout(() => bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' }), 60);
      })
      .catch((e) => toast.error('Could not open the conversation', e instanceof ApiError ? e.message : undefined))
      .finally(() => setDetailLoading(false));
  }, [selected, toast]);

  const send = async () => {
    if (!selected || !draft.trim()) return;
    setSending(true);
    try {
      const res = await api.post<{ message: ThreadDetail['messages'][number] }>(
        `/messages/threads/${selected}/messages`,
        { body: draft.trim() },
      );
      setDetail((prev) => (prev ? { ...prev, messages: [...prev.messages, res.message] } : prev));
      setDraft('');
      void loadThreads(q);
      window.setTimeout(() => bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' }), 60);
    } catch (err) {
      toast.error('Message not sent', err instanceof ApiError ? err.message : undefined);
    } finally {
      setSending(false);
    }
  };

  const createThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compose.subject.trim() || !compose.body.trim()) {
      toast.error('Add a subject and a message');
      return;
    }
    setSending(true);
    try {
      const res = await api.post<{ threadId: number }>('/messages/threads', compose);
      setComposeOpen(false);
      setCompose({ subject: '', body: '' });
      await loadThreads(q);
      setSelected(res.threadId);
      toast.success('Message sent to your instructor');
    } catch (err) {
      toast.error('Could not send the message', err instanceof ApiError ? err.message : undefined);
    } finally {
      setSending(false);
    }
  };

  const unread = threads.reduce((sum, t) => sum + t.unread, 0);

  return (
    <div className="page-in">
      <div className="page-head">
        <div>
          <div className="eyebrow"><MessageSquare size={13} /> Conversations</div>
          <h1>Messages</h1>
          <p>
            {user?.role === 'instructor'
              ? 'Reply to your students here. Opening a conversation marks it as read.'
              : `You have ${unread} unread message${unread === 1 ? '' : 's'}. Ask your instructor about any concept or activity.`}
          </p>
        </div>
        {user?.role !== 'instructor' && (
          <button className="btn btn-primary" onClick={() => setComposeOpen(true)}>
            <PenSquare size={15} /> Compose
          </button>
        )}
      </div>

      <div className="messages">
        <div className={cx('threads-col', !!selected && 'has-active')}>
          <div className="threads-head">
            <div className="searchbox">
              <Search size={15} />
              <input
                className="input"
                placeholder="Search conversations"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                aria-label="Search conversations"
              />
            </div>
            {unread > 0 && <span className="chip chip-primary" style={{ alignSelf: 'flex-start' }}>{unread} unread</span>}
          </div>
          <div className="thread-list">
            {loading ? (
              <div style={{ padding: 20 }}><Spinner /></div>
            ) : threads.length === 0 ? (
              <EmptyState
                icon={<MessageSquare size={22} />}
                title={q ? 'No matching conversations' : 'No messages yet'}
                description={q ? 'Try a different search term.' : 'Start a conversation with your instructor.'}
              />
            ) : (
              threads.map((t) => (
                <button
                  key={t.id}
                  className={cx('thread-row', selected === t.id && 'active')}
                  onClick={() => setSelected(t.id)}
                >
                  <span className={cx('avatar', `avatar-${t.otherAvatar}`)}>{initials(t.otherName.split(' ')[0], t.otherName.split(' ')[1])}</span>
                  <span className="grow" style={{ minWidth: 0 }}>
                    <span className="thread-sub">
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</span>
                      <span className="thread-time">{formatDate(t.lastAt)}</span>
                    </span>
                    <span className="thread-preview">{t.lastMessage}</span>
                    <span className="tiny muted">{t.otherName}</span>
                  </span>
                  {t.unread > 0 && <span className="nav-badge">{t.unread}</span>}
                </button>
              ))
            )}
          </div>
        </div>

        <div className={cx('chat-col', !selected && 'hidden-mobile')}>
          {!selected ? (
            <div className="empty" style={{ margin: 'auto' }}>
              <div className="empty-icon"><MessageSquare size={22} /></div>
              <div style={{ fontWeight: 650, color: 'var(--ink)' }}>Select a conversation</div>
              <div className="small">Choose a thread on the left to read it here.</div>
            </div>
          ) : detailLoading && !detail ? (
            <Spinner label="Opening conversation…" />
          ) : detail ? (
            <>
              <div className="chat-head">
                <button className="icon-btn" onClick={() => setSelected(null)} aria-label="Back to conversations">
                  <ArrowLeft size={17} />
                </button>
                <span className={cx('avatar', `avatar-${detail.thread.other.avatar}`)}>
                  {initials(detail.thread.other.name.split(' ')[0], detail.thread.other.name.split(' ')[1])}
                </span>
                <div className="grow" style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {detail.thread.subject}
                  </div>
                  <div className="tiny muted row gap-6">
                    <UserRound size={11} /> {detail.thread.other.name}
                    {detail.thread.other.occupation ? ` · ${detail.thread.other.occupation}` : ''}
                  </div>
                </div>
              </div>
              <div className="chat-body" ref={bodyRef}>
                <div className="chat-day">Conversation started {formatDate(detail.thread.createdAt)}</div>
                {detail.messages.map((m) => (
                  <div key={m.id} className={cx('msg', m.mine && 'mine')}>
                    <span className={cx('avatar', `avatar-${m.senderAvatar}`)} style={{ width: 30, height: 30, fontSize: '0.66rem' }}>
                      {initials(m.senderName.split(' ')[0], m.senderName.split(' ')[1])}
                    </span>
                    <div>
                      <div className="msg-bubble">{m.body}</div>
                      <div className="msg-meta">{m.mine ? 'You' : m.senderName.split(' ')[0]} · {formatDate(m.createdAt, true)}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="chat-compose">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Write a reply…"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                  aria-label="Reply message"
                />
                <button className="btn btn-primary" onClick={send} disabled={sending || !draft.trim()}>
                  <Send size={15} /> Send
                </button>
              </div>
            </>
          ) : (
            <EmptyState icon={<MessageSquare size={22} />} title="Conversation unavailable" />
          )}
        </div>
      </div>

      <Modal open={composeOpen} onClose={() => setComposeOpen(false)} title="New message">
        <form className="stack gap-16" onSubmit={createThread}>
          <div className="field">
            <label className="field-label" htmlFor="subject">Subject</label>
            <input
              id="subject"
              className="input"
              value={compose.subject}
              onChange={(e) => setCompose({ ...compose, subject: e.target.value })}
              placeholder="e.g. Help with the polymorphism activity"
              maxLength={120}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="body">Message</label>
            <textarea
              id="body"
              className="textarea"
              value={compose.body}
              onChange={(e) => setCompose({ ...compose, body: e.target.value })}
              placeholder="Write your question for the instructor…"
              maxLength={4000}
            />
          </div>
          <div className="row gap-10">
            <button className="btn btn-primary" disabled={sending}>{sending ? 'Sending…' : 'Send message'}</button>
            <button type="button" className="btn btn-ghost" onClick={() => setComposeOpen(false)}>Cancel</button>
          </div>
          <p className="tiny muted">Messages are delivered to your instructor's eMódulo inbox. <Link to="/help" style={{ color: 'var(--primary)' }}>Need help?</Link></p>
        </form>
      </Modal>
    </div>
  );
}
