import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Factor, PillarResult, SentimentResult } from './types';

export type Lang = 'he' | 'en';

// Hebrew-first product: always start in Hebrew; users switch with the עב/EN toggle.
const deviceLang: Lang = 'he';

export const useLang = create<{ lang: Lang; setLang: (l: Lang) => void }>()(
  persist((set) => ({ lang: deviceLang, setLang: (lang) => set({ lang }) }), {
    name: 'stoxx-lang',
    storage: createJSONStorage(() => AsyncStorage),
  }),
);

const D = {
  // tabs
  tab_rank: ['דירוג יומי', 'Top 50'],
  tab_portfolio: ['התיק שלי', 'Portfolio'],
  tab_watch: ['מעקב', 'Watchlist'],
  tab_learn: ['איך זה עובד', 'How it works'],
  tab_settings: ['הגדרות', 'Settings'],
  // home
  daily_rank: ['הדירוג היומי', 'Daily ranking'],
  top50_title: ['50 המובילות לפי המודל', 'Top 50 by the model'],
  avg_score: ['ציון ממוצע', 'Avg. score'],
  scanned: ['מניות נסרקו', 'Stocks scanned'],
  newcomers: ['חדשות ברשימה', 'New today'],
  updated: ['עודכן', 'Updated'],
  search_ph: ['חיפוש סימול או חברה', 'Search ticker or company'],
  sort_score: ['ציון כולל', 'Total score'],
  sort_tech: ['טכני', 'Technical'],
  sort_fund: ['פונדמנטלי', 'Fundamental'],
  sort_sent: ['סנטימנט', 'Sentiment'],
  all_sectors: ['כל הענפים', 'All sectors'],
  no_results: ['לא נמצאו מניות', 'No stocks found'],
  target: ['יעד', 'Target'],
  stop: ['סטופ', 'Stop'],
  new_badge: ['חדש', 'NEW'],
  load_error: ['לא ניתן לטעון את הדירוג העדכני. מוצג המידע האחרון שנשמר.', 'Could not load the latest ranking. Showing the last saved data.'],
  demo_banner: ['מצב הדגמה: הנתונים המוצגים סינתטיים ואינם נתוני שוק אמיתיים.', 'Demo mode: the data shown is synthetic, not real market data.'],
  disclaimer: [
    'המידע מוצג לצרכי מידע ולימוד בלבד ואינו מהווה ייעוץ השקעות, שיווק השקעות או המלצה לפעולה בניירות ערך. הדירוג מופק אוטומטית ע"י מודל כמותי ואינו מותאם אישית. השקעה בשוק ההון כרוכה בסיכון.',
    'For information and education only. Not investment advice, marketing or a recommendation to buy or sell any security. Rankings are produced automatically by a quantitative model and are not personalised. Investing involves risk.',
  ],
  // stock
  rank_of: ['מקום {n} מתוך 50', 'Rank {n} of 50'],
  score_yesterday: ['ציון קודם {n}', 'Previous score {n}'],
  earnings_on: ['דוחות ב-{d}', 'Earnings {d}'],
  overbought: ['קניית יתר', 'Overbought'],
  low_news: ['סיקור חדשותי דל', 'Low news coverage'],
  p_tech: ['ניתוח טכני', 'Technical analysis'],
  p_fund: ['ניתוח פונדמנטלי', 'Fundamental analysis'],
  p_sent: ['סנטימנט שוק', 'Market sentiment'],
  levels_title: ['רמות טכניות: כניסה, יעד וסטופ', 'Technical levels: entry, target & stop'],
  last_price: ['מחיר אחרון', 'Last price'],
  exit_target: ['יעד יציאה', 'Exit target'],
  rr: ['סיכוי/סיכון', 'Risk/reward'],
  analyst_avg: ['יעד אנליסטים ממוצע', 'Avg. analyst target'],
  col_metric: ['מדד', 'Metric'],
  col_value: ['ערך', 'Value'],
  col_points: ['נקודות', 'Points'],
  positive: ['חיובי', 'Positive'],
  neutral: ['ניטרלי', 'Neutral'],
  negative: ['שלילי', 'Negative'],
  sources_n: ['{n} מקורות', '{n} sources'],
  no_articles: ['אין כתבות רלוונטיות בשבוע האחרון.', 'No relevant articles in the past week.'],
  add_to_portfolio: ['הוספה לתיק שלי', 'Add to my portfolio'],
  not_in_top: ['המניה אינה ברשימת 50 המובילות של היום, ולכן אין לה כרגע ניתוח מפורט.', 'This stock is not in today’s top 50, so there is no detailed analysis right now.'],
  watch_add: ['הוספה לרשימת המעקב', 'Add to watchlist'],
  watch_remove: ['הסרה מרשימת המעקב', 'Remove from watchlist'],
  // portfolio
  pf_value: ['שווי התיק', 'Portfolio value'],
  pf_total: ['סה"כ', 'total'],
  pf_today: ['היום', 'today'],
  pf_empty_t: ['התיק שלך ריק', 'Your portfolio is empty'],
  pf_empty_b: ['הוסיפו עסקאות כדי לעקוב אחרי רווח/הפסד, פיזור ענפי וציון התיק.', 'Add trades to track P/L, sector mix and your portfolio score.'],
  pf_score: ['ציון תיק משוקלל', 'Weighted portfolio score'],
  pf_score_sub: ['לפי מניות שבדירוג היום', 'from stocks in today’s ranking'],
  pf_sectors: ['פיזור ענפי', 'Sector mix'],
  pf_holdings: ['אחזקות', 'Holdings'],
  pf_units: ["יח'", 'sh'],
  pf_avg_cost: ['עלות ממוצעת', 'avg. cost'],
  pf_no_quote: ['אין ציטוט עדכני למניה זו — מוצג לפי מחיר העלות.', 'No current quote for this stock — shown at cost.'],
  pf_day_change: ['שינוי יומי', 'Day change'],
  pf_add: ['הוספת עסקה', 'Add trade'],
  pf_local: ['נתוני התיק נשמרים במכשיר שלך בלבד ואינם נשלחים לשרת.', 'Your portfolio is stored only on this device and never sent to a server.'],
  pf_delete_t: ['מחיקת אחזקה', 'Delete holding'],
  pf_delete_b: ['למחוק את כל העסקאות של {s}?', 'Delete all trades of {s}?'],
  cancel: ['ביטול', 'Cancel'],
  delete: ['מחיקה', 'Delete'],
  // add holding
  ah_title: ['הוספת עסקה', 'Add trade'],
  ah_symbol: ['סימול מניה', 'Ticker'],
  ah_qty: ['כמות מניות', 'Shares'],
  ah_price: ['מחיר קנייה למניה ($)', 'Buy price per share ($)'],
  ah_date: ['תאריך', 'Date'],
  ah_save: ['שמירה', 'Save'],
  ah_last: ['מחיר אחרון', 'last price'],
  err_symbol: ['סימול לא תקין', 'Invalid ticker'],
  err_qty: ['כמות חייבת להיות גדולה מ-0', 'Shares must be greater than 0'],
  err_price: ['מחיר חייב להיות גדול מ-0', 'Price must be greater than 0'],
  err_date: ['תאריך בפורמט YYYY-MM-DD', 'Date must be YYYY-MM-DD'],
  // watchlist
  wl_title: ['רשימת מעקב', 'Watchlist'],
  wl_sub: ['מניות שסימנתם בכוכב. מניה שנכנסת ל-50 המובילות תוצג עם ניתוח מלא.', 'Stocks you starred. Any that enter the top 50 show a full analysis.'],
  wl_empty: ['עדיין לא הוספתם מניות. לחצו על ⭐ בדף מניה כדי לעקוב אחריה.', 'No stocks yet. Tap ⭐ on a stock page to follow it.'],
  wl_not_top: ['לא ב-50 המובילות היום', 'not in today’s top 50'],
  // settings
  st_title: ['הגדרות', 'Settings'],
  st_lang: ['שפה', 'Language'],
  st_privacy: ['מדיניות פרטיות', 'Privacy policy'],
  st_terms: ['תנאי שימוש', 'Terms of use'],
  st_contact: ['יצירת קשר ודיווח על תקלה', 'Contact & report a problem'],
  st_reset: ['מחיקת כל הנתונים שלי', 'Delete all my data'],
  st_reset_b: ['כל העסקאות, רשימת המעקב וההגדרות יימחקו מהמכשיר לצמיתות.', 'All trades, watchlist and settings will be permanently deleted from this device.'],
  st_about: ['על הנתונים', 'About the data'],
  st_demo: ['מצב הדגמה — נתונים סינתטיים.', 'Demo mode — synthetic data.'],
  st_last: ['עדכון אחרון: {d}.', 'Last update: {d}.'],
  st_source: ['מקור: {s}.', 'Source: {s}.'],
  st_method: ['גרסת מתודולוגיה {v}. נתוני מחירים ודוחות כספיים מסופקים ע"י ספקי מידע צד ג\' ועשויים להכיל עיכובים או טעויות.', 'Methodology v{v}. Prices and financials come from third-party providers and may contain delays or errors.'],
  st_version: ['גרסת אפליקציה {v}', 'App version {v}'],
  st_restart: ['השפה תתעדכן במלואה לאחר פתיחה מחדש של האפליקציה.', 'The layout direction updates fully after reopening the app.'],
  // onboarding
  ob_tagline: ['ניתוח מניות חכם — טכני, פונדמנטלי וסנטימנט, בציון אחד.', 'Smart stock analysis — technical, fundamental and sentiment in one score.'],
  ob_p1_t: ['דירוג יומי של 50 מניות', 'A daily top-50 ranking'],
  ob_p1_b: ['מודל כמותי מדרג את מניות S&P 500 לפי ציון 1–100, ומתעדכן לאורך יום המסחר.', 'A quantitative model scores every S&P 500 stock 1–100, refreshed through the trading day.'],
  ob_p2_t: ['שלושה שלישים לציון', 'Three equal thirds'],
  ob_p2_b: ['ניתוח טכני, ניתוח פונדמנטלי מול הענף, וסנטימנט מאתרי החדשות הפיננסיים הגדולים.', 'Technical analysis, fundamentals vs. the sector, and sentiment from major financial news outlets.'],
  ob_p3_t: ['התיק שלך', 'Your portfolio'],
  ob_p3_b: ['עקבו אחרי העסקאות שלכם — הנתונים נשמרים במכשיר בלבד.', 'Track your trades — data stays on your device.'],
  ob_important: ['חשוב לדעת', 'Important'],
  ob_legal: [
    'StoXX היא אפליקציית מידע ולימוד. הדירוגים, היעדים ורמות הסטופ מופקים אוטומטית ע"י מודל כמותי, אינם מותאמים לצרכים, למצב הכלכלי או להעדפות הסיכון שלך, ואינם מהווים ייעוץ השקעות, שיווק השקעות או המלצה לקנות או למכור נייר ערך. ייתכנו טעויות ועיכובים בנתונים. ביצועי עבר אינם מבטיחים תוצאות עתידיות, והשקעה בשוק ההון עלולה לגרום להפסד כספי. לפני קבלת החלטת השקעה מומלץ להתייעץ עם בעל רישיון.',
    'StoXX is an information and education app. Scores, targets and stop levels are generated automatically by a quantitative model, are not tailored to your needs, financial situation or risk preferences, and are not investment advice, investment marketing or a recommendation to buy or sell any security. Data may contain errors or delays. Past performance does not guarantee future results and investing may lead to losses. Consider consulting a licensed adviser before investing.',
  ],
  ob_check: ['קראתי והבנתי שהמידע באפליקציה אינו ייעוץ השקעות, ואני בן/בת 18 ומעלה.', 'I understand this app is not investment advice and I am 18 or older.'],
  ob_start: ['בואו נתחיל', 'Get started'],
  // price chart & full S&P list
  price_history: ['מחיר לאורך זמן', 'Price history'],
  chart_unavailable: ['אין נתוני גרף זמינים כרגע', 'Chart data not available yet'],
  no_score: ['ללא ציון', 'No score'],
  unscored_title: ['שאר מניות S&P 500', 'Rest of the S&P 500'],
  unscored_sub: ['מניות שלא נכנסו ל-50 המובילות — ללא ציון', 'Not in today’s top 50 — no score'],
  unscored_note: ['המניה לא נכנסה היום ל-50 המובילות לפי המודל, ולכן אין לה ציון וניתוח מפורט.', 'This stock is not in today’s model top 50, so it has no score or detailed analysis.'],
  // account
  ob_choose: ['איך תרצו להיכנס?', 'How would you like to continue?'],
  login_google: ['כניסה עם Google', 'Continue with Google'],
  login_google_sub: ['התיק ורשימת המעקב נשמרים בחשבון ומסונכרנים בין מכשירים', 'Portfolio and watchlist are saved to your account and synced across devices'],
  login_guest: ['המשך ללא הרשמה', 'Continue without signing up'],
  login_guest_sub: ['הנתונים נשמרים רק במכשיר הזה', 'Data stays on this device only'],
  login_unavailable: ['כניסה עם Google עדיין לא הופעלה באפליקציה', 'Google sign-in is not enabled yet'],
  login_check_first: ['יש לסמן את תיבת האישור לפני הכניסה', 'Please tick the confirmation box first'],
  st_account: ['חשבון', 'Account'],
  st_guest: ['אורח — הנתונים נשמרים במכשיר בלבד', 'Guest — data stays on this device'],
  st_signed_in: ['מחובר כ-{n}', 'Signed in as {n}'],
  st_sign_in: ['כניסה עם Google', 'Sign in with Google'],
  st_sign_out: ['התנתקות', 'Sign out'],
  st_delete_account: ['מחיקת החשבון וכל הנתונים', 'Delete account and all data'],
  st_delete_account_b: ['החשבון, התיק ורשימת המעקב יימחקו לצמיתות מהמכשיר ומהענן.', 'Your account, portfolio and watchlist will be permanently deleted from this device and the cloud.'],
  st_a11y: ['הצהרת נגישות', 'Accessibility statement'],
} as const;

