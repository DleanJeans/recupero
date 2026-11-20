import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppUsage, type LaunchableApp } from '../../../modules/app-usage';
import { useAppUsagePermission } from '../../hooks/use-app-usage-permission';
import { AppPickerModal } from '../../screens/behavior-form-screen/components/app-picker-modal';
import { useBehaviorStore } from '../../store/behavior-store';
import { useNeedsStore } from '../../store/needs-store';
import { useSettingsStore } from '../../store/settings-store';
import type { NeedId } from '../../types/need';
import { syncAppUsage } from '../../utils/app-usage-sync';
import {
  fetchSiteName,
  findAutoTrackedBehavior,
  getAutoTrackApp,
  getAutoTrackSite,
  getSiteFallbackName,
  getSiteFaviconUri,
  normalizeSiteDomain,
} from '../../utils/app-usage-utils';
import { Colors } from '../../utils/colors';
import { parseDecimalInput } from '../../utils/metadata-calculation-utils';
import { getDefaultRefill } from '../../utils/need-utils';
import { Button } from '../button';
import { CheckboxRow } from '../checkbox-row';
import { FullScreenModal } from '../full-screen-modal';
import { Text, TextInput } from '../text';
import { FillRateFields } from './fill-rate-fields';

interface NeedAppSourceModalProps {
  needId: NeedId;
  needLabel: string;
  onClose: () => void;
}

