import { Colors } from './colors';

/** rn-emoji-keyboard colours matching the app. */
export const emojiPickerTheme = {
  backdrop: 'transparent',
  knob: Colors.border.dim,
  container: Colors.bg.card,
  header: Colors.text.primary,
  skinTonesContainer: Colors.bg.input,
  category: {
    icon: Colors.text.muted,
    iconActive: Colors.text.primary,
    container: Colors.bg.input,
    containerActive: Colors.border.dim,
  },
  search: {
    text: Colors.text.primary,
    placeholder: `${Colors.text.faint}88`,
    icon: Colors.text.muted,
    background: Colors.bg.input,
  },
  emoji: {
    selected: Colors.border.default,
  },
};
