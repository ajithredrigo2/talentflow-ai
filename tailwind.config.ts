import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: { 950: '#10091b', 900: '#170d26', 800: '#201432', 700: '#2a1c40', 600: '#392753', 500: '#4e3a6b' },
        brand: { 50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd', 400: '#a78bfa', 500: '#7c3aed', 600: '#6d28d9', 700: '#5b21b6', 800: '#4c1d95', 900: '#3c1878' },
        accent: { 400: '#22d3ee', 500: '#06b6d4', 600: '#0891b2' },
        mint: { 400: '#34d399', 500: '#10b981', 600: '#059669' },
        amberx: { 400: '#fbbf24', 500: '#f59e0b' },
        rose: { 400: '#fb7185', 500: '#f43f5e' },
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Inter', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(26,14,44,0.05), 0 8px 24px -12px rgba(26,14,44,0.20)',
        pop: '0 20px 50px -20px rgba(26,14,44,0.48)',
      },
      keyframes: {
        pulseRing: { '0%': { opacity: '0.9', transform: 'scale(0.9)' }, '70%': { opacity: '0', transform: 'scale(1.6)' }, '100%': { opacity: '0' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        pulseRing: 'pulseRing 1.8s cubic-bezier(0.4,0,0.6,1) infinite',
        slideUp: 'slideUp .35s ease-out both',
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [],
};
export default config;
