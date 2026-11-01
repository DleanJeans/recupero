import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppUsage } from '../../../../modules/app-usage';
import { Button } from '../../../components/button';
import { CheckboxRow } from '../../../components/checkbox-row';
import { Text, TextInput } from '../../../components/text';
import { useAppUsagePermission } from '../../../hooks/use-app-usage-permission';
import { normalizeSiteDomain } from '../../../utils/app-usage-utils';
import { Colors } from '../../../utils/colors';

interface AutoTrackSiteFieldProps {
  enabled: boolean;
  domain: string;
  onToggle: () => void;
  onDomainChange: (domain: string) => void;
}

export function AutoTrackSiteField({ enabled, domain, onToggle, onDomainChange }: AutoTrackSiteFieldProps) {
  const { usageAccess, siteTracking } = useAppUsagePermission();

  if (!AppUsage) return null;

  const normalized = normalizeSiteDomain(domain);
  const invalid = domain.trim() !== '' && !normalized;

  return (
    <CheckboxRow
      label="Auto-track website"
      hint="Log time spent on a site in Firefox automatically"
      checked={enabled}
      onToggle={onToggle}
    >
      {enabled && (
        <View style={styles.content}>
          <TextInput
            style={styles.input}
            placeholder="e.g. youtube.com"
            placeholderTextColor={Colors.text.faint}
            value={domain}
            onChangeText={onDomainChange}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          {invalid && <Text style={styles.error}>Enter a site like youtube.com</Text>}
          {normalized !== '' && normalized !== domain.trim() && (
            <Text style={styles.note}>Tracks {normalized} and its subdomains</Text>
          )}
          {!usageAccess && (
            <>
              <Text style={styles.note}>Recupero needs usage access to know when Firefox is open.</Text>
              <Button
                size="sm"
                onPress={() => AppUsage?.openPermissionSettings()}
              >
                Grant usage access
              </Button>
            </>
          )}
          {!siteTracking && (
            <>
              <Text style={styles.note}>
                Turn on "Recupero website tracking" in Accessibility. It reads only the site name in Firefox's address
                bar. If Android says the setting is restricted, open Recupero's App info, tap ⋮, then "Allow restricted
                settings".
              </Text>
              <Button
                size="sm"
                onPress={() => AppUsage?.openAccessibilitySettings()}
              >
                Open accessibility settings
              </Button>
            </>
          )}
          <Text style={styles.note}>Visits of a minute or more are logged when you open Recupero.</Text>
        </View>
      )}
    </CheckboxRow>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 10,
  },
  input: {
    backgroundColor: Colors.bg.elevated,
    color: Colors.text.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  error: {
    color: Colors.type.undesirable,
    fontSize: 12,
  },
  note: {
    color: Colors.text.muted,
    fontSize: 12,
  },
});
