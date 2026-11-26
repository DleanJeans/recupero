import { Ionicons } from '@expo/vector-icons';
import { type RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppUsage } from '../../../modules/app-usage';
import { AppIcon } from '../../components/app-icon';
import { BehaviorIcon } from '../../components/behavior-icon';
import { Button } from '../../components/button';
import { CueSectionLabel } from '../../components/cues/cue-section-label';
import { CalorieBalanceCard } from '../../components/needs/calorie-balance-card';
import { FitbitConnectRow } from '../../components/needs/fitbit-connect-row';
import { NeedAmountDialog } from '../../components/needs/need-amount-dialog';
import { NeedAppSourceModal } from '../../components/needs/need-app-source-modal';
import { NEED_TONE_COLORS } from '../../components/needs/need-bar-row';
import { NeedHistorySection } from '../../components/needs/need-history-section';
import { NeedRateLearning } from '../../components/needs/need-rate-learning';
import { NeedWhenChip } from '../../components/needs/need-when-chip';
import { PeopleStrip } from '../../components/needs/people-strip';
import { ScreenFrame } from '../../components/screen-frame';
import { Text, TextInput } from '../../components/text';
import { useNeedLevels } from '../../hooks/use-need-levels';
import { useBehaviorStore } from '../../store/behavior-store';
import { useNeedsStore } from '../../store/needs-store';
import { useSettingsStore } from '../../store/settings-store';
import type { BehaviorEntry } from '../../types/behavior';
import type { RootStackParamList } from '../../types/navigation';
import type { NeedId, NeedRefill } from '../../types/need';
import { getActiveBehaviors } from '../../utils/archive-utils';
import { kcalToPercent } from '../../utils/calorie-balance-utils';
import { Colors } from '../../utils/colors';
import { toDateString } from '../../utils/date-utils';
import {
  findMetadataField,
  formatEmptyHours,
  formatRefill,
  formatUpdateWhen,
  getDecayPerHour,
  getDefaultRefill,
  getNeedLevelTone,
  getNeedRefillHistory,
  getNextRefill,
  getRefillBehaviorIds,
  getSharedUnit,
  getSourceFieldKeys,
  getSuggestedRefillIds,
  NEED_INFO,
  NEED_UPDATE_AMOUNTS,
  NEED_UPDATE_KCAL_AMOUNTS,
  NEED_UPDATE_QUESTIONS,
  type NeedRefillEntry,
} from '../../utils/need-utils';
import {
  formatCompactDate,
  formatElapsedNumeric,
  formatSessionLength,
  formatTime,
  formatTimeRange,
} from '../../utils/time-utils';

const MAX_SEARCH_RESULTS = 6;

