/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './index.tsx',
    './App.tsx',
    './LanguageContext.tsx',
    './types.ts',
    './constants.ts',
    './translations.ts',
    './components/**/*.{ts,tsx}',
    './pages/**/*.{ts,tsx}',
    './services/**/*.{ts,tsx}',
    './data/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // NdaY' Enterprise Branding Blueprint (v2.0) — core colour system.
        'brand-primary': '#2563EB',
        'brand-secondary': '#1D4ED8',
        'brand-background': '#F8FAFC',
        'brand-surface': '#FFFFFF',
        'brand-raised': '#EFF4FA',
        'brand-text-primary': '#0F172A',
        'brand-text-secondary': '#475569',
        // NdaY' sectoral accent palette.
        'brand-accent': '#EA580C',
        'brand-mint': '#16A34A',
        'brand-coral': '#0F766E',
        // Functional status (kept accessible on light surfaces).
        'status-green': '#16A34A',
        'status-yellow': '#D97706',
        'status-blue': '#2563EB',
        'status-red': '#DC2626',
        'status-gray': '#64748B',
      },
      fontFamily: {
        sans: [
          '"Helvetica Neue"',
          'Helvetica',
          'Arial',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 16px 40px -28px rgba(15, 23, 42, 0.35)',
        glow: '0 0 0 1px rgba(37, 99, 235, 0.18), 0 20px 45px -28px rgba(37, 99, 235, 0.55)',
      },
      animation: {
        'pulse-fast': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
