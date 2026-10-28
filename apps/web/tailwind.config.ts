import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#FAFAF8',
        ground: '#ECECE7',
        surface: '#FFFFFF',
        'surface-muted': '#F4F4F1',
        hover: '#F0F0EC',
        line: '#E4E4E0',
        'line-soft': '#EFEFEA',
        'line-input': '#D4D4CF',
        ink: {
          DEFAULT: '#18181B',
          soft: '#3F3F46',
          mute: '#52525B',
          ph: '#A1A1AA',
        },
        'ink-soft': '#3F3F46',
        muted: '#52525B',
        brand: {
          DEFAULT: '#0E7C66',
          ink: '#0B5E4D',
          tint: '#E7F3EF',
          hover: '#0B5E4D',
          mint: '#E7F3EF',
          surface: '#F7F2E9',
        },
        warn: { bg: '#FEF3C7', fg: '#78350F' },
        ok: { bg: '#DCFCE7', fg: '#14532D' },
        info: { bg: '#E0F2FE', fg: '#0C4A6E' },
        danger: { bg: '#FEE2E2', fg: '#7F1D1D' },
        status: {
          ok: '#14532D',
          warn: '#78350F',
          crit: '#7F1D1D',
          danger: '#7F1D1D',
        },
        soft: '#F4F4F1',
        paper: '#FAFAF8',
      },
      fontFamily: {
        sans: ['var(--font-noto-thai)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        display: ['26px', { lineHeight: '1.3', fontWeight: '700' }],
        title: ['22px', { lineHeight: '1.3', fontWeight: '700' }],
        heading: ['16px', { lineHeight: '1.4', fontWeight: '600' }],
        body: ['14px', { lineHeight: '1.5' }],
        caption: ['12px', { lineHeight: '1.4' }],
      },
      borderRadius: {
        control: '10px',
        card: '14px',
        float: '18px',
        hard: '14px',
        sq: '10px',
      },
      boxShadow: {
        float: '0 8px 28px rgba(24,24,27,.08)',
        pop: '0 12px 32px rgba(24,24,27,.14)',
        card: '0 1px 3px rgba(24,24,27,.05)',
      },
      width: {
        sidebar: '232px',
        'sidebar-mini': '72px',
        drawer: '300px',
      },
    },
  },
  plugins: [],
} satisfies Config;
