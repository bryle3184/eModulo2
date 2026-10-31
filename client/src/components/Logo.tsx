export function Logo({ compact = false, light = false }: { compact?: boolean; light?: boolean }) {
  return (
    <div className="brand" style={compact ? { padding: 0 } : undefined}>
      <span className="brand-mark" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M3.2 17.4 8.6 8.7l3.5 5 2.5-3.4 6.2 7.1z" fill="currentColor" opacity="0.95" />
          <path d="M2.5 19.2h19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.55" />
        </svg>
      </span>
      {!compact && (
        <div>
          <div className="brand-name" style={light ? { color: '#fff' } : undefined}>
            eMódulo
          </div>
          <div className="brand-sub" style={light ? { color: '#8ea6c8' } : undefined}>
            Learn OOP
          </div>
        </div>
      )}
    </div>
  );
}
