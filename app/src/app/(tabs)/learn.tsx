import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { colors, space } from '@/lib/theme';
import { T, Row, Card, SectionTitle, Disclaimer } from '@/components/ui';
import { useT } from '@/lib/i18n';

type L = { he: string; en: string };
const L = (he: string, en: string): L => ({ he, en });

const PILLARS = [
  {
    icon: 'trending-up' as const,
    color: colors.tech,
    title: L('שליש 1 · ניתוח טכני (עד 33.3)', 'Third 1 · Technical (up to 33.3)'),
    items: [
      L('מחיר מעל ממוצע נע 200 ימים — מגמה ארוכת טווח (15)', 'Price above the 200-day moving average — long-term trend (15)'),
      L('ממוצע 50 מעל ממוצע 200 — מבנה מגמה עולה (10)', '50-day MA above 200-day MA — uptrend structure (10)'),
      L('התקרבות לממוצע 100 מלמעלה — אזור תמיכה (20)', 'Pulling back toward the 100-day MA from above — support zone (20)'),
      L('רצף נרות אדומים ואחריו יום ירוק — דפוס היפוך (20)', 'A run of red candles followed by a green day — reversal pattern (20)'),
      L('RSI(14) מאוזן או יוצא ממכירת יתר (15)', 'RSI(14) balanced or leaving oversold (15)'),
      L('היסטוגרמת MACD מתהפכת כלפי מעלה (10)', 'MACD histogram turning up (10)'),
      L('מחזור מסחר מעל הממוצע ביום הירוק (10)', 'Above-average volume on the green day (10)'),
    ],
  },
  {
    icon: 'bar-chart-2' as const,
    color: colors.fund,
    title: L('שליש 2 · ניתוח פונדמנטלי (עד 33.3)', 'Third 2 · Fundamental (up to 33.3)'),
    items: [
      L('מכפיל רווח (P/E) ביחס לחציון הענף — לא במנותק (25)', 'P/E relative to the sector median, not in isolation (25)'),
      L('PEG — מכפיל ביחס לקצב הצמיחה (15)', 'PEG — P/E relative to growth (15)'),
      L('צמיחת הכנסות ביחס לענף (15)', 'Revenue growth vs. the sector (15)'),
      L('צמיחה ברווח למניה (10)', 'EPS growth (10)'),
      L('שולי רווח נקי ביחס לענף (10)', 'Net margin vs. the sector (10)'),
      L('יחס חוב להון (10)', 'Debt to equity (10)'),
      L('תשואת תזרים מזומנים חופשי (10)', 'Free-cash-flow yield (10)'),
      L('תשואה על ההון ROE (5)', 'Return on equity (5)'),
    ],
  },
  {
    icon: 'message-circle' as const,
    color: colors.sent,
    title: L('שליש 3 · סנטימנט (עד 33.3)', 'Third 3 · Sentiment (up to 33.3)'),
    items: [
      L('כותרות 7 הימים האחרונים מ-Google News ו-Yahoo Finance: Reuters, Bloomberg, WSJ, Financial Times, CNBC, MarketWatch, Barron\'s, Yahoo Finance, Seeking Alpha, Benzinga, Morningstar ועוד', 'Last-7-day headlines via Google News and Yahoo Finance: Reuters, Bloomberg, WSJ, Financial Times, CNBC, MarketWatch, Barron\'s, Yahoo Finance, Seeking Alpha, Benzinga, Morningstar and more'),
      L('כל כותרת מסווגת חיובית / ניטרלית / שלילית', 'Each headline is classified positive / neutral / negative'),
      L('רק חדשות טובות ← ציון מקסימלי. חדשות רעות דומיננטיות ← ציון מינימלי', 'Only good news → maximum score. Dominant bad news → minimum score'),
      L('חדשות טריות וסוכנויות ידיעות מקבלות משקל גבוה יותר; חדשות רעות משוקללות פי 1.5', 'Fresh news and wire services weigh more; bad news weighs 1.5×'),
    ],
  },
];

