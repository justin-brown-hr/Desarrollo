import { useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type ViewProps,
} from 'react-native';
import Svg, { Path, SvgXml } from 'react-native-svg';
import { colors } from '@/theme';
import { Button } from './ui';

const STROKE = '#14286e';
const PREFIX = 'data:image/svg+xml;utf8,';

/** Signature is stored as an SVG data URI: tiny, sharp in the PDF, no extra native module. */
function toDataUri(paths: string[], w: number, h: number) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Math.round(w)} ${Math.round(h)}">` +
    paths
      .map(
        (d) =>
          `<path d="${d}" fill="none" stroke="${STROKE}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`,
      )
      .join('') +
    '</svg>';
  return PREFIX + encodeURIComponent(svg);
}

interface Props {
  label: string;
  value: string | undefined;
  onChange: (dataUri: string) => void;
  /** Lets the parent disable scrolling while the user signs. */
  onDrawingChange?: (drawing: boolean) => void;
  disabled?: boolean;
}

export function SignaturePad({ label, value, onChange, onDrawingChange, disabled }: Props) {
  const [paths, setPaths] = useState<string[]>([]);
  const [current, setCurrent] = useState('');
  const size = useRef({ w: 1, h: 1 });
  const currentRef = useRef('');

  const handlers: ViewProps = {
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    onResponderTerminationRequest: () => false,
    onResponderGrant: (e: GestureResponderEvent) => {
      onDrawingChange?.(true);
      const { locationX: x, locationY: y } = e.nativeEvent;
      currentRef.current = `M${x.toFixed(1)} ${y.toFixed(1)}`;
      setCurrent(currentRef.current);
    },
    onResponderMove: (e: GestureResponderEvent) => {
      const { locationX: x, locationY: y } = e.nativeEvent;
      currentRef.current += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
      setCurrent(currentRef.current);
    },
    onResponderRelease: () => {
      onDrawingChange?.(false);
      // A tap without movement still leaves a visible dot.
      const d = currentRef.current.includes('L') ? currentRef.current : currentRef.current + ' l0.1 0';
      const next = [...paths, d];
      currentRef.current = '';
      setPaths(next);
      setCurrent('');
      onChange(toDataUri(next, size.current.w, size.current.h));
    },
  };

  const clear = () => {
    setPaths([]);
    onChange('');
  };

  const onLayout = (e: LayoutChangeEvent) => {
    size.current = { w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height };
  };

  // A signature saved earlier (e.g. app reopened) is shown read-only until cleared.
  const saved = value && !paths.length ? decodeURIComponent(value.slice(PREFIX.length)) : null;

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.label}>{label}</Text>
        {!disabled && <Button small variant="secondary" title="Borrar" onPress={clear} />}
      </View>
      <View style={styles.pad} onLayout={onLayout} {...(saved || disabled ? {} : handlers)}>
        {saved ? (
          <SvgXml xml={saved} width="100%" height="100%" />
        ) : (
          <Svg width="100%" height="100%" pointerEvents="none">
            {paths.map((d, i) => (
              <Path
                key={i}
                d={d}
                stroke={STROKE}
                strokeWidth={2.5}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {current ? <Path d={current} stroke={STROKE} strokeWidth={2.5} fill="none" strokeLinecap="round" /> : null}
          </Svg>
        )}
        {!saved && !paths.length && !current ? (
          <Text style={styles.hint} pointerEvents="none">
            Firme aquí
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, flexBasis: 300, gap: 6 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 12, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  pad: {
    height: 180,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  hint: { position: 'absolute', alignSelf: 'center', top: 80, color: '#b0b0b0', fontSize: 16 },
});
