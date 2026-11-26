/**
 * Brand settings in one place so they can be aligned with the hub Portal later.
 * Tailwind reads `colors` from here, and the app reads names and logo from here.
 */
export const brand = {
  company: 'VAICS Consulting',
  product: 'VAICS UAT',
  shortName: 'UAT',
  logo: '/vaics-mark.svg',
  fontFamily: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
  colors: {
    navy: {
      DEFAULT: '#1F3864',
      50: '#EEF2F8',
      100: '#D9E1EF',
      200: '#B3C2DE',
      300: '#8AA1CA',
      400: '#5E7AAE',
      500: '#3D5A8F',
      600: '#2C4878',
      700: '#1F3864',
      800: '#172A4C',
      900: '#101D35',
    },
    pass: '#1E7B4D',
    fail: '#B42318',
    blocked: '#B54708',
    notrun: '#667085',
    retest: '#6941C6',
  },
} as const;

export type Brand = typeof brand;
