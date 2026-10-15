import type { CSSProperties } from 'react';

export type IconName = 'arrow' | 'globe' | 'calendar' | 'pin' | 'grid' | 'edit' | 'palette' | 'settings' | 'logout' | 'check' | 'plus' | 'external' | 'lock' | 'book' | 'leaf';
const paths: Record<IconName, string> = {
  arrow: 'M5 12h14m-6-6 6 6-6 6', globe: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z',
  calendar: 'M5 5h14v15H5zM8 3v4m8-4v4M5 10h14', pin: 'M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  edit: 'm4 16 11-11 4 4L8 20H4v-4Zm9-9 4 4M4 20h16', palette: 'M12 3a9 9 0 1 0 0 18c4 0 0-5 4-5h2c5 0 2-13-6-13ZM7 9h.01M12 6h.01M17 9h.01M7 14h.01',
  settings: 'M4 7h16M4 17h16M9 4v6m6 4v6', logout: 'M9 4H4v16h5m5-13 5 5-5 5m-5-5h10', check: 'm5 12 4 4L19 6', plus: 'M12 5v14M5 12h14',
  external: 'M14 3h7v7m0-7-11 11M10 3H3v18h18v-7', lock: 'M6 10h12v11H6zM8 10V7a4 4 0 0 1 8 0v3m-4 5v2',
  book: 'M3 4c4-1 7 0 9 2 2-2 5-3 9-2v15c-4-1-7 0-9 2-2-2-5-3-9-2V4Zm9 2v15', leaf: 'M20 3C7 2 2 8 5 15s15 5 15-12ZM5 20 16 9',
};
export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}
export function Brand({ compact = false }: { compact?: boolean }) {
  return <span className="brand"><span className="brand-mark"><svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="m16 3 12 7v13l-12 7-12-7V10l12-7Zm0 0v14m12-7-12 7L4 10m12 7v13" stroke="currentColor" strokeWidth="1.7" /><path d="m10 6 12 7v13M22 6 10 13v13" stroke="currentColor" strokeOpacity=".4" /></svg></span><span>SEP{!compact && <small>Scientific Events Platform</small>}</span></span>;
}
export function ScienceArt({ theme, year = '26' }: { theme: 'forest' | 'ocean'; year?: string }) {
  return <div className={`science-art art-${theme}`} aria-hidden="true">
    <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
    <svg className="art-sphere" viewBox="0 0 460 460" fill="none">
      <defs><radialGradient id={`glow-${theme}`}><stop stopColor="currentColor" stopOpacity=".14" /><stop offset="1" stopColor="currentColor" stopOpacity="0" /></radialGradient></defs>
      <circle cx="230" cy="230" r="225" fill={`url(#glow-${theme})`} />
      <g stroke="currentColor" strokeOpacity=".35" strokeWidth=".75">
        <circle cx="230" cy="230" r="159" />
        {[32, 72, 115, 145].map((rx) => <ellipse key={rx} cx="230" cy="230" rx={rx} ry="159" transform="rotate(-22 230 230)" />)}
        {[-110, -70, -25, 25, 70, 110].map((offset) => <ellipse key={offset} cx="230" cy={230 + offset} rx={Math.sqrt(159 ** 2 - offset ** 2)} ry="24" transform="rotate(-22 230 230)" />)}
        <circle cx="230" cy="230" r="198" strokeDasharray="2 9" />
        <path d="M56 305 341 91M95 80l270 286M25 202l398 53" strokeOpacity=".35" />
      </g>
      {Array.from({ length: 22 }, (_, i) => {
        const angle = i * 2.39996; const radius = 35 + (i % 6) * 26;
        return <circle key={i} cx={230 + Math.cos(angle) * radius} cy={230 + Math.sin(angle) * radius} r={i % 4 === 0 ? 4 : 2} fill="currentColor" opacity={i % 3 === 0 ? 1 : .5} />;
      })}
      <circle cx="341" cy="91" r="6" fill="var(--coral)" /><circle cx="95" cy="80" r="4" fill="currentColor" />
    </svg>
    <div className="art-year">20<span>{year}</span></div>
    <span className="art-coordinate">SEP / {year}</span>
    <div className="art-note"><span className="note-line" /><span>↗</span></div>
  </div>;
}
export function StatusBadge({ status, label }: { status: string; label: string }) { return <span className={`status status-${status}`}><i />{label}</span>; }
export function DotPattern({ style }: { style?: CSSProperties }) { return <div className="dot-pattern" style={style} aria-hidden="true" />; }
