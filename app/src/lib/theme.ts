export const colors = {
  bg: '#0A0F1E',
  bgElevated: '#10172B',
  card: '#141C33',
  cardHi: '#1A2442',
  border: '#232E50',
  text: '#EEF2FF',
  textDim: '#9AA6C7',
  textMute: '#6B7699',
  brand: '#7C5CFF',
  brand2: '#3DD6F5',
  up: '#2BD98B',
  upBg: 'rgba(43,217,139,0.12)',
  down: '#FF5C7A',
  downBg: 'rgba(255,92,122,0.12)',
  warn: '#FFB547',
  warnBg: 'rgba(255,181,71,0.12)',
  tech: '#3DD6F5',
  fund: '#A78BFA',
  sent: '#FFB547',
};

export const radius = { sm: 10, md: 14, lg: 20, xl: 28 };
export const space = (n: number) => n * 4;

export const fonts = {
  regular: 'Heebo_400Regular',
  medium: 'Heebo_500Medium',
  bold: 'Heebo_700Bold',
  black: 'Heebo_800ExtraBold',
};

/** Score colour scale: red → amber → green */
export function scoreColor(score: number) {
  if (score >= 75) return colors.up;
  if (score >= 60) return '#9BE15D';
  if (score >= 45) return colors.warn;
  return colors.down;
}

export const pillarMeta = {
  technical: { label: 'טכני', color: colors.tech, icon: 'trending-up' as const },
  fundamental: { label: 'פונדמנטלי', color: colors.fund, icon: 'bar-chart-2' as const },
  sentiment: { label: 'סנטימנט', color: colors.sent, icon: 'message-circle' as const },
};

export const SECTOR_HE: Record<string, string> = {
  Technology: 'טכנולוגיה',
  'Communication Services': 'תקשורת',
  'Consumer Cyclical': 'צריכה מחזורית',
  'Consumer Defensive': 'צריכה בסיסית',
  'Financial Services': 'פיננסים',
  Healthcare: 'בריאות',
  Energy: 'אנרגיה',
  Industrials: 'תעשייה',
  'Basic Materials': 'חומרי גלם',
  'Real Estate': 'נדל"ן',
  Utilities: 'תשתיות',
  Other: 'אחר',
};
export const sectorHe = (s: string) => SECTOR_HE[s] ?? s;
