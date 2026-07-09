/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f5fb',
          100: '#d9e8f5',
          200: '#b4d2ec',
          300: '#7db7df',
          400: '#3A85BF',
          500: '#2473AE',
          600: '#1660AB',
          700: '#124D8C',
          800: '#0F4A85',
          900: '#0C3A6B',
          950: '#082B52',
        },
        status: {
          pending: '#D49B3E',
          assigned: '#7B6FDE',
          processing: '#1660AB',
          completed: '#3E9B6E',
          closed: '#8B8B8B',
          cancelled: '#B03C3C',
        },
        campus: {
          blue: '#1660AB',
          gold: '#D49B3E',
          cream: '#F9F2E0',
        },
        accent: {
          DEFAULT: '#3E9B6E',
          light: '#5BB88C',
        },
        secondary: '#3A85BF',
        surface: {
          DEFAULT: '#FFFDF9',
          hover: '#F9F2E0',
          muted: '#F3ECDA',
        },
      },
      borderRadius: {
        xs: '0.375rem',
        sm: '0.5rem',
        md: '0.75rem',
        lg: '1rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
      },
      boxShadow: {
        'xs': '0 1px 2px rgba(44, 36, 22, 0.04)',
        'sm': '0 2px 8px rgba(22, 96, 171, 0.05)',
        'card': '0 8px 24px rgba(22, 96, 171, 0.07)',
        'card-hover': '0 12px 36px rgba(22, 96, 171, 0.09)',
        'glass': '0 8px 24px rgba(22, 96, 171, 0.07)',
        'glow': '0 0 24px rgba(22, 96, 171, 0.16)',
        'xl': '0 20px 48px rgba(22, 96, 171, 0.11)',
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.6s ease-out forwards',
        'slide-in-right': 'slide-in-right 0.4s ease-out forwards',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'shimmer': 'shimmer 1.5s ease-in-out infinite',
        'gradient': 'gradient-shift 8s ease infinite',
        'breathe': 'breathe 3s ease-in-out infinite',
        'float': 'float 4s ease-in-out infinite',
        'slow-spin': 'slow-spin 60s linear infinite',
        'seawater-flow': 'seawater-flow 28s ease-in-out infinite',
        'status-pulse': 'status-pulse 1.5s ease-in-out infinite',
      },
      keyframes: {
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(20px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(22, 96, 171, 0.4)' },
          '50%': { boxShadow: '0 0 0 12px rgba(37, 99, 235, 0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'gradient-shift': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.05)', opacity: '0.8' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'slow-spin': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        'seawater-flow': {
          '0%, 100%': { backgroundPosition: '0% 0%, 100% 100%, 50% 0%, 0% 50%, 0% 0%' },
          '25%': { backgroundPosition: '15% 10%, 85% 90%, 55% 10%, 10% 55%, 0% 0%' },
          '50%': { backgroundPosition: '30% 5%, 70% 85%, 60% 15%, 20% 45%, 0% 0%' },
          '75%': { backgroundPosition: '15% 15%, 85% 95%, 45% 5%, 5% 50%, 0% 0%' },
        },
        'status-pulse': {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.08)', opacity: '0.85' },
        },
      },
      transitionDuration: {
        '150': '150ms',
        '200': '200ms',
        '300': '300ms',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
