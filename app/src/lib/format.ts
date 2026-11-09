import type { Lang } from './i18n';

export const usd = (n: number, digits = 2) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;

export const usdCompact = (n: number) => {
  const a = Math.abs(n);
  const s = n < 0 ? '-' : '';
  if (a >= 1e12) return `${s}$${(a / 1e12).toFixed(2)}T`;
  if (a >= 1e9) return `${s}$${(a / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(2)}M`;
  if (a >= 1e4) return `${s}$${(a / 1e3).toFixed(1)}K`;
  return usd(n);
};

export const pct = (n: number, digits = 2) => `${n > 0 ? '+' : ''}${n.toFixed(digits)}%`;

export const fmtDate = (iso: string, lang: Lang = 'he') => {
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso);
  return d.toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' });
};
/** @deprecated use fmtDate */
export const heDate = (iso: string) => fmtDate(iso, 'he');

export const fmtTime = (iso: string, lang: Lang = 'he') =>
  new Date(iso).toLocaleString(lang === 'he' ? 'he-IL' : 'en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export const timeAgo = (iso: string, lang: Lang = 'he') => {
  const min = (Date.now() - new Date(iso).getTime()) / 6e4;
  const he = lang === 'he';
  if (min < 60) return he ? `לפני ${Math.max(1, Math.round(min))} דק'` : `${Math.max(1, Math.round(min))}m ago`;
  const h = min / 60;
  if (h < 24) return he ? `לפני ${Math.round(h)} שעות` : `${Math.round(h)}h ago`;
  const d = Math.round(h / 24);
  return he ? (d === 1 ? 'אתמול' : `לפני ${d} ימים`) : d === 1 ? 'yesterday' : `${d}d ago`;
};
