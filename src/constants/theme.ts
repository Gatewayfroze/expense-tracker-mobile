export const Colors = {
  light: {
    text: '#0a0a0a',
    textSecondary: '#71717a',
    background: '#ffffff',
    card: '#ffffff',
    muted: '#f4f4f5',
    border: '#e4e4e7',
    primary: '#2563eb',
    primaryText: '#ffffff',
    success: '#16a34a',
    danger: '#dc2626',
    overlay: 'rgba(0,0,0,0.4)',
  },
  dark: {
    text: '#fafafa',
    textSecondary: '#a1a1aa',
    background: '#09090b',
    card: '#18181b',
    muted: '#27272a',
    border: '#3f3f46',
    primary: '#3b82f6',
    primaryText: '#ffffff',
    success: '#22c55e',
    danger: '#ef4444',
    overlay: 'rgba(0,0,0,0.6)',
  },
} as const;

export type Theme = { [K in keyof typeof Colors.light]: string };

// Category dot colours, picked by hashing the category name (same idea as the web app).
const DOT_PALETTE = [
  '#f43f5e',
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#6366f1',
  '#14b8a6',
  '#f97316',
];

export function dotColor(name: string | null | undefined) {
  const key = name ?? '?';
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  return DOT_PALETTE[Math.abs(hash) % DOT_PALETTE.length];
}