export type Key = keyof typeof D;

export function translate(lang: Lang, key: Key, vars?: Record<string, string | number>) {
  let s: string = D[key][lang === 'he' ? 0 : 1];
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  return s;
}

export function useT() {
  const lang = useLang((s) => s.lang);
  return Object.assign((key: Key, vars?: Record<string, string | number>) => translate(lang, key, vars), { lang });
}

// ---------- Engine-generated text (the engine writes Hebrew) ----------

const SECTOR: Record<string, [string, string]> = {
  Technology: ['טכנולוגיה', 'Technology'],
  'Communication Services': ['תקשורת', 'Communication'],
  'Consumer Cyclical': ['צריכה מחזורית', 'Consumer Cyclical'],
  'Consumer Defensive': ['צריכה בסיסית', 'Consumer Staples'],
  'Financial Services': ['פיננסים', 'Financials'],
  Healthcare: ['בריאות', 'Healthcare'],
  Energy: ['אנרגיה', 'Energy'],
  Industrials: ['תעשייה', 'Industrials'],
  'Basic Materials': ['חומרי גלם', 'Materials'],
  'Real Estate': ['נדל"ן', 'Real Estate'],
  Utilities: ['תשתיות', 'Utilities'],
  Other: ['אחר', 'Other'],
};
export const sectorName = (s: string, lang: Lang) => SECTOR[s]?.[lang === 'he' ? 0 : 1] ?? s;

