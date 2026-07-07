/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        status: {
          pending: '#F59E0B',
          assigned: '#8B5CF6',
          processing: '#7C3AED',
          completed: '#10B981',
          closed: '#6B7280',
          cancelled: '#EF4444',
        },
        campus: {
          blue: '#1E3A5F',
          gold: '#F59E0B',
        },
        accent: {
          DEFAULT: '#059669',
          light: '#10B981',
        },
        secondary: '#7C3AED',
        surface: {
          DEFAULT: '#FFFFFF',
          hover: '#F8FAFC',
          muted: '#F1F5FD',
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
        'xs': '0 1px 2px rgba(15, 23, 42, 0.04)',
        'sm': '0 2px 8px rgba(37, 99, 235, 0.06)',
        'card': '0 8px 24px rgba(37, 99, 235, 0.08)',
        'card-hover': '0 12px 36px rgba(37, 99, 235, 0.10)',
        'glass': '0 8px 24px rgba(37, 99, 235, 0.08)',
        'glow': '0 0 24px rgba(37, 99, 235, 0.18)',
        'xl': '0 20px 48px rgba(37, 99, 235, 0.12)',
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
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(37, 99, 235, 0.4)' },
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
