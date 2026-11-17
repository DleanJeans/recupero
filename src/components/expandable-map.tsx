import React, { useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { Colors } from '../utils/colors';

export interface ExpandableMapState {
  fullScreen: boolean;
  onToggleFullScreen: () => void;
}

interface ExpandableMapProps {
  /** Renders the map; called once for the inline map and once for the full-screen copy. */
  children: (state: ExpandableMapState) => React.ReactNode;
}

/** Shows a map inline, plus the same map (same overlays) in a full-screen modal while expanded. */
export function ExpandableMap({ children }: ExpandableMapProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {children({ fullScreen: false, onToggleFullScreen: () => setOpen(true) })}
      {open && (
        <Modal
          visible
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => setOpen(false)}
        >
          <View style={styles.screen}>{children({ fullScreen: true, onToggleFullScreen: () => setOpen(false) })}</View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg.card },
});
