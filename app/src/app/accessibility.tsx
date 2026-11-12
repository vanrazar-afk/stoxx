import { ScrollView } from 'react-native';
import Constants from 'expo-constants';
import { colors, space } from '@/lib/theme';
import { useT } from '@/lib/i18n';
import { T, Card } from '@/components/ui';

const extra = (Constants.expoConfig?.extra ?? {}) as { supportEmail?: string };

/** Accessibility statement — Israeli Equal Rights for Persons with Disabilities regs, IS 5568 (WCAG 2.0 AA). */
const UPDATED = '13.11.2026';

export default function Accessibility() {
  const t = useT();
  const he = t.lang === 'he';
  const L = (h: string, e: string) => (he ? h : e);
  const contact = extra.supportEmail || L('[יש להשלים כתובת מייל לפניות נגישות]', '[add an accessibility contact email]');

  const sections: { h: string; b: string[] }[] = [
    {
      h: L('כללי', 'General'),
      b: [
        L(
          'אנו רואים חשיבות בהנגשת StoXX לכלל המשתמשים, כולל אנשים עם מוגבלות. האפליקציה נבנתה בשאיפה לעמוד בתקן הישראלי ת"י 5568 (המבוסס על WCAG 2.0) ברמה AA.',
          'We want StoXX to be usable by everyone, including people with disabilities. The app aims to meet Israeli Standard IS 5568 (based on WCAG 2.0) at level AA.'
        ),
      ],
    },
    {
      h: L('התאמות שבוצעו', 'What we have done'),
      b: [
        L('תמיכה בקוראי מסך (TalkBack, VoiceOver) — תוויות לכפתורים, כותרות ותיאור מילולי לגרפים.', 'Screen-reader support (TalkBack, VoiceOver) — labelled buttons, headings and text summaries of charts.'),
        L('ניגודיות צבעים של 4.5:1 לפחות לטקסט רגיל.', 'Colour contrast of at least 4.5:1 for normal text.'),
        L('אזורי לחיצה בגודל 44 נקודות לפחות; סרגל הניווט התחתון מותאם לאזור הבטוח של המכשיר.', 'Touch targets of at least 44 points; the bottom navigation respects the device safe area.'),
        L('מידע אינו מועבר בצבע בלבד — עליות וירידות מסומנות גם בחץ ▲ / ▼.', 'Information is not conveyed by colour alone — gains and losses also show a ▲ / ▼ arrow.'),
        L('תמיכה בהגדלת טקסט של מערכת ההפעלה, בעברית (מימין לשמאל) ובאנגלית.', 'Respects the system text-size setting; Hebrew (right-to-left) and English.'),
        L('באתר: הגדרת שפה וכיוון לדף, וניווט מקלדת לכפתורים.', 'On the web: page language and direction are set, and buttons are keyboard-reachable.'),
      ],
    },
    {
      h: L('מגבלות ידועות', 'Known limitations'),
      b: [
        L(
          'הגרף האינטראקטיבי מבוסס גרירה; ערכי המחיר המרכזיים מוצגים גם כטקסט. ייתכן שחלק מהכתבות החיצוניות שאליהן אנו מקשרים אינן נגישות — אין לנו שליטה עליהן.',
          'The interactive chart relies on dragging; the key price values are also shown as text. Some external news articles we link to may not be accessible — they are outside our control.'
        ),
      ],
    },
    {
      h: L('פניות בנושא נגישות', 'Accessibility contact'),
      b: [
        L(
          `נתקלתם בבעיה? נשמח לשמוע ולתקן. כתבו לנו: ${contact}. נא לפרט את המסך, את הבעיה ואת הטכנולוגיה המסייעת שבה השתמשתם.`,
          `Found a problem? We'd like to fix it. Write to: ${contact}. Please describe the screen, the issue and the assistive technology you used.`
        ),
      ],
    },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: space(4), gap: space(4), paddingBottom: space(12), maxWidth: 760, width: '100%', alignSelf: 'center' }}
    >
      <T w="black" size={24} accessibilityRole="header">
        {t('st_a11y')}
      </T>
      {sections.map((s) => (
        <Card key={s.h} style={{ gap: 8 }}>
          <T w="bold" accessibilityRole="header">
            {s.h}
          </T>
          {s.b.map((line, i) => (
            <T key={i} size={14} color={colors.textDim}>
              {s.b.length > 1 ? '• ' : ''}
              {line}
            </T>
          ))}
        </Card>
      ))}
      <T size={12} color={colors.textMute}>
        {L(`ההצהרה עודכנה בתאריך ${UPDATED}`, `Statement last updated ${UPDATED}`)}
      </T>
    </ScrollView>
  );
}
