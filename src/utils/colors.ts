export const Colors = {
  transparent: 'trasparent',

  bg: {
    primary: '#121212',
    card: '#1e1e1e',
    input: '#2a2a2a',
    elevated: '#333',
    black: '#000',
    dark: '#111',
    darker: '#191919',
  },

  text: {
    primary: '#fff',
    secondary: '#ccc',
    muted: '#888',
    faint: '#666',
    dim: '#555',
    light: '#aaa',
    lightest: '#D8D8D8',
    white: '#EFEFEF',
  },

  border: {
    default: '#333',
    light: '#555',
    dim: '#444',
    dark: '#4a4a4a',
  },

  cooldown: {
    green: '#4CAF50',
    yellow: '#F9A825',
    red: '#D32F2F',
  },

  status: {
    danger: '#943030',
    dangerLight: '#EF9A9A',
    success: '#2E7D32',
    successLight: '#A5D6A7',
    info: '#3a6ea5',
    error: '#3a1a1a',
  },

  // ── Behavior Types ──
  type: {
    undesirable: '#f87171',
    neutral: '#fbbf24',
    desirable: '#4ade80',
    category: '#f472b6',
  },

  // ── Type Button Backgrounds ──
  typeBtn: {
    undesirable: '#7f1d1d',
    neutral: '#1e3a5f',
    desirable: '#14532d',
    rest: '#2E7D32',
    limit: '#C62828',
  },

  // ── Type Button Text ──
  typeText: {
    undesirable: '#fca5a5',
    desirable: '#86efac',
  },

  // ── Daily Star Rating ──
  star: {
    filled: '#fbbf24',
    empty: '#3a3a3a',
  },
} as const;