const FACTOR_LABEL_EN: Record<string, string> = {
  sma200: 'Price above 200-day MA',
  golden: '50-day MA above 200-day MA',
  sma100: 'Distance from 100-day MA',
  candles: 'Red candles before last green day',
  rsi: 'RSI(14)',
  macd: 'MACD',
  volume: 'Volume vs. 20-day avg.',
  pe: 'P/E vs. sector',
  peg: 'PEG (P/E to growth)',
  rev: 'Revenue growth (YoY)',
  eps: 'EPS growth',
  margin: 'Net margin vs. sector',
  de: 'Debt to equity',
  fcf: 'Free-cash-flow yield',
  roe: 'Return on equity (ROE)',
  net: 'Net sentiment (7 days)',
  pos: 'Positive articles',
  neg: 'Negative articles',
  src: 'Major outlets covering',
};

const VALUE_EN: [RegExp, string][] = [
  [/אין נתון/g, 'n/a'],
  [/^כן$/, 'Yes'],
  [/^לא$/, 'No'],
  [/הפסדית/g, 'Loss-making'],
  [/ענף/g, 'sector'],
  [/(\d+) אדומים ← ירוק/g, '$1 red → green'],
  [/היום האחרון אינו ירוק/g, 'Last day not green'],
  [/יציאה ממכירת יתר/g, 'leaving oversold'],
  [/אזור מאוזן/g, 'balanced'],
  [/מומנטום חזק/g, 'strong momentum'],
  [/קניית יתר/g, 'overbought'],
  [/חלש/g, 'weak'],
  [/חצייה כלפי מעלה/g, 'bullish cross'],
  [/משתפר/g, 'improving'],
  [/נחלש/g, 'weakening'],
  [/משניים/g, 'secondary'],
];

