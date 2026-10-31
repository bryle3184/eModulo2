import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

type ToastTone = 'info' | 'success' | 'danger' | 'warning';

interface ToastItem {
  id: number;
  title: string;
  body?: string;
  tone: ToastTone;
}

interface ToastApi {
  push: (title: string, body?: string, tone?: ToastTone) => void;
  success: (title: string, body?: string) => void;
  error: (title: string, body?: string) => void;
  info: (title: string, body?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (title: string, body?: string, tone: ToastTone = 'info') => {
      counter.current += 1;
      const id = counter.current;
      setItems((prev) => [...prev.slice(-3), { id, title, body, tone }]);
      window.setTimeout(() => remove(id), 5200);
    },
    [remove],
  );

  const api = useMemo<ToastApi>(
    () => ({
      push,
      success: (title, body) => push(title, body, 'success'),
      error: (title, body) => push(title, body, 'danger'),
      info: (title, body) => push(title, body, 'info'),
    }),
    [push],
  );

  const icons: Record<ToastTone, ReactNode> = {
    info: <Info size={18} />,
    success: <CheckCircle2 size={18} />,
    danger: <AlertCircle size={18} />,
    warning: <AlertCircle size={18} />,
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone === 'info' ? 'info' : t.tone}`}>
            <span style={{ color: `var(--${t.tone === 'danger' ? 'danger' : t.tone === 'success' ? 'success' : t.tone === 'warning' ? 'warning' : 'primary'})` }}>
              {icons[t.tone]}
            </span>
            <div className="grow">
              <div className="toast-title">{t.title}</div>
              {t.body && <div className="toast-body">{t.body}</div>}
            </div>
            <button className="icon-btn" onClick={() => remove(t.id)} aria-label="Dismiss notification">
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