/** Screen for one need: what refills it, a one-tap check-in, and how fast it empties. */
export function NeedScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { needId } = useRoute<RouteProp<RootStackParamList, 'Need'>>().params;
  const { needs, now } = useNeedLevels();
  const behaviors = useBehaviorStore(state => state.behaviors);
  const categories = useBehaviorStore(state => state.categories);
  const hidePrivate = useSettingsStore(state => state.hidePrivate);
  const dayCutoffHour = useSettingsStore(state => state.dayCutoffHour);
  const checkIn = useNeedsStore(state => state.checkIn);
  const checkIns = useNeedsStore(state => state.checkIns);
  const updateLevel = useNeedsStore(state => state.updateLevel);
  const removeCheckIn = useNeedsStore(state => state.removeCheckIn);
  const setLogAmount = useNeedsStore(state => state.setLogAmount);
  const setRefill = useNeedsStore(state => state.setRefill);
  const setCategoryRefill = useNeedsStore(state => state.setCategoryRefill);
  const [adding, setAdding] = useState(false);
  const [appSourceOpen, setAppSourceOpen] = useState(false);
  const [rateEdit, setRateEdit] = useState<{ behaviorId?: string; categoryId?: string; minutes: number }>();
  const [customDialog, setCustomDialog] = useState<'checkIn' | 'update'>();
  const [amountLog, setAmountLog] = useState<NeedRefillEntry>();
  /** When unlogged top-ups happened; undefined = now. Back to now each time the sheet opens. */
  const [updateAt, setUpdateAt] = useState<number>();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const searchY = useRef(0);
  const [filter, setFilter] = useState('');

  /** Keeps the search box above the keyboard: waits for the list to resize, then scrolls it to the top. */
  const scrollToSearch = () => {
    setTimeout(() => scrollRef.current?.scrollTo({ y: Math.max(0, searchY.current - 8), animated: true }), 300);
  };

  const need = needs.find(item => item.id === needId);
  const behaviorById = useMemo(() => new Map(behaviors.map(behavior => [behavior.id, behavior])), [behaviors]);
  const refillIds = useMemo(
    () => (need ? getRefillBehaviorIds(need.config, behaviors, need.source, now) : []),
    [behaviors, need, now],
  );
  const history = useMemo(() => {
    if (!need) return undefined;
    const today = toDateString(new Date(now), dayCutoffHour);
    return getNeedRefillHistory(
      need.config,
      behaviors,
      need.source,
      ts => toDateString(new Date(ts), dayCutoffHour) === today,
      checkIns.filter(entry => entry.needId === need.id),
      need.id === 'hunger' && need.source ? 'kcal' : undefined,
    );
  }, [behaviors, checkIns, dayCutoffHour, need, now]);
  const suggestedIds = useMemo(
    () => (need ? getSuggestedRefillIds(need.id, need.config, behaviors).filter(id => !refillIds.includes(id)) : []),
    [behaviors, need, refillIds],
  );
  const categoryResults = useMemo(() => {
    if (!need) return [];
    const q = query.trim().toLowerCase();
    return categories.filter(
      category => need.config.categoryRefills?.[category.id] == null && category.name.toLowerCase().includes(q),
    );
  }, [categories, need, query]);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!need || !q) return [];
    return getActiveBehaviors(behaviors)
      .filter(
        behavior =>
          (!hidePrivate || !behavior.private) &&
          need.config.refills[behavior.id] == null &&
          behavior.name.toLowerCase().includes(q),
      )
      .slice(0, MAX_SEARCH_RESULTS);
  }, [behaviors, hidePrivate, need, query]);

  const close = () => navigation.goBack();

  if (!need) return null;

  const info = NEED_INFO[need.id];
  /** Hunger with a kcal source: top-ups are typed in kcal (100% = the source's full amount). */
  const kcalFull = need.id === 'hunger' && need.source ? need.source.fullAmount : undefined;
  const sourceFields = need.source
    ? getSourceFieldKeys(need.source).flatMap(key => findMetadataField(categories, key) ?? [])
    : [];
  const sourceLabel = sourceFields.map(field => field.label.toLowerCase()).join(' + ') || 'metadata';
  const color =
    need.level == null ? Colors.text.faint : NEED_TONE_COLORS[getNeedLevelTone(need.level, need.config.cravingLine)];
  const emptyIn =
    need.level == null
      ? ''
      : need.level <= 0
        ? 'Empty now · '
        : `Empty in ~${formatEmptyHours(need.level / getDecayPerHour(need.config))} · `;

  const logBehavior = (behaviorId: string) => {
    navigation.navigate('BehaviorLog', { behaviorId, initialMode: 'log' });
  };

  const editLog = (behaviorId: string, logId: string) => {
    navigation.navigate('BehaviorLog', { behaviorId, initialMode: 'log', logId });
  };

  const addRefill = (behaviorId: string) => {
    setRefill(need.id, behaviorId, getDefaultRefill(need.id));
    setAdding(false);
    setQuery('');
  };

  const addCategoryRefill = (categoryId: string) => {
    setCategoryRefill(need.id, categoryId, getDefaultRefill(need.id));
    setAdding(false);
    setQuery('');
  };

  const filterText = filter.trim().toLowerCase();
  const matchesFilter = (name: string) => !filterText || name.toLowerCase().includes(filterText);
  const selectedCategories = categories.filter(
    category => need.config.categoryRefills?.[category.id] != null && matchesFilter(category.name),
  );
  const shownRefillIds = refillIds.filter(id => matchesFilter(behaviorById.get(id)?.name ?? ''));
  const shownSuggestedIds = suggestedIds.filter(id => matchesFilter(behaviorById.get(id)?.name ?? ''));
  const totalRefillRows =
    refillIds.length +
    suggestedIds.length +
    categories.filter(category => need.config.categoryRefills?.[category.id] != null).length;

  const refillDetail = (behavior: BehaviorEntry) => {
    if (need.config.refills[behavior.id]) return undefined;
    const viaCategory = behavior.categoryId ? need.config.categoryRefills?.[behavior.categoryId] : undefined;
    if (sourceFields.length > 0) return `By ${sourceLabel}`;
    if (viaCategory) {
      const category = categories.find(item => item.id === behavior.categoryId);
      return `Via ${category?.name ?? 'category'}`;
    }
    return undefined;
  };

  return (
    <ScreenFrame
      onClose={close}
      rightContent={
        <Button
          variant="icon"
          onPress={() => {
            navigation.navigate('NeedsSettings', { needId: need.id });
          }}
          accessibilityLabel="Needs settings"
        >
          <Ionicons
            name="settings-outline"
            size={22}
            color={Colors.text.secondary}
          />
        </Button>
      }
      headerContent={
        <>
          <Text style={styles.headerEmoji}>{info.emoji}</Text>
          <Text
            style={styles.title}
            numberOfLines={1}
          >
            {info.label}
            <Text style={{ color }}>{need.level == null ? '' : ` · ${Math.round(need.level)}%`}</Text>
          </Text>
        </>
      }
    >
      <KeyboardAvoidingView
        behavior="height"
        style={styles.sheet}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[styles.content, { paddingBottom: styles.content.paddingBottom + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.subtitle}>
            {emptyIn}
            {`Full to empty in ~${formatEmptyHours(need.config.emptyHours)}`}
            {need.config.learnedFrom > 0
              ? ` · learned from ${need.config.learnedFrom} check-in${need.config.learnedFrom === 1 ? '' : 's'}`
              : ' · default'}
          </Text>

          {need.id === 'hunger' && need.source ? (
            <CalorieBalanceCard
              source={need.source}
              now={now}
            />
          ) : null}

          <NeedHistorySection
            needId={need.id}
            onEditLog={editLog}
          />

          {need.id === 'social' ? (
            <>
              <CueSectionLabel>People · last contact</CueSectionLabel>
              <PeopleStrip now={now} />
            </>
          ) : null}

          <CueSectionLabel>{info.question}</CueSectionLabel>
          <View style={styles.checkIns}>
            {info.checkIns.map(choice => (
              <Pressable
                key={choice.label}
                style={({ pressed }) => [styles.checkIn, pressed && styles.pressed]}
                onPress={() => {
                  checkIn(need.id, choice.level, 'tap');
                  close();
                }}
                accessibilityRole="button"
              >
                <Text
                  style={styles.checkInLabel}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.6}
                >
                  {choice.label}
                </Text>
                <Text style={styles.checkInLevel}>{choice.level}%</Text>
              </Pressable>
            ))}
            <Pressable
              style={({ pressed }) => [styles.checkIn, pressed && styles.pressed]}
              onPress={() => setCustomDialog('checkIn')}
              accessibilityRole="button"
              accessibilityLabel="Enter a custom level"
            >
              <Ionicons
                name="create-outline"
                size={16}
                color={Colors.text.muted}
              />
              <Text style={styles.checkInLabel}>Custom</Text>
            </Pressable>
          </View>

          <View style={styles.updateHeader}>
            <View style={styles.updateTitle}>
              <CueSectionLabel numberOfLines={1}>{NEED_UPDATE_QUESTIONS[need.id]}</CueSectionLabel>
            </View>
            <NeedWhenChip
              value={updateAt}
              onChange={setUpdateAt}
              now={now}
            />
          </View>
          <View style={styles.checkIns}>
            {(kcalFull != null ? NEED_UPDATE_KCAL_AMOUNTS : NEED_UPDATE_AMOUNTS).map(amount => {
              const full = amount >= 100 && kcalFull == null;
              const points = kcalFull != null ? kcalToPercent(amount, kcalFull) : amount;
              const isFull = full || points >= 100;
              return (
                <Pressable
                  key={amount}
                  style={({ pressed }) => [styles.checkIn, pressed && styles.pressed]}
                  onPress={() => updateLevel(need.id, Math.min(100, points), updateAt)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    isFull ? `Fill ${info.label}` : `Add ${amount}${kcalFull != null ? ' kcal' : '%'} to ${info.label}`
                  }
                >
                  <Text
                    style={styles.updateAmount}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                  >
                    {isFull ? 'Full' : `+${amount}`}
                  </Text>
                  <Text
                    style={styles.updateUnit}
                    numberOfLines={1}
                  >
                    {isFull ? '100%' : kcalFull != null ? 'kcal' : '%'}
                  </Text>
                </Pressable>
              );
            })}
            <Pressable
              style={({ pressed }) => [styles.checkIn, pressed && styles.pressed]}
              onPress={() => setCustomDialog('update')}
              accessibilityRole="button"
              accessibilityLabel="Enter a custom amount"
            >
              <Ionicons
                name="create-outline"
                size={18}
                color={Colors.text.muted}
              />
              <Text
                style={styles.updateUnit}
                numberOfLines={1}
              >
                Custom
              </Text>
            </Pressable>
          </View>

          {history && history.entries.length > 0 ? (
            <>
              <CueSectionLabel>{history.today ? 'Logged today' : 'Last logged'}</CueSectionLabel>
              <View style={styles.history}>
                {history.entries.map(entry => {
                  const timed = entry.startTs != null && entry.endTs != null;
                  const clock = timed ? formatTimeRange(entry.startTs ?? entry.ts, entry.endTs) : formatTime(entry.ts);
                  const time = history.today
                    ? clock
                    : `${formatCompactDate(entry.ts)} ${clock} · ${formatElapsedNumeric(entry.ts, now)}`;
                  if (entry.update || entry.checkIn) {
                    return (
                      <View
                        key={entry.logId}
                        style={styles.historyRow}
                      >
                        <Text style={styles.historyEmoji}>{info.emoji}</Text>
                        <Text
                          style={styles.historyName}
                          numberOfLines={1}
                        >
                          {entry.checkIn ? 'You checked in' : 'Updated without a log'}
                        </Text>
                        <Text style={[styles.historyAmount, entry.checkIn && styles.checkInAmount]}>
                          {entry.amountLabel}
                        </Text>
                        <Text style={styles.historyTime}>{time}</Text>
                        <Pressable
                          onPress={() => removeCheckIn(entry.logId)}
                          hitSlop={8}
                          accessibilityRole="button"
                          accessibilityLabel={entry.checkIn ? 'Remove check-in' : 'Undo update'}
                        >
                          <Ionicons
                            name="close"
                            size={16}
                            color={Colors.text.faint}
                          />
                        </Pressable>
                      </View>
                    );
                  }
                  const behavior = entry.behaviorId ? behaviorById.get(entry.behaviorId) : undefined;
                  if (!behavior) return null;
                  return (
                    <Pressable
                      key={entry.logId}
                      style={({ pressed }) => [styles.historyRow, pressed && styles.pressed]}
                      onPress={() => editLog(behavior.id, entry.logId)}
                      accessibilityRole="button"
                      accessibilityLabel={`Edit ${behavior.name} log`}
                    >
                      <BehaviorIcon
                        behavior={behavior}
                        size={20}
                      />
                      <View style={styles.historyNameColumn}>
                        <Text
                          style={styles.historyNameText}
                          numberOfLines={1}
                        >
                          {behavior.name}
                        </Text>
                        {timed ? (
                          <Text
                            style={styles.historyLength}
                            numberOfLines={1}
                          >
                            {formatSessionLength((entry.endTs ?? 0) - (entry.startTs ?? 0))}
                          </Text>
                        ) : null}
                      </View>
                      <Pressable
                        style={({ pressed }) => [styles.amount, pressed && styles.pressed]}
                        onPress={() => setAmountLog(entry)}
                        hitSlop={6}
                        accessibilityRole="button"
                        accessibilityLabel={`Refill ${entry.amountLabel}, tap to change`}
                      >
                        <Text style={styles.amountText}>
                          {entry.amountLabel}
                          {entry.custom ? ' ✎' : ''}
                        </Text>
                      </Pressable>
                      <Text
                        style={styles.historyTime}
                        numberOfLines={1}
                      >
                        {time}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}

          <CueSectionLabel>What helps</CueSectionLabel>
          {sourceFields.length > 0 && need.source ? (
            <Text style={styles.hint}>
              Any log with {sourceFields.map(field => field.label).join(' + ')} counts: {need.source.fullAmount}
              {getSharedUnit(sourceFields) ? ` ${getSharedUnit(sourceFields)}` : ''} = full. Change it in Settings.
            </Text>
          ) : null}
          {totalRefillRows >= 4 ? (
            <View style={styles.search}>
              <Ionicons
                name="search"
                size={16}
                color={Colors.text.faint}
              />
              <TextInput
                style={styles.searchInput}
                value={filter}
                onChangeText={setFilter}
                placeholder="Search behaviours"
                placeholderTextColor={Colors.text.faint}
                autoCorrect={false}
              />
            </View>
          ) : null}
          {selectedCategories.map(category => {
            const refill = need.config.categoryRefills?.[category.id];
            if (!refill) return null;
            return (
              <CategoryRefillRow
                key={category.id}
                emoji={category.emoji}
                name={category.name}
                count={behaviors.filter(b => b.categoryId === category.id && b.archivedAt == null).length}
                amount={need.source?.categoryIds?.includes(category.id) ? `By ${sourceLabel}` : formatRefill(refill)}
                onAmountPress={
                  need.source?.categoryIds?.includes(category.id)
                    ? undefined
                    : () =>
                        refill.mode === 'duration'
                          ? setRateEdit({ categoryId: category.id, minutes: refill.fullMinutes })
                          : setCategoryRefill(need.id, category.id, getNextRefill(refill))
                }
                onRemove={() => setCategoryRefill(need.id, category.id, undefined)}
              />
            );
          })}
          {shownRefillIds.map(id => {
            const behavior = behaviorById.get(id);
            if (!behavior) return null;
            const refill = need.config.refills[id];
            const viaCategory =
              !refill && !need.source && behavior.categoryId
                ? need.config.categoryRefills?.[behavior.categoryId]
                : undefined;
            return (
              <RefillRow
                key={id}
                behavior={behavior}
                detail={refillDetail(behavior)}
                amount={refill ? formatRefill(refill) : viaCategory ? formatRefill(viaCategory) : undefined}
                onAmountPress={
                  refill
                    ? () =>
                        refill.mode === 'duration'
                          ? setRateEdit({ behaviorId: id, minutes: refill.fullMinutes })
                          : setRefill(need.id, id, getNextRefill(refill))
                    : viaCategory
                      ? () =>
                          setRateEdit({
                            behaviorId: id,
                            minutes: viaCategory.mode === 'duration' ? viaCategory.fullMinutes : 100,
                          })
                      : undefined
                }
                onRemove={refill ? () => setRefill(need.id, id, undefined) : undefined}
                onPress={() => logBehavior(id)}
                onNamePress={() => navigation.navigate('BehaviorLog', { behaviorId: id, initialMode: 'details' })}
              />
            );
          })}
          {shownSuggestedIds.map(id => {
            const behavior = behaviorById.get(id);
            if (!behavior) return null;
            return (
              <RefillRow
                key={id}
                behavior={behavior}
                detail="Suggested"
                actionLabel="Add"
                onPress={() => addRefill(id)}
              />
            );
          })}
          {filterText && selectedCategories.length + shownRefillIds.length + shownSuggestedIds.length === 0 ? (
            <Text style={styles.hint}>Nothing matches "{filter.trim()}".</Text>
          ) : null}
          {refillIds.length === 0 && suggestedIds.length === 0 && totalRefillRows === 0 && !adding ? (
            <Text style={styles.hint}>
              Nothing is set to help {info.label} yet. Add a category or the behaviours that do.
            </Text>
          ) : null}

          {adding ? (
            <>
              <View
                style={styles.search}
                onLayout={event => {
                  searchY.current = event.nativeEvent.layout.y;
                }}
              >
                <Ionicons
                  name="search"
                  size={16}
                  color={Colors.text.faint}
                />
                <TextInput
                  style={styles.searchInput}
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Find a category or behaviour"
                  placeholderTextColor={Colors.text.faint}
                  autoCorrect={false}
                  autoFocus
                  onFocus={scrollToSearch}
                />
              </View>
              {categoryResults.map(category => (
                <CategoryRefillRow
                  key={category.id}
                  emoji={category.emoji}
                  name={category.name}
                  count={behaviors.filter(b => b.categoryId === category.id && b.archivedAt == null).length}
                  onPress={() => addCategoryRefill(category.id)}
                />
              ))}
              {results.map(behavior => (
                <RefillRow
                  key={behavior.id}
                  behavior={behavior}
                  actionLabel="Add"
                  onPress={() => addRefill(behavior.id)}
                />
              ))}
            </>
          ) : (
            <Pressable
              style={({ pressed }) => [styles.addRow, pressed && styles.pressed]}
              onPress={() => setAdding(true)}
              accessibilityRole="button"
            >
              <Ionicons
                name="add"
                size={16}
                color={Colors.text.muted}
              />
              <Text style={styles.addText}>Add a category or behaviour that helps {info.label}</Text>
            </Pressable>
          )}

          {AppUsage ? (
            <Pressable
              style={({ pressed }) => [styles.addRow, pressed && styles.pressed]}
              onPress={() => setAppSourceOpen(true)}
              accessibilityRole="button"
            >
              <Ionicons
                name="phone-portrait-outline"
                size={16}
                color={Colors.text.muted}
              />
              <Text style={styles.addText}>Fill {info.label} from an app or website</Text>
            </Pressable>
          ) : null}

          <NeedRateLearning needId={need.id} />
          {need.id === 'energy' && <FitbitConnectRow />}
        </ScrollView>
      </KeyboardAvoidingView>
      {rateEdit ? (
        <NeedAmountDialog
          title={`Minutes to fill ${info.label}`}
          hint={`How many minutes of ${
            rateEdit.behaviorId ? (behaviorById.get(rateEdit.behaviorId)?.name ?? 'this') : 'this category'
          } fill ${info.label} from 0 to 100%.`}
          min={1}
          max={1440}
          suffix="min"
          linkedRate
          initial={rateEdit.minutes}
          resetLabel="1 log = Full"
          onReset={() => {
            const refill: NeedRefill = { mode: 'set' };
            if (rateEdit.behaviorId) setRefill(need.id, rateEdit.behaviorId, refill);
            else if (rateEdit.categoryId) setCategoryRefill(need.id, rateEdit.categoryId, refill);
            setRateEdit(undefined);
          }}
          onSubmit={value => {
            const refill: NeedRefill = { mode: 'duration', fullMinutes: value };
            if (rateEdit.behaviorId) setRefill(need.id, rateEdit.behaviorId, refill);
            else if (rateEdit.categoryId) setCategoryRefill(need.id, rateEdit.categoryId, refill);
            setRateEdit(undefined);
          }}
          onClose={() => setRateEdit(undefined)}
        />
      ) : null}
      {appSourceOpen ? (
        <NeedAppSourceModal
          needId={need.id}
          needLabel={info.label}
          onClose={() => setAppSourceOpen(false)}
        />
      ) : null}
      {amountLog ? (
        <NeedAmountDialog
          title={`How much did ${behaviorById.get(amountLog.behaviorId ?? '')?.name ?? 'this log'} refill?`}
          hint={`It shows ${amountLog.amountLabel}. Type what it really did for ${info.label}, in points, 100 fills it.`}
          min={0}
          max={100}
          initial={
            Number.parseFloat(amountLog.amountLabel.replace(/[^0-9.]/g, '')) ||
            (amountLog.amountLabel === 'Full' ? 100 : 0)
          }
          onReset={
            amountLog.custom
              ? () => (setLogAmount(need.id, amountLog.logId, undefined), setAmountLog(undefined))
              : undefined
          }
          resetLabel="Use usual"
          onSubmit={value => {
            setLogAmount(need.id, amountLog.logId, value);
            setAmountLog(undefined);
          }}
          onClose={() => setAmountLog(undefined)}
        />
      ) : null}
      {customDialog === 'checkIn' ? (
        <NeedAmountDialog
          title={info.question}
          hint={`Type how full ${info.label} is right now, 0-100.`}
          min={0}
          max={100}
          initial={need.level ?? undefined}
          onSubmit={value => {
            checkIn(need.id, value, 'tap');
            setCustomDialog(undefined);
            close();
          }}
          onClose={() => setCustomDialog(undefined)}
        />
      ) : null}
      {customDialog === 'update' ? (
        <NeedAmountDialog
          title={NEED_UPDATE_QUESTIONS[need.id]}
          hint={
            (kcalFull != null
              ? `Type how many kcal you ate. ${kcalFull} kcal fills ${info.label}.`
              : `Type how many points to add to ${info.label}. 100 fills it.`) +
            (updateAt != null ? ` Counts at ${formatUpdateWhen(updateAt, now, ts => formatTime(ts))}.` : '')
          }
          min={1}
          max={kcalFull != null ? 5000 : 100}
          suffix={kcalFull != null ? 'kcal' : '%'}
          onSubmit={value => {
            updateLevel(need.id, kcalFull != null ? kcalToPercent(value, kcalFull) : value, updateAt);
            setCustomDialog(undefined);
          }}
          onClose={() => setCustomDialog(undefined)}
        />
      ) : null}
    </ScreenFrame>
  );
}

interface CategoryRefillRowProps {
  emoji: string;
  name: string;
  count: number;
  /** Set for a category that already refills the need; unset in search results (tap to add). */
  amount?: string;
  onPress?: () => void;
  onAmountPress?: () => void;
  onRemove?: () => void;
}

function CategoryRefillRow({ emoji, name, count, amount, onPress, onAmountPress, onRemove }: CategoryRefillRowProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, onPress && pressed && styles.pressed]}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      <AppIcon
        value={emoji}
        style={styles.categoryEmoji}
      />
      <View style={styles.rowText}>
        <Text
          style={styles.rowName}
          numberOfLines={1}
        >
          {name}
        </Text>
        <Text style={styles.rowDetail}>
          Whole category · {count} behaviour{count === 1 ? '' : 's'}
        </Text>
      </View>
      {amount ? (
        <Pressable
          style={({ pressed }) => [styles.amount, pressed && styles.pressed]}
          onPress={onAmountPress}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={`Refill amount ${amount}, tap to change`}
        >
          <Text
            style={styles.amountText}
            numberOfLines={1}
          >
            {amount}
          </Text>
        </Pressable>
      ) : (
        <Text style={styles.rowAction}>Add ›</Text>
      )}
      {onRemove ? (
        <Pressable
          onPress={onRemove}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Stop ${name} refilling this need`}
        >
          <Ionicons
            name="close"
            size={16}
            color={Colors.text.faint}
          />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

interface RefillRowProps {
  behavior: BehaviorEntry;
  detail?: string;
  amount?: string;
  actionLabel?: string;
  onPress: () => void;
  /** Tapping the icon and name; defaults to `onPress`. */
  onNamePress?: () => void;
  onAmountPress?: () => void;
  onRemove?: () => void;
}

function RefillRow({
  behavior,
  detail,
  amount,
  actionLabel = 'Log',
  onPress,
  onNamePress,
  onAmountPress,
  onRemove,
}: RefillRowProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <Pressable
        style={styles.rowLeft}
        onPress={onNamePress ?? onPress}
        accessibilityRole="button"
      >
        <BehaviorIcon
          behavior={behavior}
          size={24}
        />
        <View style={styles.rowText}>
          <Text
            style={styles.rowName}
            numberOfLines={1}
          >
            {behavior.name}
          </Text>
          {detail ? <Text style={styles.rowDetail}>{detail}</Text> : null}
        </View>
      </Pressable>
      {amount ? (
        <Pressable
          style={({ pressed }) => [styles.amount, pressed && styles.pressed]}
          onPress={onAmountPress}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={`Refill amount ${amount}, tap to change`}
        >
          <Text
            style={styles.amountText}
            numberOfLines={1}
          >
            {amount}
          </Text>
        </Pressable>
      ) : null}
      <Text style={styles.rowAction}>{actionLabel} ›</Text>
      {onRemove ? (
        <Pressable
          onPress={onRemove}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Stop ${behavior.name} refilling this need`}
        >
          <Ionicons
            name="close"
            size={16}
            color={Colors.text.faint}
          />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
  },
  content: {
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  headerEmoji: {
    fontSize: 26,
  },
  title: {
    color: Colors.text.primary,
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    color: Colors.text.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  checkIns: {
    flexDirection: 'row',
    gap: 6,
  },
  checkIn: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    backgroundColor: Colors.bg.input,
    borderRadius: 10,
    paddingVertical: 8,
  },
  checkInLabel: {
    alignSelf: 'stretch',
    textAlign: 'center',
    paddingHorizontal: 4,
    color: Colors.text.secondary,
    fontSize: 11,
    fontWeight: '600',
  },
  checkInLevel: {
    color: Colors.text.faint,
    fontSize: 10,
  },
  updateHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  updateTitle: {
    flex: 1,
    minWidth: 0,
  },
  updateAmount: {
    alignSelf: 'stretch',
    textAlign: 'center',
    paddingHorizontal: 4,
    color: Colors.type.desirable,
    fontSize: 16,
    fontWeight: '700',
  },
  updateUnit: {
    color: Colors.text.muted,
    fontSize: 10.5,
  },
  hint: {
    color: Colors.text.faint,
    fontSize: 12,
    lineHeight: 17,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.bg.input,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  categoryEmoji: {
    fontSize: 20,
    width: 24,
    textAlign: 'center',
  },
  rowLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowText: {
    flex: 1,
    gap: 1,
  },
  rowName: {
    color: Colors.text.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  rowDetail: {
    color: Colors.text.faint,
    fontSize: 11,
  },
  amount: {
    backgroundColor: Colors.bg.elevated,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  amountText: {
    color: Colors.type.desirable,
    fontSize: 11,
    fontWeight: '700',
  },
  rowAction: {
    color: Colors.text.light,
    fontSize: 12,
    fontWeight: '700',
  },
  history: {
    backgroundColor: Colors.bg.input,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  historyEmoji: {
    width: 20,
    fontSize: 15,
    textAlign: 'center',
  },
  historyName: {
    flex: 1,
    color: Colors.text.secondary,
    fontSize: 13,
  },
  historyNameColumn: {
    flex: 1,
    minWidth: 0,
  },
  historyNameText: {
    color: Colors.text.secondary,
    fontSize: 13,
  },
  historyLength: {
    color: Colors.text.faint,
    fontSize: 11,
  },
  historyAmount: {
    color: Colors.type.desirable,
    fontSize: 12,
    fontWeight: '700',
  },
  checkInAmount: {
    color: '#60a5fa',
  },
  historyTime: {
    color: Colors.text.faint,
    fontSize: 12,
    flexShrink: 0,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.bg.input,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    color: Colors.text.primary,
    fontSize: 14,
    paddingVertical: 10,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderStyle: 'dashed',
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  addText: {
    color: Colors.text.muted,
    fontSize: 13,
  },
  pressed: {
    opacity: 0.7,
  },
});
