import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppUsage } from '../../modules/app-usage';
import { formatSiteDebug } from '../utils/app-usage-utils';
import { Colors } from '../utils/colors';
import { Button } from './button';
import { Text } from './text';

/** Shows what the website watcher last read from Firefox's address bar, to find out why a site isn't tracked. */
export function SiteWatcherDebug() {
  const [report, setReport] = useState<string | null>(null);

  if (!AppUsage?.getSiteDebug) return null;

  return (
    <View style={styles.container}>
      <Button
        size="sm"
        onPress={() => setReport(formatSiteDebug(AppUsage?.getSiteDebug?.() ?? ''))}
      >
        What does the watcher see?
      </Button>
      {report != null && <Text style={styles.report}>{report}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  report: {
    color: Colors.text.muted,
    fontSize: 12,
  },
});
