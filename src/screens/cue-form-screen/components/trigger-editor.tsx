import React from 'react';
import type { CueTrigger } from '../../../types/cue';
import { HabitTriggerEditor } from './habit-trigger-editor';
import { LocationTriggerEditor } from './location-trigger-editor';
import { MoodTriggerEditor } from './mood-trigger-editor';
import { TimeTriggerEditor } from './time-trigger-editor';

interface TriggerEditorProps {
  value: CueTrigger;
  onChange: (trigger: CueTrigger) => void;
}

export function TriggerEditor({ value, onChange }: TriggerEditorProps) {
  if (value.type === 'location')
    return (
      <LocationTriggerEditor
        value={value}
        onChange={onChange}
      />
    );
  if (value.type === 'time')
    return (
      <TimeTriggerEditor
        value={value}
        onChange={onChange}
      />
    );
  if (value.type === 'habit')
    return (
      <HabitTriggerEditor
        value={value}
        onChange={onChange}
      />
    );
  return (
    <MoodTriggerEditor
      value={value}
      onChange={onChange}
    />
  );
}
