/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#F6F7FB',
        ink: {
          DEFAULT: '#0F172A',
          soft: '#334155',
          muted: '#5B6578',
          faint: '#94A3B8',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F1F3F9',
        },
        line: {
          DEFAULT: '#E6E8F0',
          strong: '#D3D8E6',
        },
        primary: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
        },
        warning: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
        },
        danger: {
          50: '#FFF1F2',
          100: '#FFE4E6',
          600: '#E11D48',
          700: '#BE123C',
        },
        success: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          600: '#059669',
          700: '#047857',
        },
        info: {
          50: '#F0F9FF',
          100: '#E0F2FE',
          500: '#0EA5E9',
          600: '#0284C7',
          700: '#0369A1',
        },
      },
      boxShadow: {
        glow: '0 10px 28px -8px rgba(79, 70, 229, 0.55)',
        nav: '0 2px 6px rgba(15, 23, 42, 0.06), 0 16px 36px -10px rgba(15, 23, 42, 0.22)',
        card: '0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px -10px rgba(15, 23, 42, 0.1)',
      },
      keyframes: {
        'sheet-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'backdrop-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'page-in': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'sheet-up': 'sheet-up 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) both',
        'backdrop-in': 'backdrop-in 0.2s ease-out both',
        'fade-in': 'fade-in 0.2s ease-out both',
        'page-in': 'page-in 0.2s ease-out both',
      },
    },
  },
  plugins: [],
};
