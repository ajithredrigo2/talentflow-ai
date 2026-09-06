import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: { 950: '#0a0e1a', 900: '#0f1524', 800: '#161d30', 700: '#1e273e', 600: '#2a3550', 500: '#3d4a68' },
        brand: { 50: '#eef4ff', 100: '#dbe6ff', 200: '#bed0ff', 300: '#91b0ff', 400: '#5d85fc', 500: '#375ef6', 600: '#213deb', 700: '#1a2fd7', 800: '#1c29ae', 900: '#1c2989' },
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
        card: '0 1px 2px rgba(10,14,26,0.04), 0 8px 24px -12px rgba(10,14,26,0.18)',
        pop: '0 20px 50px -20px rgba(10,14,26,0.45)',
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
