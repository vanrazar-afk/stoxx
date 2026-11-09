import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Line, Path, Stop, Text as SvgText } from 'react-native-svg';
import { colors, fonts, scoreColor } from '@/lib/theme';
import { T, N } from './ui';

/** Circular 1–100 score gauge with the 3 pillars as coloured arcs */
export function ScoreRing({ score, size = 56, pillars }: { score: number; size?: number; pillars?: [number, number, number] }) {
  const stroke = Math.max(4, size * 0.09);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const segs = pillars ?? [score, 0, 0];
  const pcolors = [colors.tech, colors.fund, colors.sent];
  let offset = 0;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel={`${score}/100`}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.border} strokeWidth={stroke} fill="none" />
        {segs.map((v, i) => {
          const len = (v / 100) * c;
          const el = (
            <Circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke={pillars ? pcolors[i] : scoreColor(score)}
              strokeWidth={stroke}
              strokeDasharray={`${Math.max(0, len - (pillars ? 1.5 : 0))} ${c}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              fill="none"
            />
          );
          offset += len;
          return el;
        })}
      </Svg>
      <N w="black" size={size * 0.34} color={scoreColor(score)} style={{ lineHeight: size * 0.4 }}>
        {score}
      </N>
    </View>
  );
}

export function Sparkline({ data, width = 80, height = 32, color }: { data: number[]; width?: number; height?: number; color?: string }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * width, height - ((v - min) / span) * (height - 4) - 2]);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const col = color ?? (data[data.length - 1] >= data[0] ? colors.up : colors.down);
  const id = `g${Math.round(min * 100)}${data.length}`;
  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={col} stopOpacity={0.35} />
          <Stop offset="1" stopColor={col} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d={`${d} L${width},${height} L0,${height} Z`} fill={`url(#${id})`} />
      <Path d={d} stroke={col} strokeWidth={1.8} fill="none" strokeLinejoin="round" />
    </Svg>
  );
}

/** Price chart with entry / target / stop horizontal levels */
export function LevelsChart({ data, entry, target, stop, width, height = 180, labels = ['יעד', 'סטופ'] }: { data: number[]; entry: number; target: number; stop: number; width: number; height?: number; labels?: [string, string] }) {
  const all = [...data, target, stop];
  const min = Math.min(...all) * 0.995;
  const max = Math.max(...all) * 1.005;
  const y = (v: number) => height - ((v - min) / (max - min)) * height;
  const pad = 46;
  const w = width - pad;
  const d = data.map((v, i) => `${i ? 'L' : 'M'}${((i / (data.length - 1)) * w).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const lvl = (v: number, col: string, label: string) => (
    <>
      <Line x1={0} x2={w} y1={y(v)} y2={y(v)} stroke={col} strokeDasharray="5 4" strokeWidth={1.2} />
      <SvgText x={w + 4} y={y(v) + 4} fill={col} fontSize={10} fontFamily={fonts.bold}>
        {label}
      </SvgText>
    </>
  );
  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="lv" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.brand2} stopOpacity={0.3} />
          <Stop offset="1" stopColor={colors.brand2} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d={`${d} L${w},${height} L0,${height} Z`} fill="url(#lv)" />
      <Path d={d} stroke={colors.brand2} strokeWidth={2} fill="none" />
      {lvl(target, colors.up, `${labels[0]} ${target.toFixed(0)}`)}
      {lvl(entry, colors.textDim, `${entry.toFixed(0)}`)}
      {lvl(stop, colors.down, `${labels[1]} ${stop.toFixed(0)}`)}
    </Svg>
  );
}

export function PillarBar({ label, value, color }: { label: string; value: number; color: string }) {
  const pctv = Math.min(100, (value / (100 / 3)) * 100);
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <T size={13} color={colors.textDim}>
          {label}
        </T>
        <N size={13} w="bold" color={color}>
          {value.toFixed(1)} / 33.3
        </N>
      </View>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' }}>
        <View style={{ width: `${pctv}%`, height: '100%', backgroundColor: color, borderRadius: 4 }} />
      </View>
    </View>
  );
}