const GLOSSARY: [L, L][] = [
  [L('ממוצע נע (SMA)', 'Moving average (SMA)'), L('ממוצע מחירי הסגירה של N הימים האחרונים. ממוצעים 50/100/200 משמשים לזיהוי מגמה ותמיכה.', 'Average closing price of the last N days. 50/100/200-day averages show trend and support.')],
  [L('RSI', 'RSI'), L('מדד עוצמה יחסית בין 0 ל-100. מעל 70 נחשב קניית יתר, מתחת ל-30 מכירת יתר.', 'Relative strength index from 0 to 100. Above 70 is overbought, below 30 oversold.')],
  [L('MACD', 'MACD'), L('הפרש בין ממוצעים נעים אקספוננציאליים, מסמן שינויי מומנטום.', 'Difference between exponential moving averages; flags momentum shifts.')],
  [L('ATR', 'ATR'), L('טווח תנועה יומי ממוצע — משמש לחישוב מרחק הסטופ והיעד.', 'Average daily range — used to size the stop and target distance.')],
  [L('P/E', 'P/E'), L('מחיר המניה חלקי הרווח למניה. משווים אותו לענף שבו החברה פועלת.', 'Share price divided by earnings per share, compared with the company’s sector.')],
  [L('PEG', 'PEG'), L('מכפיל הרווח חלקי קצב צמיחת הרווח. מתחת ל-1 נחשב זול ביחס לצמיחה.', 'P/E divided by earnings growth. Below 1 is considered cheap for its growth.')],
  [L('יחס סיכוי/סיכון', 'Risk/reward'), L('המרחק ליעד חלקי המרחק לסטופ. 1:2 = פוטנציאל כפול מהסיכון.', 'Distance to target divided by distance to stop. 1:2 = twice the potential of the risk.')],
];

const TEXT = {
  title: L('איך מחושב הציון', 'How the score works'),
  intro: L('כל מניה מקבלת ציון 1–100 שמורכב משלושה שלישים שווים. הדירוג מתעדכן כל שעה בזמן המסחר בוול סטריט ופעם נוספת אחרי הסגירה.', 'Every stock gets a 1–100 score made of three equal thirds. The ranking refreshes hourly while Wall Street is open and once more after the close.'),
  levelsT: L('יעד יציאה וסטופ', 'Exit target & stop'),
  levels: L('הסטופ ממוקם 2×ATR מתחת למחיר, או מתחת לממוצע 100 אם הוא קרוב יותר. היעד הוא ההתנגדות הקרובה (שיא 60 יום / 52 שבועות) אם היא נותנת לפחות פי 1.5 מהסיכון, אחרת יעד של פי 2 מהסיכון. אלו רמות טכניות לצורכי מחקר — לא תחזית מחיר.', 'The stop sits 2×ATR below the price, or just under the 100-day MA if that is closer. The target is the nearest resistance (60-day / 52-week high) if it offers at least 1.5× the risk, otherwise 2× the risk. These are technical research levels — not a price forecast.'),
  glossT: L('מילון מונחים', 'Glossary'),
  limitsT: L('מגבלות המודל', 'Model limitations'),
  limits: L('המודל מבוסס על נתוני עבר וכללים קבועים. הוא אינו צופה אירועים בלתי צפויים, עלול לטעות בסיווג כותרות, ואינו מתחשב במצבכם האישי. ציון גבוה אינו מבטיח עלייה במחיר.', 'The model uses historical data and fixed rules. It cannot foresee surprises, may misclassify headlines, and ignores your personal situation. A high score does not guarantee a price rise.'),
};

export default function Learn() {
  const { lang } = useT();
  const [open, setOpen] = useState<number | null>(null);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: space(4), gap: space(4), paddingBottom: space(12) }}>
        <View>
          <T w="black" size={26}>{TEXT.title[lang]}</T>
          <T size={14} color={colors.textDim}>{TEXT.intro[lang]}</T>
        </View>
        {PILLARS.map((p) => (
          <Card key={p.title.en}>
            <SectionTitle title={p.title[lang]} icon={p.icon} color={p.color} />
            {p.items.map((i) => (
              <Row key={i.en} style={{ gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: p.color, marginTop: 8 }} />
                <T size={14} style={{ flex: 1 }}>{i[lang]}</T>
              </Row>
            ))}
          </Card>
        ))}
        <Card>
          <SectionTitle title={TEXT.levelsT[lang]} icon="crosshair" color={colors.brand2} />
          <T size={14} color={colors.textDim}>
            {TEXT.levels[lang]}
          </T>
        </Card>
        <Card>
          <SectionTitle title={TEXT.glossT[lang]} icon="book" />
          {GLOSSARY.map(([k, v], i) => (
            <Pressable key={k.en} onPress={() => setOpen(open === i ? null : i)} style={{ paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <T w="bold">{k[lang]}</T>
                <Feather name={open === i ? 'minus' : 'plus'} size={16} color={colors.textDim} />
              </Row>
              {open === i && <T size={13} color={colors.textDim} style={{ marginTop: 6 }}>{v[lang]}</T>}
            </Pressable>
          ))}
        </Card>
        <Card>
          <SectionTitle title={TEXT.limitsT[lang]} icon="alert-circle" color={colors.warn} />
          <T size={14} color={colors.textDim}>
            {TEXT.limits[lang]}
          </T>
        </Card>
        <Disclaimer />
      </ScrollView>
    </SafeAreaView>
  );
}