export function factorLabel(f: Factor, lang: Lang) {
  return lang === 'he' ? f.label : FACTOR_LABEL_EN[f.key] ?? f.label;
}
export function factorValue(f: Factor, lang: Lang) {
  if (lang === 'he') return f.value;
  return VALUE_EN.reduce((s, [re, to]) => s.replace(re, to), f.value);
}

export function levelsMethod(m: string, lang: Lang) {
  if (lang === 'he') return m;
  return m
    .replace('סטופ: 2×ATR מתחת למחיר', 'Stop: 2×ATR below price')
    .replace('סטופ: מתחת לממוצע 100', 'Stop: below the 100-day MA')
    .replace('יעד: שיא 60 יום (התנגדות)', 'Target: 60-day high (resistance)')
    .replace('יעד: שיא 52 שבועות (התנגדות)', 'Target: 52-week high (resistance)')
    .replace('יעד: יחס סיכוי/סיכון 1:2', 'Target: 1:2 risk/reward');
}

const fk = (p: PillarResult, k: string) => p.factors.find((f) => f.key === k);

/** English summaries, rebuilt from the factor table (same rules the engine uses in Hebrew). */
export function pillarSummary(kind: 'technical' | 'fundamental', p: PillarResult, sector: string, lang: Lang) {
  if (lang === 'he') return p.summary;
  const raw = p.factors.reduce((a, f) => a + f.points, 0);
  const s: string[] = [];
  if (kind === 'technical') {
    const up = (fk(p, 'sma200')?.points ?? 0) > 0 && (fk(p, 'golden')?.points ?? 0) > 0;
    s.push(up ? 'Long-term uptrend (above the 200-day MA, with the 50-day above it).' : (fk(p, 'sma200')?.points ?? 0) > 0 ? 'Price is above the 200-day MA, but the averages have not confirmed a full uptrend.' : 'Price is below the 200-day MA — the long-term trend is weak.');
    if ((fk(p, 'sma100')?.points ?? 0) >= 12) s.push(`Price is approaching the 100-day MA (${fk(p, 'sma100')!.value}), often a support zone.`);
    if ((fk(p, 'candles')?.points ?? 0) >= 14) s.push(`Possible reversal pattern: ${factorValue(fk(p, 'candles')!, 'en')}.`);
    if (fk(p, 'rsi')?.points === 0) s.push('RSI signals overbought — correction risk.');
    s.push(raw >= 70 ? 'Positive technical picture.' : raw >= 45 ? 'Mixed technical picture.' : 'Weak technical picture.');
  } else {
    const sec = sectorName(sector, 'en');
    const pe = fk(p, 'pe');
    if (pe?.value === 'הפסדית') s.push('The company is currently unprofitable, so P/E is not meaningful.');
    else if ((pe?.points ?? 0) >= 20) s.push(`Attractive valuation vs. the ${sec} sector: P/E ${factorValue(pe!, 'en')}.`);
    else if ((pe?.points ?? 0) <= 7) s.push(`Rich valuation vs. the ${sec} sector: P/E ${factorValue(pe!, 'en')}.`);
    else s.push(`Valuation in line with the ${sec} sector.`);
    if ((fk(p, 'rev')?.points ?? 0) >= 11) s.push(`Revenue is growing ${fk(p, 'rev')!.value}, above the sector.`);
    else if (fk(p, 'rev')?.points === 0) s.push('Revenue is shrinking.');
    if ((fk(p, 'de')?.points ?? 10) <= 3) s.push('Leverage is relatively high.');
    if ((fk(p, 'fcf')?.points ?? 0) >= 7) s.push('Healthy free cash flow.');
    s.push(raw >= 65 ? 'Strong fundamental profile.' : raw >= 40 ? 'Reasonable fundamental profile.' : 'Weak fundamental profile.');
  }
  return s.join(' ');
}

export function sentimentSummary(r: SentimentResult, lang: Lang) {
  if (lang === 'he') return r.summary;
  if (!r.articles.length) return 'No meaningful coverage from the main news sources in the past week — neutral score.';
  if (r.negative === 0 && r.positive > 0) return `Coverage this week is entirely positive (${r.positive} positive, no negative articles).`;
  if (r.negative >= r.positive) return `Significant negative news (${r.negative} negative vs. ${r.positive} positive) — this third scores low.`;
  return `Coverage is mostly positive (${r.positive} positive, ${r.negative} negative, ${r.neutral} neutral).`;
}
