/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      animation: {
        grid: 'grid 18s linear infinite',
        shimmer: 'shimmer 1.6s linear infinite',
        'fade-up': 'fadeUp 320ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'pulse-soft': 'pulseSoft 2.4s ease-in-out infinite',
        'track-stream': 'trackStream 2s linear infinite',
      },
      keyframes: {
        grid: {
          '0%':   { transform: 'translateY(-50%)' },
          '100%': { transform: 'translateY(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.55' },
        },
        trackStream: {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '0 60px' },
        },
      },
      colors: {
        // TechXpress Railway Palette
        'txp-yellow':      '#f5b800',
        'txp-yellow-ink':  '#8a6700',
        'txp-pink':        '#e8508a',
        'txp-pink-ink':    '#a81f55',
        'txp-book':        '#c8235f',
        'txp-teal':        '#18b3b0',
        'txp-teal-ink':    '#0a6664',
        'txp-violet':      '#8e5bd0',
        'txp-violet-ink':  '#4f2f8a',
        'txp-ink':         '#151320',
        'txp-ink-soft':    '#4a4458',
        'txp-paper':       '#f3e9d2',
        'txp-paper-hi':    '#fffaf0',
        'txp-paper-deep':  '#e6d5b0',
        'txp-kraft':       '#c08f57',
        'txp-red':         '#b8102a',
        'txp-green':       '#0b6e43',

        // Surfaces — deep railway night & station elevation
        'bg-void':         '#0b0a18',
        'bg-surface-1':    '#131126',
        'bg-surface-2':    '#1a1734',
        'bg-surface-3':    '#242146',

        // Borders
        'border-dim':      'rgba(255, 255, 255, 0.08)',
        'border-mid':      'rgba(255, 255, 255, 0.16)',
        'border-active':   '#f5b800',

        // Accents
        'accent-cyan':        '#22d3ee',
        'accent-cyan-soft':   'rgba(34, 211, 238, 0.12)',
        'accent-yellow':      '#f5b800',
        'accent-yellow-soft': 'rgba(245, 184, 0, 0.14)',
        'accent-pink':        '#e8508a',

        // Status — railway signals
        'status-live':     '#10b981',
        'status-warn':     '#f5b800',
        'status-crit':     '#ef4444',
        'status-info':     '#18b3b0',

        // Text scale
        'text-primary':    '#fdfcf9',
        'text-secondary':  '#a8a4b8',
        'text-dim':        '#6f6a88',
        'text-mute':       '#45415c',
      },
      fontFamily: {
        cond:    ['"Barlow Condensed"', 'Arial Narrow', 'sans-serif'],
        deva:    ['"Noto Sans Devanagari"', '"Barlow Condensed"', 'sans-serif'],
        grotesk: ['"Space Grotesk"', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'Fira Code', 'monospace'],
        sans:    ['Inter', 'system-ui', 'sans-serif'],
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      transitionDuration: {
        '160': '160ms',
        '320': '320ms',
      },
      boxShadow: {
        'focus-ring':   '0 0 0 2px rgba(245, 184, 0, 0.55)',
        'hard':         '0 3px 0 #151320',
        'hard-yellow':  '0 3px 0 #f5b800',
        'hard-pink':    '0 3px 0 #c8235f',
        'glow-yellow':  '0 0 24px -4px rgba(245, 184, 0, 0.45)',
        'glow-cyan':    '0 0 24px -4px rgba(34, 211, 238, 0.45)',
        'glow-pink':    '0 0 24px -4px rgba(232, 80, 138, 0.45)',
        'glow-teal':    '0 0 24px -4px rgba(24, 179, 176, 0.45)',
      },
    },
  },
};
