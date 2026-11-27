/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'txp-yellow': 'var(--txp-yellow)',
        'txp-teal': 'var(--txp-teal)',
        'txp-pink': 'var(--txp-pink)',
        'txp-ink': 'var(--txp-ink)',
        'txp-book': 'var(--txp-book)',
        'txp-crimson': 'var(--txp-crimson)',
        'bg-surface-1': 'var(--bg-surface-1)',
        'bg-surface-2': 'var(--bg-surface-2)',
        'bg-surface-3': 'var(--bg-surface-3)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-dim': 'var(--text-dim)',
        'border-dim': 'var(--border-dim)',
        'border-mid': 'var(--border-mid)',
        'border-hi': 'var(--border-hi)',
        'status-live': 'var(--status-live)',
        'status-warn': 'var(--status-warn)',
        'status-crit': 'var(--status-crit)',
      },
      fontFamily: {
        cond: 'var(--font-cond)',
        deva: 'var(--font-deva)',
        sans: 'var(--font-sans)',
        mono: 'var(--font-mono)',
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false,
  },
};
