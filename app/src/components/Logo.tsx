import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { colors, fonts } from '@/lib/theme';
import { T } from './ui';

/** VOLTIX mark: a three-colour ring (technical · fundamental · sentiment) with "VX" inside. */
export function Logo({ size = 40, withName = false }: { size?: number; withName?: boolean }) {
  const stroke = Math.max(3, size * 0.09);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const seg = c / 3;
  const ring = [colors.tech, colors.fund, colors.sent];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.28 }} accessible accessibilityRole="image" accessibilityLabel="VOLTIX">
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <LinearGradient id="vx" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.tech} />
            <Stop offset="1" stopColor={colors.fund} />
          </LinearGradient>
        </Defs>
        {ring.map((col, i) => (
          <Circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={col}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={`${seg - stroke * 0.6} ${c}`}
            strokeDashoffset={-seg * i}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ))}
        <SvgText
          x={size / 2}
          y={size / 2 + size * 0.135}
          fontSize={size * 0.38}
          fontFamily={fonts.black}
          fontWeight="900"
          fill="url(#vx)"
          textAnchor="middle"
          letterSpacing={-size * 0.01}
        >
          VX
        </SvgText>
      </Svg>
      {withName && (
        <T w="black" size={size * 0.62} color={colors.text} style={{ letterSpacing: size * 0.04, writingDirection: 'ltr' }}>
          VOLTIX
        </T>
      )}
    </View>
  );
}
