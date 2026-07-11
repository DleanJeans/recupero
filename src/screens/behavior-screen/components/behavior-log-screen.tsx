import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BehaviorLogActions } from './behavior-log-actions';
import { BehaviorLogForm } from './behavior-log-form';
import { type BehaviorLogFormProps, useBehaviorLogForm } from './use-behavior-log-form';

export function BehaviorLogScreen(props: BehaviorLogFormProps) {
  const form = useBehaviorLogForm(props);

  return (
    <View style={styles.container}>
      <BehaviorLogForm form={form} />
      <BehaviorLogActions form={form} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
