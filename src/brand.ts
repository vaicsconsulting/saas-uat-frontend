/**
 * Brand settings in one place. Colors, font and logos match the VAICS
 * Change Management System (CMS-Frontend src/index.css and src/theme.js).
 * Tailwind reads `colors` from here, and the app reads names and logos from here.
 */
export const brand = {
  company: 'VAICS Consulting',
  product: 'VAICS UAT',
  appName: 'UAT Testing',
  shortName: 'UAT',
  logo: '/vaics-logo-icon.png',
  logoFull: '/vaics-logo-full.png',
  hero: '/heroheader.jpg',
  fontFamily: ['Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
  colors: {
    // Change Management deep blue (#0D47A1, hover #0A3D8A). Kept under the `navy` name so existing classes follow it.
    navy: {
      DEFAULT: '#0D47A1',
      50: '#F2F8FF', // light blue background / zebra rows
      100: '#D6E8FF', // active nav rail
      200: '#B8D0E8', // panel border
      300: '#8FB4E0',
      400: '#4F86CF',
      500: '#1E63C0',
      600: '#1452B0',
      700: '#0D47A1',
      800: '#0A3D8A', // primary hover
      900: '#082F6B',
    },
    deep: '#0D47A1',
    magenta: '#E6007E',
    accent: '#E6007E',
    sky: '#00B6F0',
    'light-blue': '#F2F8FF',
    'rail-active': '#D6E8FF',
    panel: '#B8D0E8',
    ink: '#0F172A',
    muted: '#475569',
    pass: '#1E7B4D',
    fail: '#B42318',
    blocked: '#B54708',
    notrun: '#667085',
    retest: '#6941C6',
  },
} as const;

export type Brand = typeof brand;
