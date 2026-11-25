import type { Config } from 'tailwindcss';
import { brand } from './src/brand';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { ...brand.colors },
      fontFamily: { sans: [...brand.fontFamily] },
      boxShadow: { card: '0 1px 2px rgba(16,24,40,.06), 0 1px 3px rgba(16,24,40,.08)' },
    },
  },
  plugins: [],
} satisfies Config;
