import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Bell, BellOff, CheckCheck, MessageSquare, Target, Trophy, UserPlus } from 'lucide-react';
import { api } from '../api';
import { useToast } from '../toast';
import { Spinner, EmptyState } from '../components/ui';
import { cx, timeAgo } from '../lib';

interface Notification {
  id: number;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

function iconFor(type: string) {
  if (type === 'badge') return <Award size={17} />;
  if (type === 'result') return <Target size={17} />;
  if (type === 'message') return <MessageSquare size={17} />;
  if (type === 'certificate') return <Trophy size={17} />;
  if (type === 'welcome') return <UserPlus size={17} />;
  return <Bell size={17} />;
}

export function NotificationsPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [data, setData] = useState<{ unread: number; notifications: Notification[] } | null>(null);

  const load = async () => {
    const res = await api.get<{ unread: number; notifications: Notification[] }>('/notifications');
    setData(res);
  };

  useEffect(() => {
    void load();
  }, []);

  if (!data) return <Spinner label="Loading notifications…" />;

  const markAll = async () => {
    await api.post('/notifications/read-all');
    setData({ unread: 0, notifications: data.notifications.map((n) => ({ ...n, read: true })) });
    toast.success('All notifications marked as read');
  };

  const open = async (n: Notification) => {
    if (!n.read) {
      try {
        await api.post(`/notifications/${n.id}/read`);
        setData((prev) =>
          prev
            ? {
                unread: Math.max(0, prev.unread - 1),
                notifications: prev.notifications.map((x) => (x.id === n.id ? { ...x, read: true } : x)),
              }
            : prev,
        );
      } catch {
        /* non-blocking */
      }
    }
    if (n.link) navigate(n.link);
  };

  return (
    <div className="page-in">
      <div className="page-head">
        <div>
          <div className="eyebrow"><Bell size={13} /> Inbox</div>
          <h1>Notifications</h1>
          <p>{data.unread > 0 ? `${data.unread} unread notification${data.unread === 1 ? '' : 's'}.` : 'You are all caught up.'}</p>
        </div>
        <button className="btn btn-outline" onClick={markAll} disabled={data.unread === 0}>
          <CheckCheck size={15} /> Mark all as read
        </button>
      </div>

      <section className="card">
        {data.notifications.length === 0 ? (
          <EmptyState
            icon={<BellOff size={22} />}
            title="No notifications yet"
            description="Badge unlocks, assessment results, certificates, and messages will appear here."
          />
        ) : (
          <div className="notif-list">
            {data.notifications.map((n) => (
              <button key={n.id} className={cx('notif', !n.read && 'unread')} onClick={() => open(n)} style={{ border: 0, textAlign: 'left', width: '100%', cursor: 'pointer' }}>
                <span className={cx('notif-icon', n.type)}>{iconFor(n.type)}</span>
                <span className="grow">
                  <span className="notif-title row gap-8">
                    {n.title}
                    {!n.read && <span className="dot dot-primary" />}
                  </span>
                  {n.body && <span className="notif-body" style={{ display: 'block' }}>{n.body}</span>}
                  <span className="notif-time" style={{ display: 'block' }}>{timeAgo(n.createdAt)}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
