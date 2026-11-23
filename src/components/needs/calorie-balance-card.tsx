import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useBehaviorStore } from '../../store/behavior-store';
import { useNeedsStore } from '../../store/needs-store';
import { useSettingsStore } from '../../store/settings-store';
import type { NeedMetadataSource } from '../../types/need';
import {
  BALANCE_RANGES,
  type BalanceRange,
  formatSignedKcal,
  getBmr,
  getCalorieBalance,
  getDailyBurn,
  getDayElapsedFraction,
  getIntakeByDay,
} from '../../utils/calorie-balance-utils';
import { Colors } from '../../utils/colors';
import { Text } from '../text';
import { EnergyProfileDialog } from './energy-profile-dialog';

interface CalorieBalanceCardProps {
  source: NeedMetadataSource;
  now: number;
}

const DEFICIT_COLOR = Colors.type.desirable;
const SURPLUS_COLOR = '#f2b84b';

function kcalText(value: number): string {
  return Math.round(value).toLocaleString('en-US');
}

/** Calories eaten (kcal metadata of food logs) against the energy you burn, as a deficit or surplus. */
export function CalorieBalanceCard({ source, now }: CalorieBalanceCardProps) {
  const behaviors = useBehaviorStore(state => state.behaviors);
  const dayCutoffHour = useSettingsStore(state => state.dayCutoffHour);
  const profile = useNeedsStore(state => state.energyProfile);
  const setProfile = useNeedsStore(state => state.setEnergyProfile);
  const checkIns = useNeedsStore(state => state.checkIns);
  const [range, setRange] = useState<BalanceRange>(1);
  const [editing, setEditing] = useState(false);

  const balance = useMemo(() => {
    if (!profile) return undefined;
    const updates = checkIns.filter(entry => entry.needId === 'hunger');
    const days = getIntakeByDay(range, now, dayCutoffHour, behaviors, source, updates);
    return getCalorieBalance(days, getDailyBurn(profile), getDayElapsedFraction(now, dayCutoffHour));
  }, [behaviors, checkIns, dayCutoffHour, now, profile, range, source]);

  const burnSource = profile
    ? profile.fixedKcal != null && profile.fixedKcal > 0
      ? 'typed by you'
      : `BMR ${kcalText(getBmr(profile))} x ${profile.activity}`
    : '';
  const net = balance?.netPerDay ?? 0;
  const color = net <= 0 ? DEFICIT_COLOR : SURPLUS_COLOR;
  const barMax = balance ? Math.max(balance.eatenPerDay, balance.burnedPerDay, 1) : 1;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text
          style={styles.title}
          numberOfLines={1}
        >
          Calorie balance
        </Text>
        <View style={styles.ranges}>
          {BALANCE_RANGES.map(item => (
            <Pressable
              key={item}
              style={[styles.range, range === item && styles.rangeOn]}
              onPress={() => setRange(item)}
              accessibilityRole="button"
              accessibilityLabel={`${item} day${item === 1 ? '' : 's'}`}
            >
              <Text
                style={[styles.rangeText, range === item && styles.rangeTextOn]}
                numberOfLines={1}
              >
                {item}d
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {!profile || !balance ? (
        <>
          <Text style={styles.note}>
            Add your age, weight and height to compare the kcal you eat with the kcal you burn.
          </Text>
          <Pressable
            style={styles.setup}
            onPress={() => setEditing(true)}
            accessibilityRole="button"
          >
            <Text style={styles.setupText}>Set up</Text>
          </Pressable>
        </>
      ) : balance.countedDays === 0 ? (
        <Text style={styles.note}>
          No food with kcal logged {range === 1 ? 'today' : `in the last ${range} days`} yet.
        </Text>
      ) : (
        <>
          <View style={styles.netRow}>
            <Text
              style={[styles.net, { color }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              {formatSignedKcal(net)} kcal
            </Text>
            <Text
              style={[styles.verdict, { color }]}
              numberOfLines={1}
            >
              {net <= 0 ? 'deficit' : 'surplus'}
              {range === 1 ? '' : ' / day'}
            </Text>
          </View>

          <BalanceBar
            label="Eaten"
            value={balance.eatenPerDay}
            max={barMax}
            color={Colors.metadataBar[0]}
            suffix={range === 1 ? '' : '/day'}
          />
          <BalanceBar
            label="Burned"
            value={balance.burnedPerDay}
            max={barMax}
            color={Colors.metadataBar[4]}
            suffix={range === 1 ? '' : '/day'}
          />

          {range > 1 ? (
            <Text
              style={styles.total}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {`Total ${formatSignedKcal(balance.netTotal)} kcal over ${balance.countedDays} day${balance.countedDays === 1 ? '' : 's'} · ate ${kcalText(balance.eatenTotal)}`}
            </Text>
          ) : null}
          {balance.skippedDays > 0 ? (
            <Text style={styles.note}>
              {balance.skippedDays} day{balance.skippedDays === 1 ? '' : 's'} with no food logged left out.
            </Text>
          ) : null}
          {balance.todayPartial ? (
            <Text style={styles.note}>
              Today is not over: burn counts only the part of the day that has passed, and food you did not log makes a
              deficit look bigger.
            </Text>
          ) : (
            <Text style={styles.note}>Food you did not log makes a deficit look bigger.</Text>
          )}
          <Pressable
            style={styles.edit}
            onPress={() => setEditing(true)}
            accessibilityRole="button"
            accessibilityLabel="Edit your body details"
          >
            <Text
              style={styles.editText}
              numberOfLines={1}
            >
              {`Burn ${kcalText(getDailyBurn(profile))} kcal/day · ${burnSource} · edit`}
            </Text>
          </Pressable>
        </>
      )}

      {editing ? (
        <EnergyProfileDialog
          initial={profile}
          onSave={next => {
            setProfile(next);
            setEditing(false);
          }}
          onClose={() => setEditing(false)}
        />
      ) : null}
    </View>
  );
}

interface BalanceBarProps {
  label: string;
  value: number;
  max: number;
  color: string;
  suffix: string;
}

function BalanceBar({ label, value, max, color, suffix }: BalanceBarProps) {
  return (
    <View style={styles.barRow}>
      <Text
        style={styles.barLabel}
        numberOfLines={1}
      >
        {label}
      </Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.min(100, (value / max) * 100)}%`, backgroundColor: color }]} />
      </View>
      <Text
        style={styles.barValue}
        numberOfLines={1}
      >
        {`${kcalText(value)}${suffix}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.bg.card, borderRadius: 14, padding: 14, gap: 8, marginTop: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { color: Colors.text.primary, fontSize: 15, fontWeight: '700', flexShrink: 1 },
  ranges: { flexDirection: 'row', gap: 6 },
  range: {
    minWidth: 44,
    height: 30,
    borderRadius: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bg.input,
  },
  rangeOn: { backgroundColor: Colors.bg.elevated },
  rangeText: { color: Colors.text.muted, fontSize: 13, fontWeight: '600' },
  rangeTextOn: { color: Colors.text.primary },
  netRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  net: { fontSize: 28, fontWeight: '800', flexShrink: 1 },
  verdict: { fontSize: 14, fontWeight: '600', flexShrink: 0 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { color: Colors.text.muted, fontSize: 12, width: 50, flexShrink: 0 },
  track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: Colors.bg.input, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  barValue: {
    color: Colors.text.secondary,
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 0,
    minWidth: 80,
    textAlign: 'right',
  },
  total: { color: Colors.text.secondary, fontSize: 13, fontWeight: '600' },
  note: { color: Colors.text.muted, fontSize: 12, lineHeight: 17 },
  setup: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    backgroundColor: Colors.bg.elevated,
  },
  setupText: { color: Colors.text.primary, fontSize: 14, fontWeight: '600' },
  edit: { paddingVertical: 4 },
  editText: { color: Colors.text.light, fontSize: 12, textDecorationLine: 'underline' },
});
