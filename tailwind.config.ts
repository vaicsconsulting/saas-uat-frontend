import type { Config } from 'tailwindcss';
import { brand } from './src/brand';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { ...brand.colors },
      fontFamily: { sans: [...brand.fontFamily] },
      boxShadow: { card: '0 1px 2px rgb(0 0 0 / 5%)' },
    },
  },
  plugins: [],
} satisfies Config;