/** Picks an app or website whose screen time fills a need. Makes an auto-tracked behavior and points the need at it. */
export function NeedAppSourceModal({ needId, needLabel, onClose }: NeedAppSourceModalProps) {
  const insets = useSafeAreaInsets();
  const { usageAccess, siteTracking, mediaWatch } = useAppUsagePermission();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [app, setApp] = useState<LaunchableApp>();
  const [site, setSite] = useState('');
  const [mediaOnly, setMediaOnly] = useState(false);
  const [siteName, setSiteName] = useState('');
  const [siteNameEdited, setSiteNameEdited] = useState(false);
  const defaultRefill = getDefaultRefill(needId);
  const [minutesText, setMinutesText] = useState(
    defaultRefill.mode === 'duration' ? String(defaultRefill.fullMinutes) : '100',
  );
  const fullMinutes = parseDecimalInput(minutesText);
  const normalizedSite = normalizeSiteDomain(site);
  const invalidSite = site.trim() !== '' && !normalizedSite;

  useEffect(() => {
    if (!normalizedSite || siteNameEdited) return;
    setSiteName(getSiteFallbackName(normalizedSite));
    let cancelled = false;
    const timer = setTimeout(() => {
      fetchSiteName(normalizedSite).then(name => {
        if (!cancelled) setSiteName(name);
      });
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [normalizedSite, siteNameEdited]);

  if (!AppUsage) return null;

  const addTracked = async (kind: 'app' | 'site') => {
    const store = useBehaviorStore.getState();
    const cutoff = useSettingsStore.getState().dayCutoffHour;
    const target = kind === 'app' && app ? { packageName: app.packageName } : { domain: normalizedSite };
    let iconUri: string | null | undefined;
    if (kind === 'app' && app) iconUri = await AppUsage?.getAppIcon?.(app.packageName).catch(() => null);
    if (kind === 'site') iconUri = getSiteFaviconUri(normalizedSite);
    const displayName = kind === 'site' ? siteName.trim() || normalizedSite : '';
    let id = findAutoTrackedBehavior(store.behaviors, target)?.id;
    if (id && kind === 'app') {
      const existing = store.behaviors.find(b => b.id === id)?.autoTrackApp;
      if (existing && Boolean(existing.mediaOnly) !== mediaOnly)
        store.updateBehavior(id, { autoTrackApp: { ...existing, mediaOnly: mediaOnly || undefined } });
    }
    if (id && kind === 'site' && displayName) store.updateBehavior(id, { name: displayName });
    if (!id) {
      const baseApp = kind === 'app' ? getAutoTrackApp(app, undefined, cutoff) : undefined;
      const autoApp = baseApp && mediaOnly ? { ...baseApp, mediaOnly: true } : baseApp;
      const autoSite = kind === 'site' ? getAutoTrackSite(normalizedSite, undefined, cutoff) : undefined;
      store.addBehavior(
        kind === 'app' ? (app?.label ?? '') : displayName,
        'neutral',
        iconUri ? { uri: iconUri } : undefined,
        0,
        'rest',
        undefined,
        undefined,
        false,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        autoApp,
        autoSite,
      );
      const behaviors = useBehaviorStore.getState().behaviors;
      id = behaviors[behaviors.length - 1]?.id;
    }
    if (id)
      useNeedsStore
        .getState()
        .setRefill(
          needId,
          id,
          fullMinutes != null && fullMinutes > 0 ? { mode: 'duration', fullMinutes } : defaultRefill,
        );
    syncAppUsage();
    onClose();
  };

  return (
    <FullScreenModal
      title={`Fill ${needLabel} from usage`}
      onClose={onClose}
    >
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 24 + insets.bottom }]}>
        <Text style={styles.note}>
          Time spent in the app or website fills {needLabel}. Usage is read when you open Recupero, so the bar jumps
          then.
        </Text>
        {!usageAccess && (
          <View style={styles.block}>
            <Text style={styles.note}>Recupero needs usage access to see how long you spend in other apps.</Text>
            <Button
              size="sm"
              onPress={() => AppUsage?.openPermissionSettings()}
            >
              Grant usage access
            </Button>
          </View>
        )}

        <Text style={styles.heading}>How fast it fills</Text>
        <FillRateFields
          minutesText={minutesText}
          onMinutesTextChange={setMinutesText}
        />
        <Text style={styles.note}>
          Minutes of use to fill {needLabel} from 0 to 100%, or the % it fills per minute. Changing one updates the
          other.
        </Text>

        <Text style={styles.heading}>An app</Text>
        <View style={styles.row}>
          <Text
            style={[styles.label, !app && styles.placeholder]}
            numberOfLines={1}
          >
            {app?.label ?? 'No app selected'}
          </Text>
          <Button
            size="sm"
            onPress={() => setPickerOpen(true)}
          >
            {app ? 'Change' : 'Choose app'}
          </Button>
        </View>
        {AppUsage?.getMediaEvents && (
          <View style={styles.block}>
            <CheckboxRow
              label="Only while it's playing"
              hint="Counts music or video playing in the background, not time on screen"
              checked={mediaOnly}
              onToggle={() => setMediaOnly(value => !value)}
            />
            {mediaOnly && !mediaWatch && (
              <>
                <Text style={styles.note}>
                  Turn on Notification access for Recupero. It only sees whether media is playing, never the
                  notification text. If Android says the setting is restricted, open Recupero's App info, tap ⋮, then
                  "Allow restricted settings".
                </Text>
                <Button
                  size="sm"
                  onPress={() => AppUsage?.openNotificationListenerSettings?.()}
                >
                  Open notification access
                </Button>
              </>
            )}
          </View>
        )}
        <Button
          disabled={!app}
          onPress={() => addTracked('app')}
        >
          Add app
        </Button>

        <Text style={styles.heading}>A website in Firefox</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. youtube.com"
          placeholderTextColor={Colors.text.faint}
          value={site}
          onChangeText={setSite}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        {invalidSite && <Text style={styles.error}>Enter a site like youtube.com</Text>}
        {normalizedSite !== '' && (
          <View style={styles.row}>
            <Text style={styles.note}>Show as</Text>
            <TextInput
              style={[styles.input, styles.label]}
              value={siteName}
              onChangeText={text => {
                setSiteName(text);
                setSiteNameEdited(true);
              }}
              placeholder={getSiteFallbackName(normalizedSite)}
              placeholderTextColor={Colors.text.faint}
            />
          </View>
        )}
        {!siteTracking && (
          <View style={styles.block}>
            <Text style={styles.note}>
              Websites can only be seen in Firefox, and need "Recupero app & website watcher" turned on in
              Accessibility. It reads only the site name in the address bar. If Android says the setting is restricted,
              open Recupero's App info, tap ⋮, then "Allow restricted settings". Other browsers (Chrome etc.) only count
              as app time.
            </Text>
            <Button
              size="sm"
              onPress={() => AppUsage?.openAccessibilitySettings()}
            >
              Open accessibility settings
            </Button>
          </View>
        )}
        <Button
          disabled={!normalizedSite}
          onPress={() => addTracked('site')}
        >
          Add website
        </Button>
      </ScrollView>
      <AppPickerModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={picked => {
          setPickerOpen(false);
          setApp(picked);
        }}
      />
    </FullScreenModal>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  block: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heading: { color: Colors.text.primary, fontSize: 16, fontWeight: '600', marginTop: 8 },
  label: { flex: 1, color: Colors.text.primary, fontSize: 15 },
  placeholder: { color: Colors.text.faint },
  note: { color: Colors.text.muted, fontSize: 12 },
  error: { color: Colors.text.muted, fontSize: 12 },
  input: {
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.text.faint,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
  },
});
