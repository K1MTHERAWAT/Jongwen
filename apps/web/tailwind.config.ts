import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0F6E56',
          hover: '#5DCAA5',
          headerFrom: '#2F8F6B',
          headerTo: '#3AAE82',
          mint: '#E1F5EE',
          calRange: '#CFEBDD',
          surface: '#F7F2E9',
        },
        ink: {
          DEFAULT: '#060d26',
          mute: '#475272',
          ph: '#707993',
        },
        line: '#D9DCE6',
        soft: '#EFF0F5',
        paper: '#F7F8F7',
        status: {
          ok: '#95c135',
          warn: '#f8842d',
          crit: '#f21515',
          danger: '#991d1d',
        },
      },
      boxShadow: {
        low: '0 1px 4px rgba(5, 1, 14, 0.07)',
        card: '0 4px 14px rgba(5, 1, 14, 0.09)',
        high: '0 12px 32px rgba(5, 1, 14, 0.18)',
      },
      borderRadius: {
        sq: '8px',
        hard: '16px',
      },
      fontFamily: {
        sans: ['"Noto Sans Thai"', '"Sarabun"', 'Tahoma', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
